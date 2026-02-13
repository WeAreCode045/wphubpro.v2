#!/usr/bin/env node
/*
  One-time migration script to convert legacy `credentials` (array) into
  top-level `username` and encrypted `password` fields for the `sites`
  collection.

  Usage:
    DRY RUN (default): node scripts/migrate-encrypt-credentials.cjs
    APPLY CHANGES:     node scripts/migrate-encrypt-credentials.cjs --apply

  Required environment variables:
    APPWRITE_ENDPOINT (or APPWRITE_FUNCTION_ENDPOINT)
    APPWRITE_PROJECT  (or APPWRITE_FUNCTION_PROJECT_ID)
    APPWRITE_KEY      (or APPWRITE_FUNCTION_API_KEY)
    ENCRYPTION_KEY    (secret used to derive AES-256-GCM key)

  The script will:
  - list documents in `platform_db`.`sites`
  - detect legacy credentials arrays and plaintext passwords
  - encrypt the password using AES-256-GCM, set `username` and `password` fields,
    and clear the legacy `credentials` property on the document.

  Always run as a dry-run first to confirm.
*/

const sdk = require('node-appwrite');
const crypto = require('crypto');

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID;
const APPWRITE_KEY = process.env.APPWRITE_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_KEY) {
  console.error('Missing Appwrite configuration. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT and APPWRITE_KEY.');
  process.exit(1);
}

if (!ENCRYPTION_KEY_RAW) {
  console.error('Missing ENCRYPTION_KEY. Set ENCRYPTION_KEY in environment.');
  process.exit(1);
}

// Derive a 32-byte key from the provided secret (allows variable-length input)
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(ENCRYPTION_KEY_RAW), 'utf8').digest();

const client = new sdk.Client();
client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT).setKey(APPWRITE_KEY);
const databases = new sdk.Databases(client);

const DATABASE_ID = 'platform_db';
const COLLECTION_ID = 'sites';

async function listAllDocs() {
  // Simple fetch - for modest collections this should be fine. If you have many docs, we can add pagination.
  const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
  return res.documents || [];
}

function isLikelyEncrypted(pwd) {
  if (typeof pwd !== 'string') return false;
  const parts = pwd.split(':');
  if (parts.length !== 3) return false;
  const joined = parts.join('');
  return /^[0-9a-fA-F]+$/.test(joined);
}

function encryptPassword(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

async function run() {
  const apply = process.argv.includes('--apply');
  console.log(`Starting migration (apply=${apply})`);

  const docs = await listAllDocs();
  console.log(`Found ${docs.length} site documents.`);

  let changed = 0;

  for (const doc of docs) {
    try {
      let creds = doc.credentials;
      if (!creds) continue;
      if (typeof creds === 'string') {
        try { creds = JSON.parse(creds); } catch { console.warn(`Skipping ${doc.$id}: malformed credentials JSON`); continue; }
      }

      if (!Array.isArray(creds) || !creds[0] || typeof creds[0].password === 'undefined') {
        console.warn(`Skipping ${doc.$id}: credentials not in expected array form`);
        continue;
      }

      const currentPassword = creds[0].password;
      if (isLikelyEncrypted(currentPassword)) {
        console.log(`Skipping ${doc.$id}: already encrypted`);
        continue;
      }

      const encrypted = encryptPassword(currentPassword);

      if (apply) {
        // Migrate to top-level username/password and clear legacy credentials
        const payload = { username: creds[0].username || null, password: encrypted, credentials: null };
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, payload);
        console.log(`Migrated ${doc.$id}`);
      } else {
        console.log(`[DRY] Would migrate credentials for ${doc.$id} -> username + encrypted password`);
      }

      changed++;
    } catch (err) {
      console.error(`Error processing ${doc.$id}:`, err && err.message ? err.message : err);
    }
  }

  console.log(`Migration complete. Documents changed: ${changed}`);
}

run().catch((err) => { console.error('Migration failed:', err); process.exit(1); });

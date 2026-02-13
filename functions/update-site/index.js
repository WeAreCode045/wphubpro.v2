/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const crypto = require('crypto');
const fetch = require('node-fetch');

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  // Derive 32-byte key for AES-256 from provided secret
  const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;
  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;
  const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY || !ENCRYPTION_KEY) {
    const available = Object.keys(env || {});
    error('Function environment is not configured');
    return res.json({ success: false, message: 'Function environment is not configured.', availableEnvKeys: available }, 500);
  }

  client.setEndpoint(APPWRITE_FUNCTION_ENDPOINT).setProject(APPWRITE_FUNCTION_PROJECT_ID).setKey(APPWRITE_FUNCTION_API_KEY);

  // Normalize payload: Appwrite may provide `req.payload` as a parsed object or as a raw JSON string.
  let payloadObj = null;
  if (req) payloadObj = req.payload || req.body || null;
  if (typeof payloadObj === 'string') {
    try { payloadObj = JSON.parse(payloadObj); } catch (e) { /* leave as string */ }
  }

  const siteId = (req.query && (req.query.siteId || req.query.site_id)) || (payloadObj && (payloadObj.siteId || payloadObj.site_id));
  let updates = (req.query && req.query.updates) || (payloadObj && payloadObj.updates) || (payloadObj && payloadObj.updates);

  if (!siteId || !updates) {
    return res.json({ success: false, message: 'Missing siteId or updates' }, 400);
  }

  // `updates` may be a JSON-encoded string when passed via query
  if (typeof updates === 'string') {
    try { updates = JSON.parse(decodeURIComponent(updates)); } catch (e) { /* leave as-is */ }
  }

  const finalUpdates = { ...updates };
  // New schema: only support top-level `username` and `password` updates.
  if (typeof updates.password !== 'undefined' && updates.password) {
    const encrypted = encrypt(updates.password, ENCRYPTION_KEY);
    finalUpdates.password = encrypted; // store encrypted password
    if (typeof updates.username !== 'undefined') finalUpdates.username = updates.username;
  } else if (typeof updates.username !== 'undefined') {
    finalUpdates.username = updates.username;
    // do not touch password when username-only update
  }

  try {
    const DATABASE_ID = 'platform_db';
    const SITES_COLLECTION_ID = 'sites';
    const updated = await databases.updateDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId, finalUpdates);
    return res.json({ success: true, document: updated });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};

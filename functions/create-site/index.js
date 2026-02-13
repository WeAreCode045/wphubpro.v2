/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

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

  // Accept fields from either parsed payload or query parameters (some runtimes drop req.payload)
  const site_url = (req.query && (req.query.site_url || req.query.siteUrl)) || (payloadObj && (payloadObj.site_url || payloadObj.siteUrl));
  const site_name = (req.query && (req.query.site_name || req.query.siteName)) || (payloadObj && (payloadObj.site_name || payloadObj.siteName));
  const user_id = (req.query && (req.query.userId || req.query.user_id)) || (payloadObj && (payloadObj.userId || payloadObj.user_id));

  if (!site_url || !site_name || !user_id) {
    error('Missing required fields for create-site');
    return res.json({ success: false, message: 'Missing required fields: site_url, site_name, userId' }, 400);
  }

  let username = null;
  let password = null;
  try {
    // prefer explicit username/password fields from normalized payload
    username = (payloadObj && (payloadObj.username || payloadObj.user)) || (req.query && (req.query.username || req.query.user)) || null;
    password = (payloadObj && payloadObj.password) || (req.query && req.query.password) || null;
  } catch (e) {
    return res.json({ success: false, message: 'Invalid request payload' }, 400);
  }

  if (!username || !password) {
    return res.json({ success: false, message: 'username and password are required' }, 400);
  }

  try {
    // Optional quick validation against WP REST API
    const url = `${site_url.replace(/\/$/, '')}/wp-json/wp/v2/plugins`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const resp = await fetch(url, { method: 'GET', headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }, timeout: 10000 });
    if (!resp.ok) {
      const text = await resp.text();
      return res.json({ success: false, message: `WP validation failed: ${text || resp.status}` }, resp.status);
    }

    const encrypted = encrypt(password, ENCRYPTION_KEY);

    // Only include attributes that exist in the collection schema.
    const document = {
      user_id: user_id,
      site_url: site_url,
      site_name: site_name,
      // new top-level fields for simplified access
      username: username,
      password: encrypted
    };

    const DATABASE_ID = 'platform_db';
    const SITES_COLLECTION_ID = 'sites';

    const created = await databases.createDocument(DATABASE_ID, SITES_COLLECTION_ID, sdk.ID.unique(), document);
    return res.json({ success: true, document: created });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};

const sdk = require('node-appwrite');
const crypto = require('crypto');
const fetch = require('node-fetch');

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), iv);
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

  // If updates is accidentally passed as an array (e.g., credentials array),
  // converting it directly into an object with spread will produce numeric
  // attribute keys like "0" which Appwrite rejects. Normalize here so that
  // an array becomes `{ credentials: <array> }`.
  if (Array.isArray(updates)) {
    updates = { credentials: updates };
  }

  // If updates include credentials (JSON string or array), extract username/password and encrypt password
  const finalUpdates = { ...updates };
  if (updates.credentials) {
    let creds = updates.credentials;
    try {
      creds = typeof creds === 'string' ? JSON.parse(decodeURIComponent(creds)) : creds;
    } catch (e) { creds = null; }
    if (Array.isArray(creds) && creds[0]) {
      const username = creds[0].username || creds[0].user || '';
      const pwd = creds[0].password || creds[0].pass || '';
      if (pwd) {
        const encrypted = encrypt(pwd, ENCRYPTION_KEY);
        finalUpdates.credentials = JSON.stringify([{ username, password: encrypted }]);
      } else if (username) {
        // Username change without password: reuse existing encrypted password from document
        try {
          const DATABASE_ID = 'platform_db';
          const SITES_COLLECTION_ID = 'sites';
          const existing = await databases.getDocument(DATABASE_ID, SITES_COLLECTION_ID, siteId);
          if (existing && existing.credentials) {
            // parse existing credentials (expected JSON string)
            let existingCreds = existing.credentials;
            try { existingCreds = typeof existingCreds === 'string' ? JSON.parse(existingCreds) : existingCreds; } catch (e) { existingCreds = null; }
            if (Array.isArray(existingCreds) && existingCreds[0] && existingCreds[0].password) {
              finalUpdates.credentials = JSON.stringify([{ username, password: existingCreds[0].password }]);
            }
          }
        } catch (ex) {
          // if unable to fetch existing, skip updating credentials
        }
      }
    }
    // no legacy cleanup required in development mode
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

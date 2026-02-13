/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const crypto = require('crypto');

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
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
  const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

  client
    .setEndpoint(env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY);

  let payloadObj = null;
  if (req) payloadObj = req.payload || req.body || null;
  if (typeof payloadObj === 'string') {
    try { payloadObj = JSON.parse(payloadObj); } catch (e) { /* skip */ }
  }

  const siteId = (req.query && (req.query.siteId || req.query.site_id)) || (payloadObj && (payloadObj.siteId || payloadObj.site_id));
  const updates = (req.query && req.query.updates) || (payloadObj && payloadObj.updates) || payloadObj;

  if (!siteId || !updates) {
    return res.json({ success: false, message: 'Missing siteId or updates' }, 400);
  }

  const finalUpdates = {};
  
  // Als er een password wordt meegeleverd (zoals bij de Connect Flow), versleutelen we deze
  if (updates.password) {
    finalUpdates.password = encrypt(updates.password, ENCRYPTION_KEY);
  }
  
  if (updates.username) finalUpdates.username = updates.username;
  if (updates.siteName || updates.site_name) finalUpdates.site_name = updates.siteName || updates.site_name;
  if (updates.siteUrl || updates.site_url) finalUpdates.site_url = updates.siteUrl || updates.site_url;

  try {
    const updated = await databases.updateDocument('platform_db', 'sites', siteId, finalUpdates);
    return res.json({ success: true, document: updated });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
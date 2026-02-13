/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
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
  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;
  const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY || !ENCRYPTION_KEY) {
    error('Function environment is not configured');
    return res.json({ success: false, message: 'Function environment is not configured.' }, 500);
  }

  client.setEndpoint(APPWRITE_FUNCTION_ENDPOINT).setProject(APPWRITE_FUNCTION_PROJECT_ID).setKey(APPWRITE_FUNCTION_API_KEY);

  let payloadObj = null;
  if (req) payloadObj = req.payload || req.body || null;
  if (typeof payloadObj === 'string') {
    try { payloadObj = JSON.parse(payloadObj); } catch (e) { /* leave as string */ }
  }

  const site_url = (req.query && (req.query.site_url || req.query.siteUrl)) || (payloadObj && (payloadObj.site_url || payloadObj.siteUrl));
  const site_name = (req.query && (req.query.site_name || req.query.siteName)) || (payloadObj && (payloadObj.site_name || payloadObj.siteName));
  const user_id = (req.query && (req.query.userId || req.query.user_id)) || (payloadObj && (payloadObj.userId || payloadObj.user_id));

  if (!site_url || !site_name || !user_id) {
    return res.json({ success: false, message: 'Missing required fields: site_url, site_name, userId' }, 400);
  }

  // Username en Password zijn nu OPTIONEEL bij creatie
  let username = (payloadObj && (payloadObj.username || payloadObj.user)) || (req.query && (req.query.username || req.query.user)) || null;
  let password = (payloadObj && payloadObj.password) || (req.query && req.query.password) || null;

  try {
    let encryptedPassword = "";

    // Alleen valideren en versleutelen als er gegevens zijn meegeleverd
    if (username && password) {
      const url = `${site_url.replace(/\/$/, '')}/wp-json/wp/v2/plugins`;
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const resp = await fetch(url, { method: 'GET', headers: { 'Authorization': `Basic ${auth}` }, timeout: 10000 });
      
      if (!resp.ok) {
        return res.json({ success: false, message: 'WP validation failed' }, resp.status);
      }
      encryptedPassword = encrypt(password, ENCRYPTION_KEY);
    }

    const document = {
      user_id: user_id,
      site_url: site_url,
      site_name: site_name,
      username: username || "",
      password: encryptedPassword
    };

    const created = await databases.createDocument('platform_db', 'sites', sdk.ID.unique(), document);
    return res.json({ success: true, document: created });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
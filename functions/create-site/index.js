const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

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

  // Read from payload. Require `credentials` JSON param which contains [{username,password}]
  const site_url = (req.payload && req.payload.site_url) || (req.payload && req.payload.siteUrl);
  const site_name = (req.payload && req.payload.site_name) || (req.payload && req.payload.siteName);
  const user_id = (req.payload && (req.payload.userId || req.payload.user_id));

  const credsRaw = (req.payload && req.payload.credentials);
  if (!site_url || !site_name || !credsRaw || !user_id) {
    error('Missing required fields for create-site');
    return res.json({ success: false, message: 'Missing required fields: site_url, site_name, credentials (username/password), userId' }, 400);
  }

  let username = null;
  let password = null;
  try {
    const parsed = typeof credsRaw === 'string' ? JSON.parse(decodeURIComponent(credsRaw)) : credsRaw;
    if (Array.isArray(parsed) && parsed[0]) {
      username = parsed[0].username || parsed[0].user || null;
      password = parsed[0].password || parsed[0].pass || null;
    }
  } catch (e) {
    return res.json({ success: false, message: 'Invalid credentials payload' }, 400);
  }

  if (!username || !password) {
    return res.json({ success: false, message: 'Credentials must include username and password' }, 400);
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

    const document = {
      user_id: user_id,
      site_url: site_url,
      site_name: site_name,
      // credentials stored as JSON string of an array of credential objects; password stored encrypted
      credentials: JSON.stringify([{ username: username, password: encrypted }]),
      healthStatus: 'warning',
      lastChecked: new Date().toISOString(),
      wpVersion: '',
      phpVersion: ''
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

const sdk = require('node-appwrite');
const fetch = require('node-fetch');

module.exports = async ({ req, res, log, error }) => {
  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    const available = Object.keys(env || {});
    error('Function environment is not configured');
    return res.json({ success: false, message: 'Function environment is not configured.', availableEnvKeys: available }, 500);
  }

  const site_url = (req.query && (req.query.site_url || req.query.siteUrl)) || (req.payload && req.payload.site_url) || (req.payload && req.payload.siteUrl);

  // Require `credentials` JSON param in payload
  const credsRaw = (req.payload && req.payload.credentials);
  if (!site_url || !credsRaw) {
    error(`Missing credentials to validate. site_url=${site_url}`);
    return res.json({ success: false, message: 'Missing site_url or credentials payload' }, 400);
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
    const url = `${site_url.replace(/\/$/, '')}/wp-json/wp/v2/plugins`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
    });

    const text = await resp.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }

    if (!resp.ok) {
      const msg = (json && typeof json === 'object' && json.message) ? json.message : (typeof json === 'string' ? json : `WP responded ${resp.status}`);
      return res.json({ success: false, message: msg }, resp.status);
    }

    return res.json({ success: true, message: 'Credentials valid' });
  } catch (e) {
    error(e.message || e.toString());
    return res.json({ success: false, message: e.message || 'Failed to validate credentials' }, 500);
  }
};

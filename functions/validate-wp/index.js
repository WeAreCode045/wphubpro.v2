/* eslint-disable no-unused-vars */
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

  // Require top-level `username` and `password` fields in payload
  const username = (req.payload && (req.payload.username || req.payload.user)) || (req.query && req.query.username) || null;
  const password = (req.payload && req.payload.password) || (req.query && req.query.password) || null;

  if (!site_url || !username || !password) {
    error(`Missing required fields to validate. site_url=${site_url}, username=${username}`);
    return res.json({ success: false, message: 'Missing site_url, username or password' }, 400);
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

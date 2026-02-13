const sdk = require('node-appwrite');
const fetch = require('node-fetch');

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;
  // The runtime may set the calling user id in env, otherwise require client-provided userId in payload.
  const APPWRITE_FUNCTION_USER_ID = env.APPWRITE_FUNCTION_USER_ID || env.APPWRITE_USER_ID || null;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    error("Environment variables are not set.");
    const available = Object.keys(env || {});
    return res.json({ success: false, message: 'Function environment is not configured.', availableEnvKeys: available }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY);

  // Parse payload defensively — some runtimes drop `req.payload` so fall back to query params.
  let payload = {};
  try {
    if (req && typeof req.payload === 'string' && req.payload.length) {
      payload = JSON.parse(req.payload);
    } else if (req && typeof req.payload === 'object' && req.payload) {
      payload = req.payload;
    }
  } catch (e) {
    error('Failed to parse payload.');
    return res.json({ success: false, message: 'Invalid request body. JSON expected.' }, 400);
  }

  // Fallback to query parameters (some createExecution calls ended up encoding data as query params)
  const siteId = payload.siteId || (req && req.query && (req.query.siteId || req.query.site_id));
  const endpoint = payload.endpoint || (req && req.query && req.query.endpoint);
  const method = payload.method || (req && req.query && req.query.method) || 'GET';
  const body = payload.body || (req && req.query && req.query.body && (() => {
    try { return JSON.parse(decodeURIComponent(req.query.body)); } catch { return undefined; }
  })());

  if (!siteId || !endpoint) {
    error(`Missing required fields. siteId=${siteId}, endpoint=${endpoint}, payloadKeys=${Object.keys(payload)}, queryKeys=${req && req.query ? Object.keys(req.query) : []}`);
    return res.json({ success: false, message: 'Missing required fields: siteId and endpoint.' }, 400);
  }

  // Allow caller identity to come from the runtime (`APPWRITE_FUNCTION_USER_ID`) or
  // fall back to a client-provided `userId` in payload/query (workaround for runtimes).
  const callerUserId = APPWRITE_FUNCTION_USER_ID || payload.userId || (req && req.query && (req.query.userId || req.query.user_id));

  if (!callerUserId) {
    return res.json({ success: false, message: 'Unauthorized. Only authenticated users can perform this action.' }, 401);
  }

  try {
    const siteDocument = await databases.getDocument('platform_db', 'sites', siteId);
    
    // --- SECURITY CHECK ---
    // Verify that the caller (runtime or client-provided) owns the site document.
    if (siteDocument.user_id !== callerUserId) {
      return res.json({ success: false, message: 'Forbidden. You do not have permission to access this site.' }, 403);
    }
    
    // Use `credentials` field exclusively (development mode: no legacy fallbacks)
    const site_url = siteDocument.site_url;
    if (!siteDocument.credentials) {
      return res.json({ success: false, message: 'Site has no credentials configured' }, 400);
    }

    let creds = siteDocument.credentials;
    try { creds = typeof creds === 'string' ? JSON.parse(creds) : creds; } catch (e) { return res.json({ success: false, message: 'Malformed credentials' }, 500); }
    if (!Array.isArray(creds) || !creds[0] || !creds[0].username || !creds[0].password) {
      return res.json({ success: false, message: 'Credentials must be an array with username and password' }, 400);
    }

    const username = creds[0].username;
    let password = creds[0].password;

    // Decrypt password if in encrypted format
    try {
      const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;
      const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
      if (ENCRYPTION_KEY && typeof password === 'string' && password.split(':').length === 3) {
        const [ivHex, encHex, tagHex] = password.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = require('crypto').createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        password = decrypted.toString('utf8');
      }
    } catch (e) {
      error('Failed to decrypt credentials: ' + e.message);
      return res.json({ success: false, message: 'Failed to decrypt credentials' }, 500);
    }

    const decryptedPassword = password;
    const proxyUrl = `${site_url.replace(/\/$/, '')}/wp-json/${endpoint.replace(/^\//, '')}`;

    const authString = Buffer.from(`${username}:${decryptedPassword}`).toString('base64');

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    log(`Proxying request: ${method} ${proxyUrl}`);
    
    const proxyResponse = await fetch(proxyUrl, fetchOptions);

    // Safely read response as text first to avoid 'Unexpected end of JSON input'
    const proxyResponseText = await proxyResponse.text();
    let responseData;
    try {
      responseData = proxyResponseText ? JSON.parse(proxyResponseText) : null;
    } catch (e) {
      // Not JSON — keep raw text
      responseData = proxyResponseText;
    }

    if (!proxyResponse.ok) {
        const msg = (responseData && typeof responseData === 'object' && responseData.message)
          ? responseData.message
          : (proxyResponseText || `Request failed with status ${proxyResponse.status}`);
        throw new Error(msg);
    }

    // If the proxied response was non-JSON, return it as text under `text` key to keep JSON response contract.
    if (typeof responseData === 'string' || responseData === null) {
      return res.json({ text: responseData });
    }

    return res.json(responseData);

  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
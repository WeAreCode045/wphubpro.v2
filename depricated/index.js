/* eslint-disable no-unused-vars */
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
  let endpoint = payload.endpoint || (req && req.query && req.query.endpoint);
  // If endpoint came via query params it may be percent-encoded (e.g. %2Fwp%2Fv2%2Fplugins)
  if (req && req.query && req.query.endpoint && typeof endpoint === 'string') {
    try { endpoint = decodeURIComponent(endpoint); } catch (e) { /* leave as-is */ }
  }
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
    
    const site_url = siteDocument.site_url;

    // Require top-level `username` and `password` fields (new schema only).
    const username = siteDocument.username;
    let password = siteDocument.password; // expected to be encrypted string (iv:enc:tag) when present

    if (!username || !password) {
      return res.json({ success: false, message: 'Site is missing username or password fields' }, 400);
    }

    // Decrypt password if in encrypted format. If decryption fails, log and fall back to the stored value
    let decryptionAttempted = false;
    let decryptionSucceeded = false;
    try {
      const envLocal = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;
      const ENCRYPTION_KEY = envLocal.ENCRYPTION_KEY;
      // Log presence (do NOT log the key itself)
      try { log && log(`DEBUG_ENCRYPTION_KEY_PRESENT ${!!ENCRYPTION_KEY}`); } catch (_) { void 0; }

      // If the stored password looks encrypted but no ENCRYPTION_KEY is available, fail early with a clear message
      if (!ENCRYPTION_KEY && typeof password === 'string' && password.split(':').length === 3) {
        return res.json({ success: false, message: 'Function runtime missing ENCRYPTION_KEY to decrypt stored site credentials.' }, 500);
      }

      if (ENCRYPTION_KEY && typeof password === 'string' && password.split(':').length === 3) {
        decryptionAttempted = true;
        const [ivHex, encHex, tagHex] = password.split(':');
        // Basic validation of hex parts to avoid immediate Buffer errors
        const isHex = (s) => typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0;
        if (!isHex(ivHex) || !isHex(encHex) || !isHex(tagHex)) {
          throw new Error('Encrypted credential parts are not valid hex');
        }
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        // Derive 32-byte key for AES-256 from provided secret
        const derivedKey = require('crypto').createHash('sha256').update(String(ENCRYPTION_KEY), 'utf8').digest();
        const decipher = require('crypto').createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted),decipher.final()]);
        password = decrypted.toString('utf8');
        decryptionSucceeded = true;
      }
    } catch (e) {
      // Log detailed error for debugging, but do not fail the request — fall back to stored password (assume plaintext)
      try { error && error('Credential decryption failed, falling back to stored password. Decryption error: ' + (e && e.message ? e.message : String(e))); } catch (_) { void 0; }
      // proceed using original `password` value (may be plaintext)
    }

    // Emit result of decryption attempt
    try { log && log(`DEBUG_DECRYPTION_RESULT siteId=${siteId} attempted=${decryptionAttempted} success=${decryptionSucceeded}`); } catch (_) { void 0; }

    const decryptedPassword = password;
    // DEBUG: log the credentials used for the proxied request (temporary, remove after debugging)
    try {
      log && log(`DEBUG_CREDENTIALS username=${username} password=${decryptedPassword}`);
    } catch (e) {
      void 0;
    }
    const proxyUrl = `${site_url.replace(/\/$/, '')}/wp-json/${endpoint.replace(/^\//, '')}`;

    // Detailed debug logging to verify the exact API URL and context used for the proxied request
    try { log && log(`WP_PROXY_DEBUG siteId=${siteId} callerUserId=${callerUserId} endpointParam=${endpoint} computedProxyUrl=${proxyUrl}`); } catch (_) { void 0; }

    const authString = Buffer.from(`${username}:${decryptedPassword}`).toString('base64');

    const headers = {
      'Authorization': `Basic ${authString}`,
      'Accept': 'application/json',
      'User-Agent': 'WPHubPro/1.0',
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = { method, headers };

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
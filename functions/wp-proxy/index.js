/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

/**
 * Decrypts an encrypted string (iv:encrypted:tag) using the provided key.
 */
function decrypt(encryptedText, key) {
  try {
    const [ivHex, encryptedHex, tagHex] = encryptedText.split(':');
    if (!ivHex || !encryptedHex || !tagHex) return encryptedText;

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    
    decipher.setAuthTag(tag);
    
    let decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return encryptedText;
  }
}

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;
  const APPWRITE_FUNCTION_USER_ID = env.APPWRITE_FUNCTION_USER_ID || env.APPWRITE_USER_ID || null;
  const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    error("Environment variables are not set.");
    return res.json({ success: false, message: 'Function environment is not configured.' }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY);

  let payload = {};
  try {
    if (req && typeof req.payload === 'string' && req.payload.length) {
      payload = JSON.parse(req.payload);
    } else if (req && typeof req.payload === 'object' && req.payload) {
      payload = req.payload;
    }
  } catch (e) {
    error('Failed to parse payload.');
    return res.json({ success: false, message: 'Invalid request body.' }, 400);
  }

  const siteId = payload.siteId || (req && req.query && (req.query.siteId || req.query.site_id));
  const endpoint = payload.endpoint || (req && req.query && req.query.endpoint);
  const method = payload.method || (req && req.query && req.query.method) || 'GET';
  const body = payload.body || (req && req.query && req.query.body);

  if (!siteId || !endpoint) {
    return res.json({ success: false, message: 'Missing siteId or endpoint.' }, 400);
  }

  const callerUserId = APPWRITE_FUNCTION_USER_ID || payload.userId || (req && req.query && (req.query.userId || req.query.user_id));

  if (!callerUserId) {
    return res.json({ success: false, message: 'Unauthorized.' }, 401);
  }

  try {
    const siteDocument = await databases.getDocument('platform_db', 'sites', siteId);
    
    if (siteDocument.user_id !== callerUserId) {
      return res.json({ success: false, message: 'Forbidden.' }, 403);
    }
    
    const site_url = siteDocument.site_url;
    const username = siteDocument.username;
    let storedCredential = siteDocument.password;

    // Decrypt de opgeslagen credential (dit is nu de API Key van de Bridge plugin)
    const decryptedKey = decrypt(storedCredential, ENCRYPTION_KEY);

    const proxyUrl = `${site_url.replace(/\/$/, '')}/wp-json/${endpoint.replace(/^\//, '')}`;

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Gebruik de custom header om Nginx Authorization-stripping te omzeilen
        'X-WPHub-Key': decryptedKey,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    log(`Proxying request via Bridge: ${method} ${proxyUrl}`);
    
    const proxyResponse = await fetch(proxyUrl, fetchOptions);
    const proxyResponseText = await proxyResponse.text();
    
    let responseData;
    try {
      responseData = proxyResponseText ? JSON.parse(proxyResponseText) : null;
    } catch (e) {
      responseData = proxyResponseText;
    }

    if (!proxyResponse.ok) {
        const msg = (responseData && typeof responseData === 'object' && responseData.message)
          ? responseData.message
          : (proxyResponseText || `WP responded with status ${proxyResponse.status}`);
        throw new Error(msg);
    }

    if (typeof responseData === 'string' || responseData === null) {
      return res.json({ text: responseData });
    }

    return res.json(responseData);

  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
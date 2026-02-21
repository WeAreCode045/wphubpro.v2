/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
function safeCompare(a, b) {
  return String(a || '') === String(b || '');
}

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;
  const APPWRITE_FUNCTION_USER_ID = env.APPWRITE_FUNCTION_USER_ID || env.APPWRITE_USER_ID || null;

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

  try {
    const siteDocument = await databases.getDocument('platform_db', 'sites', siteId);

    const site_url = siteDocument.site_url;
    const username = siteDocument.username;
    
    // Gebruik de API Key direct als platte tekst uit de database (geen encryptie)
    let apiKey = siteDocument.api_key || siteDocument.apiKey || siteDocument.password;

    // Authenticatiecontrole: matches de beller met de eigenaar, of wordt de juiste X-WPHub-Key meegegeven?
    const incomingKey = (req && req.headers && (req.headers['x-wphub-key'] || req.headers['X-WPHub-Key'])) || payload.api_key || payload.apiKey;

    const ownerMatch = callerUserId && siteDocument.user_id && (siteDocument.user_id === callerUserId);
    const keyMatch = incomingKey && apiKey && safeCompare(incomingKey, apiKey);

    if (!ownerMatch && !keyMatch) {
      return res.json({ success: false, message: 'Forbidden. Geen toegang tot deze site.' }, 403);
    }

    // Endpoint opschonen en URL opbouwen
    let decodedEndpoint = endpoint;
    try {
      decodedEndpoint = decodeURIComponent(String(endpoint));
    } catch (e) { /* fallback */ }

    const cleanedEndpoint = String(decodedEndpoint).replace(/^\/+/, '');
    const proxyUrl = `${site_url.replace(/\/$/, '')}/wp-json/${cleanedEndpoint}`;

    // Headers voorbereiden voor WordPress
    const incomingHeaders = (req && req.headers) ? req.headers : {};
    const headers = {
      'Accept': incomingHeaders['accept'] || 'application/json',
      'User-Agent': incomingHeaders['user-agent'] || 'WPHub-Proxy/1.0',
      'X-WPHub-Key': apiKey, // De Bridge-plugin gebruikt deze header voor validatie
      ...(incomingHeaders['content-type'] ? { 'Content-Type': incomingHeaders['content-type'] } : {}),
      ...(incomingHeaders['x-wp-nonce'] ? { 'X-WP-Nonce': incomingHeaders['x-wp-nonce'] } : {}),
    };


    const fetchOptions = { method, headers };

    // Body afhandeling
    if (req && req.rawBody && req.rawBody.length) {
      fetchOptions.body = req.rawBody;
    } else if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    log(`Proxying request: ${method} ${proxyUrl}`);
    
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
          : (proxyResponseText || `WordPress API fout: ${proxyResponse.status}`);
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
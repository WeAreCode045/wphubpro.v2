
const sdk = require('node-appwrite');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const {
    APPWRITE_FUNCTION_ENDPOINT,
    APPWRITE_FUNCTION_PROJECT_ID,
    APPWRITE_FUNCTION_API_KEY,
  } = req.variables;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    console.warn("Environment variables are not set.");
    return res.json({ success: false, message: 'Function environment is not configured.' }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY);

  let payload;
  try {
    payload = JSON.parse(req.payload);
  } catch (e) {
    return res.json({ success: false, message: 'Invalid request body. JSON expected.' }, 400);
  }

  const { siteId, method = 'GET', endpoint, body } = payload;

  if (!siteId || !endpoint) {
    return res.json({ success: false, message: 'Missing required fields: siteId and endpoint.' }, 400);
  }

  try {
    const siteDocument = await databases.getDocument('platform_db', 'sites', siteId);
    const { site_url, wp_username, wp_app_password } = siteDocument;

    // In een echte app moet wp_app_password hier worden ontsleuteld.
    // Voor dit voorbeeld gaan we ervan uit dat het in een ophaalbaar formaat is opgeslagen.
    const decryptedPassword = wp_app_password;

    const auth = 'Basic ' + Buffer.from(wp_username + ':' + decryptedPassword).toString('base64');
    const targetUrl = `${site_url.replace(/\/$/, '')}/wp-json/${endpoint.replace(/^\//, '')}`;

    const options = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const wpResponse = await fetch(targetUrl, options);
    const wpResponseBody = await wpResponse.json();

    if (!wpResponse.ok) {
        // Stuur de WordPress-foutmelding door indien beschikbaar
        const errorMessage = wpResponseBody.message || `Request failed with status ${wpResponse.status}`;
        return res.json({ success: false, message: errorMessage, wpStatus: wpResponse.status }, wpResponse.status > 499 ? 502 : wpResponse.status);
    }

    return res.json(wpResponseBody);

  } catch (error) {
    if (error.code === 404) {
      return res.json({ success: false, message: `Site with ID '${siteId}' not found.` }, 404);
    }
    console.error(error);
    // Behandel netwerkfouten (bv. site niet bereikbaar)
    if (error.name === 'FetchError' || error.type === 'system') {
        return res.json({ success: false, message: 'Could not connect to the WordPress site. It might be offline or the URL is incorrect.' }, 502); // Bad Gateway
    }
    return res.json({ success: false, message: 'An internal server error occurred.' }, 500);
  }
};

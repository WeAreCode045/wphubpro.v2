const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);

  // Some Appwrite runtimes inject variables on `req.variables` rather than `process.env`.
  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_API_KEY) {
    error('Function environment variables are not configured correctly.');
    const available = Object.keys(env || {});
    return res.json({ success: false, message: 'Function environment is not configured.', availableEnvKeys: available }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  // --- NEW: Read from Query Parameters ---
  const { category, settings: settingsStr, userId } = req.query;
  
  if (!category || !settingsStr || !userId) {
    error(`Missing query parameters. Received: category=${category}, userId=${userId}, settings=${settingsStr}`);
    return res.json({ success: false, message: 'Missing category, settings, or userId in query parameters' }, 400);
  }

  let settings;
  try {
    // The Appwrite runtime is not decoding the query param, so we must do it manually.
    const decodedSettingsStr = decodeURIComponent(settingsStr);
    settings = JSON.parse(decodedSettingsStr);
  } catch (e) {
    error(`Failed to parse settings JSON. Raw string from query: ${settingsStr}`);
    return res.json({ success: false, message: 'Invalid settings JSON format.' }, 400);
  }
  // --- END NEW ---

  try {
    const user = await users.get(userId);
    const isAdmin = user.labels?.some(l => l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator');

    if (!isAdmin) {
      return res.json({ success: false, message: 'Forbidden: Admin access required' }, 403);
    }

    const DATABASE_ID = 'platform_db';
    const COLLECTION_ID = 'platform_settings';
    const valueStr = JSON.stringify(settings);

    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      sdk.Query.equal('key', category)
    ]);

    if (existing.total > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        existing.documents[0].$id,
        { value: valueStr }
      );
      return res.json({ success: true, message: 'Settings updated' });
    } else {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        sdk.ID.unique(),
        { key: category, value: valueStr }
      );
      return res.json({ success: true, message: 'Settings created' });
    }
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};

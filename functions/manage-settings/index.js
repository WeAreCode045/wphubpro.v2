/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);
  const teams = new sdk.Teams(client);

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

  // Parse payload from request body
  let payload = {};
  
  try {
    if (req.body && typeof req.body === 'object') {
      payload = req.body;
    } else if (req.bodyRaw) {
      payload = JSON.parse(req.bodyRaw);
    } else if (req.payload) {
      payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
    }
  } catch (e) {
    error('Failed to parse request body: ' + e.message);
    return res.json({ success: false, message: 'Invalid request body' }, 400);
  }

  const { category, settings, userId } = payload;
  
  if (!category || !settings || !userId) {
    error(`Missing parameters. Received: category=${category}, userId=${userId}, settings=${JSON.stringify(settings)}`);
    return res.json({ success: false, message: 'Missing category, settings, or userId in request body' }, 400);
  }

  log('Updating settings for category: ' + category);
  log('User ID: ' + userId);

  try {
    // Check if user is member of admin team
    let isAdmin = false;
    try {
      const adminTeamId = 'admin';
      const memberships = await teams.listMemberships(adminTeamId);
      isAdmin = memberships.memberships.some(m => m.userId === userId);
      log('User admin check - Team memberships found: ' + memberships.total + ', isAdmin: ' + isAdmin);
    } catch (teamErr) {
      log('Could not check team membership: ' + teamErr.message);
      // Fallback to label check for backwards compatibility
      const user = await users.get(userId);
      isAdmin = user.labels?.some(l => l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator');
      log('User admin check (fallback) - Labels: ' + JSON.stringify(user.labels) + ', isAdmin: ' + isAdmin);
    }

    if (!isAdmin) {
      log('User ' + userId + ' is not an admin');
      return res.json({ success: false, message: 'Forbidden: Admin access required' }, 403);
    }

    log('User is admin, proceeding with settings update');

    const DATABASE_ID = 'platform_db';
    const COLLECTION_ID = 'platform_settings';
    const valueStr = JSON.stringify(settings);

    log('Querying for existing settings with key: ' + category);

    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      sdk.Query.equal('key', category)
    ]);

    log('Found ' + existing.total + ' existing documents');

    if (existing.total > 0) {
      log('Updating existing document: ' + existing.documents[0].$id);
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        existing.documents[0].$id,
        { value: valueStr }
      );
      log('Settings updated successfully for category: ' + category);
      return res.json({ success: true, message: 'Settings updated' });
    } else {
      log('Creating new document for category: ' + category);
      const newDoc = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        sdk.ID.unique(),
        { key: category, value: valueStr }
      );
      log('Settings created successfully with ID: ' + newDoc.$id);
      return res.json({ success: true, message: 'Settings created' });
    }
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};

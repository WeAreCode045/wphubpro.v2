/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const users = new sdk.Users(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    error('Function env not configured');
    const available = Object.keys(env || {});
    return res.json({ success: false, message: 'Function environment is not configured.', availableEnvKeys: available }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY);

  let payload;
  try {
    payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : (req.payload || {});
  } catch (e) {
    error('Failed to parse payload.');
    return res.json({ success: false, message: 'Invalid payload JSON' }, 400);
  }

  let { userId } = payload;
  // Fallback to query params when payload is not delivered by runtime
  if (!userId && req && req.query) {
    userId = req.query.userId || req.query.user_id;
  }
  if (!userId) return res.json({ success: false, message: 'Missing userId' }, 400);

  try {
    // Check if any user already has the Admin label
    const userList = await users.list([
      sdk.Query.limit(1),
      sdk.Query.equal('labels', 'Admin')
    ]);

    if (userList.total > 0) {
      log('Admin already exists, skipping label assignment.');
      return res.json({ success: true, message: 'Admin already exists' });
    }

    // Assign 'Admin' label to this user
    await users.updateLabels(userId, ['Admin']);
    log(`Assigned 'Admin' label to user ${userId}`);

    return res.json({ success: true, message: 'Admin label assigned' });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: 'Failed to assign admin label' }, 500);
  }
};

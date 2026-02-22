/*
 * Admin impersonation function.
 * Expects payload: { userId: '<targetUserId>' }
 * Execution of this function should be restricted to admins (see appwrite.config.json execute setting).
 * The function returns a short-lived JWT for the target user: { success: true, token }
 */
const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const users = new sdk.Users(client);
  const teams = new sdk.Teams(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;
  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_API_KEY) {
    error('Function environment variables are not configured correctly.');
    return res.json({ success: false, message: 'Function environment is not configured.' }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  // Parse payload
  let payload = {};
  try {
    if (req.payload && typeof req.payload === 'string') payload = JSON.parse(req.payload);
    else if (req.payload && typeof req.payload === 'object') payload = req.payload;
    else if (req.bodyRaw) payload = JSON.parse(req.bodyRaw);
  } catch (e) {
    payload = req.query || {};
  }

  const targetUserId = payload.userId || payload.user_id || payload.targetUserId;
  if (!targetUserId) {
    return res.json({ success: false, message: 'Missing userId in payload' }, 400);
  }

  try {
    // Optional: verify requester is admin by requiring the function execute permission to be limited to admin team.
    // As an extra safety, attempt to check that the target user exists.
    const target = await users.get(targetUserId);
    if (!target) return res.json({ success: false, message: 'Target user not found' }, 404);

    // Create a JWT for the target user. This endpoint creates a JSON Web Token for the user
    // which can be used to authenticate as that user for server-side or client-side flows.
    // Note: The SDK method is createJWT. If unavailable, return a helpful error message.
    if (typeof users.createJWT !== 'function') {
      // Some older SDKs use createJWT; if not present, return an instruction
      return res.json({ success: false, message: 'createJWT not available in Appwrite SDK in this runtime. Please update the runtime or implement an alternative impersonation flow.' }, 500);
    }

    const jwtResp = await users.createJWT(targetUserId);
    // jwtResp contains $id, jwt, and expiresAt
    return res.json({ success: true, token: jwtResp.jwt, expiresAt: jwtResp.expiresAt });
  } catch (e) {
    error(e.message || e.toString());
    return res.json({ success: false, message: e.message || 'Server error' }, 500);
  }
};

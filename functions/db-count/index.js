const sdk = require('node-appwrite');

/**
 * Lightweight collection count function.
 * Accepts payload: { databaseId?: string, collectionId: string, queries?: [{ method: string, values: any[] }] }
 * Returns: { success: true, total: number }
 * Uses a safe Query.limit(1) to avoid Appwrite rejecting a zero limit.
 */
module.exports = async ({ req, res, log, error }) => {
  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;
  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_API_KEY) {
    error('Function environment variables are not configured correctly.');
    return res.json({ success: false, message: 'Function environment is not configured.' }, 500);
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);

  // Parse payload
  let payload = {};
  try {
    if (req.payload && typeof req.payload === 'string') payload = JSON.parse(req.payload);
    else if (req.payload && typeof req.payload === 'object') payload = req.payload;
    else if (req.bodyRaw) payload = JSON.parse(req.bodyRaw);
  } catch (e) {
    payload = req.query || {};
  }

  const databaseId = payload.databaseId || 'platform_db';
  const collectionId = payload.collectionId;
  const rawQueries = Array.isArray(payload.queries) ? payload.queries : [];

  if (!collectionId) {
    return res.json({ success: false, message: 'collectionId is required' }, 400);
  }

  try {
    const queries = [];
    for (const q of rawQueries) {
      try {
        if (typeof sdk.Query[q.method] === 'function') {
          queries.push(sdk.Query[q.method](...(q.values || [])));
        }
      } catch (e) {
        // ignore invalid queries
      }
    }

    // Ensure a limit of 1 so Appwrite returns total but doesn't error on limit 0
    queries.push(sdk.Query.limit(1));

    const list = await databases.listDocuments(databaseId, collectionId, queries);
    return res.json({ success: true, total: list.total });
  } catch (e) {
    error(e.message || e.toString());
    return res.json({ success: false, message: e.message || 'Failed to count documents' }, 500);
  }
};

const sdk = require('node-appwrite');

/**
 * Admin List Users Function
 * Fetches Appwrite users for the admin UI.
 *
 * Environment Variables Required:
 * - APPWRITE_ENDPOINT: Appwrite API endpoint
 * - APPWRITE_PROJECT_ID: Appwrite project ID
 * - APPWRITE_API_KEY: Appwrite API key (with users.read scope)
 *
 * Request Body (optional):
 * - limit: number (default: 100)
 * - offset: number (default: 0)
 * - search: string (optional)
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      error('Appwrite configuration missing');
      return res.json({
        success: false,
        message: 'Appwrite configuration missing'
      }, 500);
    }

    let payload = {};
    try {
      if (req.payload && typeof req.payload === 'string') {
        payload = JSON.parse(req.payload);
      } else if (req.payload && typeof req.payload === 'object') {
        payload = req.payload;
      }
    } catch {
      payload = {};
    }

    const limit = Number.isFinite(Number(payload.limit)) ? Math.max(1, Math.min(100, Number(payload.limit))) : 100;
    const offset = Number.isFinite(Number(payload.offset)) ? Math.max(0, Number(payload.offset)) : 0;
    const search = typeof payload.search === 'string' ? payload.search.trim() : '';

    const client = new sdk.Client();
    client
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const users = new sdk.Users(client);
    const databases = new sdk.Databases(client);
    const queries = [sdk.Query.limit(limit), sdk.Query.offset(offset)];

    log(`Listing users: limit=${limit}, offset=${offset}, search=${search || 'none'}`);

    const response = search ? await users.list(queries, search) : await users.list(queries);
    const rawUsers = response.users || response.documents || [];

    // Fetch subscriptions specifically for the users in this page
    const DATABASE_ID = req.variables?.DATABASE_ID || process.env.DATABASE_ID || 'platform_db';
    const SUBS_COLLECTION_ID = req.variables?.SUBS_COLLECTION_ID || process.env.SUBS_COLLECTION_ID || 'subscriptions';

    let userSubscriptions = {};
    try {
      const userIds = rawUsers.map(u => u.$id || u.id).filter(id => id);
      
      if (userIds.length > 0) {
        // Appwrite supports Query.equal('user_id', [id1, id2...]) for an OR match
        const subsResponse = await databases.listDocuments(DATABASE_ID, SUBS_COLLECTION_ID, [
          sdk.Query.equal('user_id', userIds),
          sdk.Query.limit(Math.min(100, userIds.length)) 
        ]);
        
        const statusPriority = {
          'active': 100,
          'trialing': 90,
          'past_due': 80,
          'unpaid': 70,
          'incomplete': 60,
          'incomplete_expired': 50,
          'paused': 40,
          'canceled': 10,
          'ended': 0
        };

        subsResponse.documents.forEach(doc => {
          // Extract plan label from plan_label OR metadata.product_label
          let planLabel = doc.plan_label;
          if (!planLabel && doc.metadata) {
            try {
              const meta = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
              planLabel = meta.product_label || meta.label || meta.plan_name || planLabel;
            } catch (e) { /* ignore parse error */ }
          }

          const current = userSubscriptions[doc.user_id];
          const docStatus = doc.status || 'ended';
          const docStatusScore = statusPriority[docStatus] !== undefined ? statusPriority[docStatus] : 0;
          const currentStatus = current ? (current.status || 'ended') : 'ended';
          const currentStatusScore = current ? (statusPriority[currentStatus] !== undefined ? statusPriority[currentStatus] : -1) : -1;

          // Update if no current subscription, OR new doc has higher priority status
          if (!current || docStatusScore > currentStatusScore) {
            userSubscriptions[doc.user_id] = {
              planLabel: planLabel,
              status: doc.status,
              stripeId: doc.stripe_customer_id,
              stripeSubscriptionId: doc.stripe_subscription_id
            };
          }
        });
      }
    } catch (e) {
      log('Could not fetch subscriptions for mapping: ' + e.message);
    }

    const formatted = rawUsers.map((user) => {
      const labels = Array.isArray(user.labels) ? user.labels : [];
      const isAdmin = labels.some((label) => String(label).toLowerCase() === 'admin');
      
      // Get plan info from subscriptions mapping
      const subInfo = userSubscriptions[user.$id || user.id];
      
      // Fallback for plan name: Subscription mapping -> Prefs -> Labels -> Free Tier
      const planName = subInfo?.planLabel || user.prefs?.plan_label || user.prefs?.plan_id || labels.find((l) => String(l).toLowerCase() !== 'admin') || 'Free Tier';
      
      return {
        id: user.$id || user.id,
        name: user.name || user.email || `User ${(user.$id || user.id || '').substring(0, 8)}`,
        email: user.email || 'N/A',
        role: isAdmin ? 'Admin' : 'User',
        isAdmin: isAdmin,
        planName: planName,
        stripeId: subInfo?.stripeId || user.prefs?.stripe_customer_id || 'n/a',
        status: user.status === false ? 'Inactive' : 'Active',
        joined: user.$createdAt ? new Date(user.$createdAt).toLocaleDateString() : 'n/a',
        prefs: user.prefs || {}
      };
    });

    return res.json({
      success: true,
      users: formatted,
      total: response.total || formatted.length,
      limit,
      offset
    });
  } catch (err) {
    error(`Failed to list users: ${err.message}`);
    return res.json({
      success: false,
      message: err.message || 'Failed to list users',
      users: []
    }, 500);
  }
};
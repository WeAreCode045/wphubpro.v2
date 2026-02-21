const sdk = require('node-appwrite');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Sync all Stripe subscriptions to Appwrite subscriptions collection
 * Admin-only function
 */
module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    STRIPE_SECRET_KEY
  } = process.env;

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !STRIPE_SECRET_KEY) {
    error('Missing environment variables');
    return res.json({ error: 'Missing required environment variables' }, 500);
  }

  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  try {
    log('Starting Stripe subscription sync...');
    
    const syncedCount = { created: 0, updated: 0, errors: 0 };
    const errors = [];
    
    // Fetch all subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      status: 'all'
    });
    
    log('Found ' + subscriptions.data.length + ' subscriptions in Stripe');
    
    for (const subscription of subscriptions.data) {
      try {
        const userId = subscription.metadata?.appwrite_user_id;
        const productLabel = subscription.metadata?.product_label;
        
        if (!userId) {
          log('Skipping subscription ' + subscription.id + ' - no appwrite_user_id in metadata');
          continue;
        }
        
        // Fetch product details
        const priceId = subscription.items.data[0]?.price?.id;
        const price = priceId ? await stripe.prices.retrieve(priceId) : null;
        const product = price ? await stripe.products.retrieve(price.product) : null;
        
        // Fetch user details
        let userName = null;
        let userEmail = null;
        try {
          const user = await users.get(userId);
          userName = user.name;
          userEmail = user.email;
        } catch (e) {
          log('Could not fetch user ' + userId + ': ' + e.message);
        }
        
        const subscriptionData = {
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          plan_id: product?.id || null,
          plan_label: productLabel || product?.metadata?.label || null,
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          updated_at: new Date().toISOString()
        };
        
        // Check if subscription document exists by stripe_subscription_id
        const existingDocs = await databases.listDocuments(
          'platform_db',
          'subscriptions',
          [sdk.Query.equal('stripe_subscription_id', subscription.id), sdk.Query.limit(1)]
        );
        
        if (existingDocs.documents && existingDocs.documents.length > 0) {
          // Update existing
          await databases.updateDocument(
            'platform_db',
            'subscriptions',
            existingDocs.documents[0].$id,
            subscriptionData
          );
          syncedCount.updated++;
          log('Updated subscription ' + subscription.id + ' for user ' + userId);
        } else {
          // Create new
          await databases.createDocument(
            'platform_db',
            'subscriptions',
            sdk.ID.unique(),
            subscriptionData
          );
          syncedCount.created++;
          log('Created subscription ' + subscription.id + ' for user ' + userId);
        }
      } catch (e) {
        syncedCount.errors++;
        const errorMsg = 'Error syncing subscription ' + subscription.id + ': ' + e.message;
        error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    log('Sync completed - Created: ' + syncedCount.created + ', Updated: ' + syncedCount.updated + ', Errors: ' + syncedCount.errors);
    
    return res.json({
      success: true,
      synced: syncedCount,
      total: subscriptions.data.length,
      errors: errors
    });
    
  } catch (err) {
    error('Failed to sync subscriptions: ' + err.message);
    return res.json({ 
      success: false, 
      error: err.message 
    }, 500);
  }
};

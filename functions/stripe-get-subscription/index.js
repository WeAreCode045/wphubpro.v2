const sdk = require('node-appwrite');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async ({ req, res, log, error }) => {
    const client = new sdk.Client();
    const databases = new sdk.Databases(client);

    const {
        APPWRITE_ENDPOINT,
        APPWRITE_PROJECT_ID,
        APPWRITE_API_KEY,
        STRIPE_SECRET_KEY,
        DATABASE_ID,
        ACCOUNTS_COLLECTION_ID
    } = process.env;

    const missingVars = [];
    if (!APPWRITE_ENDPOINT) missingVars.push('APPWRITE_ENDPOINT');
    if (!APPWRITE_PROJECT_ID) missingVars.push('APPWRITE_PROJECT_ID');
    if (!APPWRITE_API_KEY) missingVars.push('APPWRITE_API_KEY');
    if (!STRIPE_SECRET_KEY) missingVars.push('STRIPE_SECRET_KEY');
    if (!DATABASE_ID) missingVars.push('DATABASE_ID');
    if (!ACCOUNTS_COLLECTION_ID) missingVars.push('ACCOUNTS_COLLECTION_ID');

    if (missingVars.length > 0) {
        const errorMsg = `Missing environment variables: ${missingVars.join(', ')}. See STRIPE_SETUP.md for configuration instructions.`;
        error(errorMsg);
        return res.json({ error: errorMsg }, 500);
    }

    client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    try {
        // Get user ID from environment (set by Appwrite when called from authenticated context)
        let userId = process.env.APPWRITE_FUNCTION_USER_ID || 
                     req.headers['x-appwrite-user-id'];
        
        log('User ID from env: ' + process.env.APPWRITE_FUNCTION_USER_ID);
        log('User ID from headers: ' + req.headers['x-appwrite-user-id']);
        log('Final userId: ' + userId);
        
        if (!userId) {
            error('No user ID found. User must be authenticated.');
            return res.json({ error: 'User not authenticated.' }, 401);
        }

        const user = { $id: userId };
        log('Fetching subscription for user: ' + user.$id);

        // 1. Get the user's account to find their Stripe Customer ID
        const accountDocs = await databases.listDocuments(
            DATABASE_ID,
            ACCOUNTS_COLLECTION_ID,
            [sdk.Query.equal('user_id', user.$id)]
        );

        if (accountDocs.total === 0) {
            log('No account found for user ' + user.$id);
            // If the user has no account, they have no subscription. Return null.
            return res.json(null);
        }
        
        const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
        
        if (!stripeCustomerId) {
            log('Account exists but no stripe_customer_id for user ' + user.$id);
            return res.json(null);
        }

        log('Found Stripe customer: ' + stripeCustomerId);

        // 2. Fetch subscriptions for the customer from Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all', // Fetch active, trialing, past_due, etc.
            limit: 1 // A customer should typically only have one active subscription
        });

        if (subscriptions.data.length === 0) {
            log('No subscriptions found for customer ' + stripeCustomerId);
            return res.json(null); // No subscriptions found
        }
        
        const sub = subscriptions.data[0];
        const priceItem = sub.items.data[0].price;
        
        log('Subscription found: ' + sub.id + ', status: ' + sub.status);
        
        // Fetch the product details to get the name and metadata
        const product = await stripe.products.retrieve(priceItem.product);
        
        log('Product retrieved: ' + product.name);

        // 3. Format the response to match the old structure for minimal frontend changes
        const subscriptionData = {
            planId: product.name,
            status: sub.status,
            currentPeriodStart: sub.current_period_start,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            stripeSubscriptionId: sub.id,
            priceId: priceItem.id,
            // Get limits from product metadata
            sitesLimit: parseInt(product.metadata.sites_limit || product.metadata.site_limit || '9999', 10), 
            libraryLimit: parseInt(product.metadata.library_limit || '9999', 10),
            storageLimit: parseInt(product.metadata.storage_limit || '9999', 10),
        };

        return res.json(subscriptionData);

    } catch (err) {
        error("Failed to get Stripe subscription:", err);
        return res.json({ error: err.message }, 500);
    }
};

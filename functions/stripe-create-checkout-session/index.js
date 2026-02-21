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
        // Parse payload from different possible sources (Appwrite versions handle this differently)
        let payload = {};
        
        log('Request body type: ' + typeof req.body);
        log('Request bodyRaw type: ' + typeof req.bodyRaw);
        log('Request payload type: ' + typeof req.payload);
        
        if (req.body && typeof req.body === 'object') {
            payload = req.body;
            log('Using req.body (already parsed object)');
        } else if (req.bodyRaw) {
            payload = JSON.parse(req.bodyRaw);
            log('Using req.bodyRaw (parsed from string)');
        } else if (req.payload) {
            payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            log('Using req.payload');
        } else {
            error('No payload found in request');
            log('Available req properties: ' + Object.keys(req).join(', '));
        }
        
        log('Parsed payload: ' + JSON.stringify(payload));
        
        // In Appwrite functions, the user ID is available when called from authenticated context
        let userId = process.env.APPWRITE_FUNCTION_USER_ID || 
                     req.headers['x-appwrite-user-id'];
        
        log('User ID from env: ' + process.env.APPWRITE_FUNCTION_USER_ID);
        log('User ID from headers: ' + req.headers['x-appwrite-user-id']);
        log('Final userId: ' + userId);
        
        if (!userId) {
            error('No user ID found. User must be authenticated.');
            return res.json({ 
                error: 'User not authenticated. Please log in and try again.',
                hint: 'Make sure you are logged in before subscribing to a plan.'
            }, 401);
        }

        const user = { $id: userId };
        log('Processing checkout for user: ' + user.$id);
        
        const { priceId, returnUrl } = payload;
        if (!priceId) {
            error('Missing priceId in request payload');
            return res.json({ error: 'priceId is required' }, 400);
        }

        // Build dynamic URLs from client or use defaults
        const baseUrl = returnUrl || 'http://localhost:3000';
        const successUrl = baseUrl + '/#/subscription?success=true';
        const cancelUrl = baseUrl + '/#/subscription?canceled=true';

        log('Creating checkout session with returnUrl: ' + baseUrl);

        // 1. Get the user's account to find their Stripe Customer ID
        const accountDocs = await databases.listDocuments(
            DATABASE_ID,
            ACCOUNTS_COLLECTION_ID,
            [sdk.Query.equal('user_id', user.$id)]
        );

        if (accountDocs.total === 0) {
            error('No account found for user ' + user.$id);
            return res.json({ error: 'No Stripe customer found. Please contact support.' }, 404);
        }
        
        const stripeCustomerId = accountDocs.documents[0].stripe_customer_id;
        
        if (!stripeCustomerId) {
            error('Account exists but no stripe_customer_id for user ' + user.$id);
            return res.json({ error: 'Stripe customer ID not configured. Please contact support.' }, 404);
        }

        log('Found Stripe customer: ' + stripeCustomerId);

        // 2. Fetch price and product to get metadata label
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product);
        const productLabel = product.metadata?.label || null;
        
        log('Product label from metadata: ' + productLabel);
        
        if (!productLabel) {
            error('Product does not have a label in metadata');
            return res.json({ error: 'Product configuration error. Please contact support.' }, 400);
        }

        // 3. Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            payment_method_collection: 'if_required',
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'subscription',
            customer: stripeCustomerId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                metadata: {
                    appwrite_user_id: user.$id,
                    product_label: productLabel
                }
            }
        });

        log('Checkout session created: ' + session.id);
        return res.json({ sessionId: session.id, url: session.url });

    } catch (err) {
        error('Failed to create Stripe checkout session:', err);
        return res.json({ 
            error: err.message || 'An unexpected error occurred',
            details: err.stack 
        }, 500);
    }
};

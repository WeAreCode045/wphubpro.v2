const sdk = require('node-appwrite');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Migrate Local Plan to Stripe
 * Creates Stripe product and prices, updates local plan document
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      error('Appwrite configuration missing');
      return res.json({ success: false, message: 'Appwrite configuration missing' }, 500);
    }

    let payload = {};
    try {
      if (req.body && typeof req.body === 'object') payload = req.body;
      else if (req.bodyRaw && typeof req.bodyRaw === 'string') payload = JSON.parse(req.bodyRaw);
      else if (req.payload && typeof req.payload === 'string') payload = JSON.parse(req.payload);
      else if (req.payload && typeof req.payload === 'object') payload = req.payload;
    } catch (e) {
      payload = {};
    }

    const { localPlanId, prices } = payload;

    if (!localPlanId) {
      return res.json({ success: false, message: 'localPlanId is required' }, 400);
    }

    const client = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);

    // Get the local plan
    const localPlan = await databases.getDocument('platform_db', 'local_plans', localPlanId);
    log(`Fetched local plan: ${localPlan.name}`);

    // Get users on this plan
    const usersOnPlan = await databases.listDocuments('platform_db', 'subscriptions', [
      sdk.Query.equal('plan_label', localPlan.label),
      sdk.Query.limit(100)
    ]);

    const usersCount = usersOnPlan.total;
    log(`Found ${usersCount} users on plan ${localPlan.label}`);

    // Create Stripe product
    const product = await stripe.products.create({
      name: localPlan.name,
      description: localPlan.description || '',
      metadata: {
        label: localPlan.label,
        sites_limit: localPlan.sites_limit || 'unlimited',
        library_limit: localPlan.library_limit || 'unlimited',
        storage_limit: localPlan.storage_limit || 'unlimited'
      }
    });

    log(`Created Stripe product: ${product.id}`);

    // Create prices for each billing period
    const stripePrices = [];
    const validPeriods = {
      weekly: 'week',
      monthly: 'month',
      yearly: 'year'
    };

    if (prices && Array.isArray(prices) && prices.length > 0) {
      for (const price of prices) {
        if (!price.price || !price.billing_period) {
          log(`Skipping invalid price: ${JSON.stringify(price)}`);
          continue;
        }

        const period = validPeriods[price.billing_period] || 'month';
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(price.price * 100),
          currency: 'usd',
          recurring: {
            interval: period,
            interval_count: 1
          },
          metadata: {
            label: localPlan.label,
            billing_period: price.billing_period
          }
        });

        stripePrices.push({
          price: price.price,
          stripe_price_id: stripePrice.id,
          billing_period: price.billing_period
        });

        log(`Created Stripe price: ${stripePrice.id} for ${price.billing_period} billing`);
      }
    }

    // Update local plan with Stripe info
    const updatedPlan = await databases.updateDocument('platform_db', 'local_plans', localPlanId, {
      stripe_product_id: product.id,
      prices: stripePrices.length > 0 ? stripePrices : (prices || [])
    });

    log(`Updated local plan with Stripe product ID: ${product.id}`);

    return res.json({
      success: true,
      stripeProductId: product.id,
      stripePrices,
      usersOnPlanCount: usersCount,
      usersOnPlan: usersOnPlan.documents.map(doc => ({
        userId: doc.user_id,
        userName: doc.user_name,
        userEmail: doc.user_email
      }))
    });
  } catch (err) {
    error(`Failed to migrate plan: ${err.message}`);
    return res.json({
      success: false,
      message: err.message || 'Failed to migrate plan'
    }, 500);
  }
};

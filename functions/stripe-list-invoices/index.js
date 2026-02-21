const Stripe = require('stripe');
const sdk = require('node-appwrite');

/**
 * Stripe List Invoices Function
 * Fetches invoices for the current user from Stripe
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * - APPWRITE_ENDPOINT: Appwrite API endpoint
 * - APPWRITE_PROJECT_ID: Appwrite project ID
 * - APPWRITE_API_KEY: Appwrite API key
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Get environment variables
    const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;

    if (!STRIPE_SECRET_KEY) {
      error('STRIPE_SECRET_KEY is not configured');
      return res.json({
        success: false,
        message: 'Stripe configuration missing'
      }, 500);
    }

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      error('Appwrite configuration missing');
      return res.json({
        success: false,
        message: 'Appwrite configuration missing'
      }, 500);
    }

    // Get the authenticated user ID
    const userId = req.variables?.APPWRITE_FUNCTION_USER_ID || req.variables?.APPWRITE_USER_ID;
    
    if (!userId) {
      error('User not authenticated');
      return res.json({
        success: false,
        message: 'User not authenticated'
      }, 401);
    }

    log(`Fetching invoices for user: ${userId}`);

    // Initialize Appwrite client
    const client = new sdk.Client();
    client
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);

    // Get user's subscription to find Stripe customer ID
    const subscriptions = await databases.listDocuments(
      'platform_db',
      'subscriptions',
      [sdk.Query.equal('user_id', userId)]
    );

    if (subscriptions.documents.length === 0) {
      log('No subscription found for user');
      return res.json({
        success: true,
        invoices: []
      });
    }

    const subscription = subscriptions.documents[0];
    const stripeCustomerId = subscription.stripe_customer_id;

    if (!stripeCustomerId) {
      log('No Stripe customer ID found');
      return res.json({
        success: true,
        invoices: []
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100,
    });

    // Transform data for frontend
    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      created: invoice.created,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      number: invoice.number,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
    }));

    log(`Successfully fetched ${formattedInvoices.length} invoices`);

    return res.json({
      success: true,
      invoices: formattedInvoices
    });

  } catch (err) {
    error(`Failed to fetch invoices: ${err.message}`);
    return res.json({
      success: false,
      message: err.message || 'Failed to fetch invoices',
      invoices: []
    }, 500);
  }
};

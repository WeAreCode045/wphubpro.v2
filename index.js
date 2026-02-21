const Stripe = require('stripe');

/**
 * Stripe List Payment Intents Function
 * Fetches recent payment intents from Stripe for the admin dashboard
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * 
 * Query Parameters (optional):
 * - limit: Number of results to return (default: 100, max: 100)
 * - starting_after: Pagination cursor for fetching next page
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    // Get environment variables
    const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      error('STRIPE_SECRET_KEY is not configured');
      return res.json({
        success: false,
        message: 'Stripe configuration missing'
      }, 500);
    }

    // Initialize Stripe
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Parse request parameters
    let payload = {};
    try {
      if (req.payload && typeof req.payload === 'string') {
        payload = JSON.parse(req.payload);
      } else if (req.payload && typeof req.payload === 'object') {
        payload = req.payload;
      }
    } catch {
      // Fallback to query params if payload parsing fails
      payload = req.query || {};
    }

    const limit = Math.min(parseInt(payload.limit) || 100, 100);
    const startingAfter = payload.starting_after || null;

    log(`Fetching payment intents: limit=${limit}, starting_after=${startingAfter || 'none'}`);

    // Fetch payment intents from Stripe
    const params = {
      limit,
      expand: ['data.customer', 'data.invoice'],
    };

    if (startingAfter) {
      params.starting_after = startingAfter;
    }

    const paymentIntents = await stripe.paymentIntents.list(params);

    // Transform data for frontend consumption
    const orders = paymentIntents.data.map(intent => {
      const customer = intent.customer;
      const customerName = typeof customer === 'object' && customer 
        ? (customer.name || customer.email || 'Unknown Customer')
        : 'Unknown Customer';
      const customerEmail = typeof customer === 'object' && customer 
        ? customer.email 
        : '';

      // Extract plan information from metadata or description
      const plan = intent.metadata?.plan_name || 
                   intent.description || 
                   'One-time payment';

      // Format amount
      const amount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: intent.currency.toUpperCase(),
      }).format(intent.amount / 100);

      // Format date
      const date = new Date(intent.created * 1000);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let formattedDate;
      if (diffMins < 60) {
        formattedDate = `${diffMins} mins ago`;
      } else if (diffHours < 24) {
        formattedDate = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        formattedDate = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else {
        formattedDate = date.toLocaleDateString();
      }

      return {
        id: intent.id,
        customer: customerName,
        email: customerEmail,
        plan,
        amount,
        status: intent.status === 'succeeded' ? 'Paid' : 
                intent.status === 'processing' ? 'Pending' :
                intent.status === 'requires_payment_method' ? 'Failed' :
                intent.status.charAt(0).toUpperCase() + intent.status.slice(1),
        date: formattedDate,
        timestamp: intent.created,
        currency: intent.currency,
        rawAmount: intent.amount,
        stripeLink: `https://dashboard.stripe.com/payments/${intent.id}`,
      };
    });

    log(`Successfully fetched ${orders.length} payment intents`);

    return res.json({
      success: true,
      orders,
      has_more: paymentIntents.has_more,
      next_cursor: paymentIntents.has_more && paymentIntents.data.length > 0
        ? paymentIntents.data[paymentIntents.data.length - 1].id
        : null,
    });

  } catch (err) {
    error(`Failed to fetch payment intents: ${err.message}`);
    return res.json({
      success: false,
      message: err.message || 'Failed to fetch payment intents',
      orders: []
    }, 500);
  }
};

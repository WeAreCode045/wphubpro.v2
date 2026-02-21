const Stripe = require('stripe');

/**
 * Stripe List Products Function
 * Fetches products and their associated prices from Stripe for plan management
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key
 * 
 * Query Parameters (optional):
 * - active_only: Only return active products (default: true)
 * - include_prices: Include price information (default: true)
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
    } catch (_e) {
      // Fallback to query params if payload parsing fails
      payload = req.query || {};
    }

    const activeOnly = payload.active_only !== 'false' && payload.active_only !== false;
    const includePrices = payload.include_prices !== 'false' && payload.include_prices !== false;

    log(`Fetching products: active_only=${activeOnly}, include_prices=${includePrices}`);

    // Fetch products from Stripe
    const productsParams = {
      limit: 100,
      expand: ['data.default_price'],
    };

    if (activeOnly) {
      productsParams.active = true;
    }

    const products = await stripe.products.list(productsParams);

    // Fetch all prices if needed
    let allPrices = [];
    if (includePrices) {
      const pricesResponse = await stripe.prices.list({
        limit: 100,
        active: activeOnly,
      });
      allPrices = pricesResponse.data;
    }

    // Transform data for frontend consumption
    const plans = await Promise.all(products.data.map(async product => {
      // Get prices for this product
      const productPrices = allPrices.filter(price => price.product === product.id);

      // Find monthly and yearly prices
      const monthlyPrice = productPrices.find(p => 
        p.recurring?.interval === 'month'
      );
      const yearlyPrice = productPrices.find(p => 
        p.recurring?.interval === 'year'
      );

      // Format metadata as key-value pairs
      const metadata = Object.entries(product.metadata || {}).map(([key, value]) => ({
        key,
        value
      }));

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        status: product.active ? 'active' : 'inactive',
        monthlyPrice: monthlyPrice ? (monthlyPrice.unit_amount / 100) : 0,
        yearlyPrice: yearlyPrice ? (yearlyPrice.unit_amount / 100) : 0,
        monthlyPriceId: monthlyPrice?.id || null,
        yearlyPriceId: yearlyPrice?.id || null,
        currency: monthlyPrice?.currency || yearlyPrice?.currency || 'usd',
        metadata,
        images: product.images || [],
        created: product.created,
        updated: product.updated,
        stripeLink: `https://dashboard.stripe.com/products/${product.id}`,
        // Include all prices for reference
        allPrices: productPrices.map(price => ({
          id: price.id,
          amount: price.unit_amount / 100,
          currency: price.currency,
          interval: price.recurring?.interval || 'one_time',
          interval_count: price.recurring?.interval_count || 1,
        })),
      };
    }));

    log(`Successfully fetched ${plans.length} products`);

    return res.json({
      success: true,
      plans,
      total: plans.length,
    });

  } catch (err) {
    error(`Failed to fetch products: ${err.message}`);
    return res.json({
      success: false,
      message: err.message || 'Failed to fetch products',
      plans: []
    }, 500);
  }
};

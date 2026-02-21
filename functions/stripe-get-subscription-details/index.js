const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get detailed subscription data from Stripe
 * Including subscription, customer, invoices, and payment methods
 */
module.exports = async ({ req, res, log, error }) => {
  const { STRIPE_SECRET_KEY } = process.env;

  if (!STRIPE_SECRET_KEY) {
    error('Missing STRIPE_SECRET_KEY');
    return res.json({ error: 'Missing required environment variables' }, 500);
  }

  try {
    const payload = JSON.parse(req.body || '{}');
    const { subscriptionId } = payload;

    if (!subscriptionId) {
      return res.json({ error: 'subscriptionId is required' }, 400);
    }

    log('Fetching subscription details for: ' + subscriptionId);

    // Fetch subscription with expanded data
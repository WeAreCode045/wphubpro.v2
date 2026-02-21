import Stripe from 'stripe';

/**
 * Expects environment variable STRIPE_SECRET_KEY
 * Optionally accepts 'limit' and 'customer' in payload/query
 */

export default async ({ req, res, log }) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  let payload = {};
  try {
    if (req.payload && typeof req.payload === 'string') {
      payload = JSON.parse(req.payload);
    } else if (req.payload && typeof req.payload === 'object') {
      payload = req.payload;
    }
  } catch {
    payload = req.query || {};
  }

  const limit = Math.min(parseInt(payload.limit) || 100, 100);
  const customer = payload.customer || undefined;

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit,
      ...(customer ? { customer } : {}),
    });
    return res.json({ paymentIntents });
  } catch (_e) {
    log('Stripe error:', _e);
    return res.json({ error: true, message: _e.message || 'Stripe error' }, 500);
  }
};

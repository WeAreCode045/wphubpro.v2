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

    const orders = [];
    for (const pi of paymentIntents.data) {
      let invoiceInfo = null;
      try {
        const charge = pi.charges && pi.charges.data && pi.charges.data.length ? pi.charges.data[0] : null;
        if (charge && charge.invoice) {
          const invoice = await stripe.invoices.retrieve(charge.invoice);
          invoiceInfo = {
            id: invoice.id,
            hosted_invoice_url: invoice.hosted_invoice_url,
            invoice_pdf: invoice.invoice_pdf,
            number: invoice.number,
          };
        }
      } catch (e) {
        // ignore invoice retrieval errors per-item
      }

      orders.push({
        id: pi.id,
        amount: pi.amount, // in cents
        currency: pi.currency,
        status: pi.status,
        customer: pi.customer || null,
        email: pi.receipt_email || (pi.charges?.data?.[0]?.billing_details?.email) || null,
        date: pi.created,
        invoice: invoiceInfo,
        raw: pi,
      });
    }

    return res.json({ orders });
  } catch (_e) {
    log('Stripe error:', _e);
    return res.json({ error: true, message: _e.message || 'Stripe error' }, 500);
  }
};

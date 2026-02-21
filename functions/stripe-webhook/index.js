// Stripe Webhook Handler for Appwrite Function
const Stripe = require('stripe');
const sdk = require('node-appwrite');

/**
 * Expects environment variable STRIPE_WEBHOOK_SECRET
 */
module.exports = async ({ req, res, log, error }) => {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    error('Stripe secret or webhook secret missing');
    return res.json({ success: false, message: 'Stripe secret or webhook secret missing' }, 500);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  
  // Setup Appwrite client for removing 'free' label
  const client = new sdk.Client();
  const users = new sdk.Users(client);
  
  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  let event;
  try {
    // Appwrite passes raw body as req.body (Buffer or string)
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || '', 'utf8');
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    error('Webhook signature verification failed: ' + err.message);
    return res.json({ success: false, message: 'Webhook signature verification failed' }, 400);
  }

  // Handle event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.subscription_data?.metadata?.appwrite_user_id;
        const productLabel = session.subscription_data?.metadata?.product_label;
        
        if (userId && productLabel) {
          try {
            // Get current user to read existing labels
            const user = await users.get(userId);
            const currentLabels = user.labels || [];
            
            // Keep admin label, replace everything else with product label
            const adminLabels = currentLabels.filter(l => l.toLowerCase() === 'admin');
            const updatedLabels = [...adminLabels, productLabel];
            
            // Update user with Stripe product label
            await users.updateLabels(userId, updatedLabels);
            log('Set Stripe product label for user: ' + userId + ', label: ' + productLabel);
          } catch (e) {
            error('Failed to set product label for user ' + userId + ': ' + e.message);
          }
        }
        
        log('Checkout session completed:', session.id);
        break;
      }
        
      case 'invoice.paid':
        log('Invoice paid:', event.data.object.id);
        break;
        
      case 'customer.subscription.updated':
        log('Subscription updated:', event.data.object.id);
        break;
        
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const deletedUserId = subscription.metadata?.appwrite_user_id;
        
        if (deletedUserId) {
          try {
            // Get current user to read existing labels
            const user = await users.get(deletedUserId);
            const currentLabels = user.labels || [];
            
            // Keep only admin label, remove all others (including Stripe price ID)
            const adminLabels = currentLabels.filter(l => l.toLowerCase() === 'admin');
            await users.updateLabels(deletedUserId, adminLabels);
            log('Removed subscription labels from user: ' + deletedUserId);
          } catch (e) {
            error('Failed to remove subscription labels from user ' + deletedUserId + ': ' + e.message);
          }
        }
        
        log('Subscription deleted:', subscription.id);
        break;
      }
        
      default:
        log('Unhandled event type:', event.type);
    }
    return res.json({ success: true });
  } catch (err) {
    error('Webhook handler error: ' + err.message);
    return res.json({ success: false, message: 'Webhook handler error' }, 500);
  }
};

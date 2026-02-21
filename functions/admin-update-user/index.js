const fetch = require('node-fetch');
const sdk = require('node-appwrite');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Admin Update User Function
 * Updates user properties (name, email, prefs) via Appwrite REST API
 *
 * Environment Variables Required:
 * - APPWRITE_ENDPOINT
 * - APPWRITE_PROJECT_ID
 * - APPWRITE_API_KEY (admin key)
 * - STRIPE_SECRET_KEY
 *
 * Request Body:
 * - userId: string
 * - updates: object
 */
module.exports = async ({ req, res, log, error }) => {
  try {
    const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      error('Appwrite configuration missing');
      return res.json({ success: false, message: 'Appwrite configuration missing' }, 500);
    }

    let payload = {};
    try {
      if (req.payload && typeof req.payload === 'string') payload = JSON.parse(req.payload);
      else if (req.payload && typeof req.payload === 'object') payload = req.payload;
    } catch (e) {
      payload = {};
    }

    const userId = payload.userId || (payload.updates && payload.updates.userId);
    const updates = payload.updates || {};

    if (!userId) {
      return res.json({ success: false, message: 'userId is required' }, 400);
    }

    // Update Appwrite user via REST patch for simple fields
    const url = `${APPWRITE_ENDPOINT}/users/${encodeURIComponent(userId)}`;

    const body = {};
    if (updates.name) body.name = updates.name;
    if (updates.email) body.email = updates.email;
    if (updates.status) body.status = updates.status === 'Active' ? true : false;

    const prefs = {};
    if (updates.planId) prefs.plan_id = updates.planId;
    if (updates.stripe_customer_id) prefs.stripe_customer_id = updates.stripe_customer_id;
    if (Object.keys(updates.customLimits || {}).length > 0) prefs.limits = updates.customLimits;
    if (Object.keys(prefs).length > 0) body.prefs = prefs;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY
      },
      body: JSON.stringify(body)
    });

    const json = await response.json();
    if (!response.ok) {
      error(`Appwrite update failed: ${JSON.stringify(json)}`);
      return res.json({ success: false, message: json.message || 'Failed to update user' }, response.status);
    }

    // Handle admin status if provided
    if (Object.prototype.hasOwnProperty.call(updates, 'isAdmin')) {
      try {
        const adminExec = await fetch(`${APPWRITE_ENDPOINT}/functions/set-admin/executions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': APPWRITE_API_KEY
          },
          body: JSON.stringify({ userId, isAdmin: updates.isAdmin })
        });
        
        const adminJson = await adminExec.json();
        if (!adminExec.ok) {
          log(`Warning: Failed to update admin status: ${JSON.stringify(adminJson)}`);
        } else {
          log(`Updated admin status for user ${userId}: ${updates.isAdmin}`);
        }
      } catch (err) {
        log(`Warning: Could not update admin status: ${err.message}`);
      }
    }

    // Manage subscription document in platform_db.subscriptions
    const client = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);
    const functions = new sdk.Functions(client);
    const users = new sdk.Users(client);

    // Handle local plan assignment or removal
    if (Object.prototype.hasOwnProperty.call(updates, 'localPlanId')) {
      try {
        // Get current user labels (no need to preserve admin label - now managed via teams)
        const currentUser = await users.get(userId);
        const currentLabels = currentUser.labels || [];
        log(`Current user ${userId} labels before plan assignment: ${JSON.stringify(currentLabels)}`);
        
        if (updates.localPlanId) {
          // Assign local plan: fetch plan and set its label
          log(`Fetching plan with ID: ${updates.localPlanId}`);
          const plan = await databases.getDocument('platform_db', 'local_plans', updates.localPlanId);
          log(`Plan fetched: ${JSON.stringify(plan)}`);
          
          if (plan && plan.label) {
            // Replace any existing labels with the plan label
            const updatedLabels = [plan.label];
            log(`Updated labels to apply: ${JSON.stringify(updatedLabels)}`);
            
            // Update user labels directly
            await users.updateLabels(userId, updatedLabels);
            
            // Update accounts table and user prefs with current plan ID
            try {
              const accountDocs = await databases.listDocuments('platform_db', 'accounts', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
              if (accountDocs.documents && accountDocs.documents.length > 0) {
                await databases.updateDocument('platform_db', 'accounts', accountDocs.documents[0].$id, {
                  current_plan_id: updates.localPlanId
                });
                log(`Updated current_plan_id to ${updates.localPlanId} in accounts table for doc ${accountDocs.documents[0].$id}`);
              } else {
                log(`Warning: No accounts document found for user ${userId}`);
              }
            } catch (accountErr) {
              log(`Warning: Failed to update accounts table: ${accountErr.message}`);
            }
            
            // Update user prefs with current plan ID
            try {
              const prefsUrl = `${APPWRITE_ENDPOINT}/users/${encodeURIComponent(userId)}`;
              const prefsBody = { prefs: { current_plan_id: updates.localPlanId } };
              const prefsResponse = await fetch(prefsUrl, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
                  'X-Appwrite-Key': APPWRITE_API_KEY
                },
                body: JSON.stringify(prefsBody)
              });
              if (prefsResponse.ok) {
                log(`Updated current_plan_id to ${updates.localPlanId} in user prefs`);
              } else {
                const prefsErr = await prefsResponse.json();
                log(`Warning: Failed to update user prefs: ${JSON.stringify(prefsErr)}`);
              }
            } catch (prefsErr) {
              log(`Warning: Failed to update user prefs: ${prefsErr.message}`);
            }
            
            log(`Applied local plan label "${plan.label}" to user ${userId}`);
          } else {
            log(`Warning: Plan does not have a label. Plan object: ${JSON.stringify(plan)}`);
            error(`Plan ${updates.localPlanId} does not have a label attribute`);
          }
        } else {
          // Remove local plan: check if Stripe subscription exists and restore its label, otherwise remove all labels
          let stripeLabel = null;
          let stripePriceId = null;
          
          try {
            // Try to fetch Stripe subscription and get its product label
            const accountDocs = await databases.listDocuments('platform_db', 'accounts', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
            if (accountDocs.documents.length > 0 && accountDocs.documents[0].stripe_customer_id) {
              const customerId = accountDocs.documents[0].stripe_customer_id;
              const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
              
              if (subscriptions.data.length > 0) {
                const subscription = subscriptions.data[0];
                if (subscription.status !== 'canceled' && subscription.items.data.length > 0) {
                  const priceId = subscription.items.data[0].price.id;
                  stripePriceId = priceId;
                  const price = await stripe.prices.retrieve(priceId);
                  const product = await stripe.products.retrieve(price.product);
                  stripeLabel = product.metadata?.label || null;
                }
              }
            }
          } catch (err) {
            log(`Note: Could not fetch Stripe subscription for user ${userId}: ${err.message}`);
          }
          
          // Set labels: restore Stripe label if exists, otherwise remove all labels
          const updatedLabels = stripeLabel ? [stripeLabel] : [];
          log(`Removed local plan. Updated labels: ${JSON.stringify(updatedLabels)}`);
          
          await users.updateLabels(userId, updatedLabels);
          
          // Update accounts table and user prefs with current plan ID
          const accountDocs = await databases.listDocuments('platform_db', 'accounts', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
          if (accountDocs.documents.length > 0) {
            await databases.updateDocument('platform_db', 'accounts', accountDocs.documents[0].$id, {
              current_plan_id: stripePriceId || null
            });
            log(`Updated current_plan_id to ${stripePriceId || 'null'} in accounts table`);
          }
          
          // Update user prefs with current plan ID
          const prefsUrl = `${APPWRITE_ENDPOINT}/users/${encodeURIComponent(userId)}`;
          const prefsBody = { prefs: { current_plan_id: stripePriceId || null } };
          await fetch(prefsUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Appwrite-Project': APPWRITE_PROJECT_ID,
              'X-Appwrite-Key': APPWRITE_API_KEY
            },
            body: JSON.stringify(prefsBody)
          });
          log(`Updated current_plan_id to ${stripePriceId || 'null'} in user prefs`);
          
          if (stripeLabel) {
            log(`Removed local plan and restored Stripe label "${stripeLabel}" for user ${userId}`);
          } else {
            log(`Removed local plan label from user ${userId}`);
          }
        }
      } catch (err) {
        error(`Failed to apply/remove local plan: ${err.message}`);
        log(`Error details: ${JSON.stringify(err)}`);
      }
    }

    // Build subscription payload if plan assignment fields are present
    if (updates.planId || updates.customPrice || updates.billingStart || updates.customLimits) {
      const subscriptionPayload = {
        user_id: userId,
        user_name: updates.name || json.name || null,
        user_email: updates.email || json.email || null,
        plan_id: updates.planId || null,
        plan_price_mode: updates.priceMode || (updates.customPrice ? 'custom' : 'plan'),
        plan_price: updates.customPrice ? {
          amount: updates.customPrice.amount || 0,
          currency: updates.customPrice.currency || 'usd',
          interval: updates.customPrice.interval || 'month'
        } : null,
        billing_start_date: updates.billingStart === 'never' ? null : (updates.billingStart || null),
        billing_never: updates.billingStart === 'never' ? true : false,
        metadata: updates.customLimits || {},
        status: updates.status ? (updates.status === 'Active' ? 'active' : 'inactive') : 'active',
        updated_at: new Date().toISOString()
      };

      // Try to find existing subscription for user
      const list = await databases.listDocuments('platform_db', 'subscriptions', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
      if (list && list.documents && list.documents.length > 0) {
        const doc = list.documents[0];
        await databases.updateDocument('platform_db', 'subscriptions', doc.$id, subscriptionPayload);
        log(`Updated subscription document for user ${userId}`);
      } else {
        await databases.createDocument('platform_db', 'subscriptions', sdk.ID.unique(), subscriptionPayload);
        log(`Created subscription document for user ${userId}`);
      }
    }

    log(`Updated user ${userId}`);
    return res.json({ success: true, user: json });
  } catch (err) {
    error(`Failed to update user: ${err.message}`);
    return res.json({ success: false, message: err.message || 'Failed to update user' }, 500);
  }
};

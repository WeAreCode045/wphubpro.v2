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

    const updates = payload.updates || {};
    const userId =
      payload.userId ||
      updates.userId ||
      req.variables?.APPWRITE_FUNCTION_USER_ID ||
      req.variables?.APPWRITE_USER_ID ||
      req.headers?.['x-appwrite-user-id'];

    if (!userId) {
      return res.json({ success: false, message: 'userId is required' }, 400);
    }

    const client = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);
    const users = new sdk.Users(client);

    // Get current user to compare values
    const currentUser = await users.get(userId);

      // Update Appwrite user via Users API for simple fields (only if changed)
    try {
      if (updates.name && updates.name !== currentUser.name) {
        await users.updateName(userId, updates.name);
      }
      if (updates.email && updates.email !== currentUser.email) {
        await users.updateEmail(userId, updates.email);
      }
      
      // Update Stripe if name or email changed and user has a stripe_customer_id
      const stripeCustomerId = updates.stripe_customer_id || currentUser.prefs?.stripe_customer_id;
      if (stripeCustomerId && (updates.name || updates.email)) {
        try {
          const stripeUpdate = {};
          if (updates.name) stripeUpdate.name = updates.name;
          if (updates.email) stripeUpdate.email = updates.email;
          
          await stripe.customers.update(stripeCustomerId, stripeUpdate);
          log(`Updated Stripe customer ${stripeCustomerId} with new details`);
        } catch (stripeErr) {
          log(`Warning: Failed to update Stripe customer: ${stripeErr.message}`);
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
        const newStatus = updates.status === 'Active';
        if (newStatus !== currentUser.status) {
          await users.updateStatus(userId, newStatus);
        }
      }
      
      // Update user prefs only for plan assignment fields (not current_plan_id)
      const prefs = {};
      if (updates.planId) prefs.plan_id = updates.planId;
      if (updates.stripe_customer_id) prefs.stripe_customer_id = updates.stripe_customer_id;
      if (Object.keys(updates.customLimits || {}).length > 0) prefs.limits = updates.customLimits;
      if (Object.keys(prefs).length > 0) {
        await users.updatePrefs(userId, { ...currentUser.prefs, ...prefs });
      }
    } catch (err) {
      error(`Appwrite update failed: ${err.message}`);
      return res.json({ success: false, message: err.message || 'Failed to update user' }, 500);
    }

    const json = await users.get(userId);

    // Handle admin status if provided
    if (Object.prototype.hasOwnProperty.call(updates, 'isAdmin') && typeof updates.isAdmin === 'boolean') {
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
    const upsertAccountCurrentPlan = async (currentPlanId) => {
      const accountDocs = await databases.listDocuments(
        'platform_db',
        'accounts',
        [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]
      );

      const updateData = { current_plan_id: currentPlanId };
      if (Object.prototype.hasOwnProperty.call(updates, 'stripe_customer_id')) {
        updateData.stripe_customer_id = updates.stripe_customer_id || null;
      }

      if (accountDocs.documents && accountDocs.documents.length > 0) {
        await databases.updateDocument('platform_db', 'accounts', accountDocs.documents[0].$id, updateData);
        log(`Updated current_plan_id to ${currentPlanId || 'null'} in accounts table for doc ${accountDocs.documents[0].$id}`);
        return;
      }

      const accountData = {
        user_id: userId,
        stripe_customer_id: updates.stripe_customer_id || null,
        current_plan_id: currentPlanId
      };

      const permissions = [
        sdk.Permission.read(sdk.Role.user(userId)),
        sdk.Permission.update(sdk.Role.user(userId)),
        sdk.Permission.read(sdk.Role.team('admin')),
        sdk.Permission.update(sdk.Role.team('admin')),
        sdk.Permission.delete(sdk.Role.team('admin'))
      ];

      await databases.createDocument('platform_db', 'accounts', sdk.ID.unique(), accountData, permissions);
      log(`Created accounts document for user ${userId} with current_plan_id ${currentPlanId || 'null'}`);
    };

    const upsertSubscriptionDoc = async (subscriptionPayload) => {
      try {
        const list = await databases.listDocuments('platform_db', 'subscriptions', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
        if (list && list.documents && list.documents.length > 0) {
          const doc = list.documents[0];
          await databases.updateDocument('platform_db', 'subscriptions', doc.$id, subscriptionPayload);
          log(`Updated subscription document for user ${userId}: ${doc.$id}`);
        } else {
          const newDoc = await databases.createDocument('platform_db', 'subscriptions', sdk.ID.unique(), subscriptionPayload);
          log(`Created subscription document for user ${userId}: ${newDoc.$id}`);
        }
      } catch (err) {
        error(`Failed to upsert subscription document: ${err.message}`);
        throw err;
      }
    };

    // Handle local plan assignment or removal
    if (Object.prototype.hasOwnProperty.call(updates, 'localPlanId')) {
      try {
        if (updates.localPlanId) {
          // Assign local plan: fetch plan and set its label
          log(`Fetching plan with ID: ${updates.localPlanId}`);
          const plan = await databases.getDocument('platform_db', 'local_plans', updates.localPlanId);
          log(`Plan fetched: ${JSON.stringify(plan)}`);
          
          if (plan && plan.label) {
            // Update accounts.current_plan_id with plan label
            const currentPlanLabel = plan.label;
            try {
              await upsertAccountCurrentPlan(currentPlanLabel);
            } catch (accountErr) {
              log(`Warning: Failed to update accounts table: ${accountErr.message}`);
            }

            const assignedByUserId =
              req.headers?.['x-appwrite-user-id'] ||
              req.variables?.APPWRITE_USER_ID ||
              req.variables?.APPWRITE_FUNCTION_USER_ID ||
              null;
            let assignedByUserName = null;
            if (assignedByUserId) {
              try {
                const adminUser = await users.get(assignedByUserId);
                assignedByUserName = adminUser?.name || null;
              } catch (adminErr) {
                log(`Warning: Could not resolve admin user ${assignedByUserId}: ${adminErr.message}`);
              }
            }

            const nowIso = new Date().toISOString();
            const metadata = {
              sites_limit: plan.sites_limit ?? plan.sitesLimit ?? null,
              library_limit: plan.library_limit ?? plan.libraryLimit ?? null,
              storage_limit: plan.storage_limit ?? plan.storageLimit ?? null,
              assigned_by_user_id: assignedByUserId,
              assigned_by_user_name: assignedByUserName,
              assigned_at: nowIso
            };

            const subscriptionPayload = {
              user_id: userId,
              user_name: updates.name || json.name || null,
              user_email: updates.email || json.email || null,
              plan_id: plan.label || plan.name || null,
              plan_label: plan.label || null,
              plan_price_mode: null,
              plan_price: null,
              billing_start_date: null,
              billing_end_date: null,
              billing_never: true,
              stripe_subscription_id: null,
              stripe_customer_id: updates.stripe_customer_id || currentUser.prefs?.stripe_customer_id || null,
              metadata: JSON.stringify(metadata),
              status: 'active',
              updated_at: nowIso
            };

            log(`Calling upsertSubscriptionDoc with payload: ${JSON.stringify(subscriptionPayload)}`);
            await upsertSubscriptionDoc(subscriptionPayload);
            
            log(`Applied local plan "${plan.label}" to user ${userId}`);
          } else {
            log(`Warning: Plan does not have a label. Plan object: ${JSON.stringify(plan)}`);
            error(`Plan ${updates.localPlanId} does not have a label attribute`);
          }
        } else {
          // Remove local plan: check if Stripe subscription exists and restore current_plan_id from Stripe metadata
          let stripePlanLabel = null;
          let stripeProductId = null;
          
          let stripeSubscriptionId = null;
          try {
            // Try to fetch Stripe subscription and get its product label
            const accountDocs = await databases.listDocuments('platform_db', 'accounts', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
            if (accountDocs.documents.length > 0 && accountDocs.documents[0].stripe_customer_id) {
              const customerId = accountDocs.documents[0].stripe_customer_id;
              const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
              
              if (subscriptions.data.length > 0) {
                const subscription = subscriptions.data[0];
                stripeSubscriptionId = subscription.id;
                if (subscription.status !== 'canceled' && subscription.items.data.length > 0) {
                  const priceId = subscription.items.data[0].price.id;
                  const price = await stripe.prices.retrieve(priceId);
                  const product = await stripe.products.retrieve(price.product);
                  stripePlanLabel = product.metadata?.label || null;
                  stripeProductId = product.id;
                }
              }
            }
          } catch (err) {
            log(`Note: Could not fetch Stripe subscription for user ${userId}: ${err.message}`);
          }

          // Update accounts.current_plan_id
          await upsertAccountCurrentPlan(stripePlanLabel || null);

          const removalMetadata = stripePlanLabel ? { product_label: stripePlanLabel } : {};
          const removalPayload = {
            user_id: userId,
            user_name: updates.name || json.name || null,
            user_email: updates.email || json.email || null,
            plan_id: stripeProductId || null,
            plan_label: stripePlanLabel || null,
            plan_price_mode: null,
            plan_price: null,
            billing_start_date: null,
            billing_end_date: null,
            billing_never: true,
            stripe_subscription_id: stripeSubscriptionId || null,
            stripe_customer_id: updates.stripe_customer_id || currentUser.prefs?.stripe_customer_id || null,
            metadata: JSON.stringify(removalMetadata),
            status: 'active',
            updated_at: new Date().toISOString()
          };

          await upsertSubscriptionDoc(removalPayload);
          
          if (stripePlanLabel) {
            log(`Removed local plan and restored Stripe plan "${stripePlanLabel}" for user ${userId}`);
          } else {
            log(`Removed local plan from user ${userId}`);
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
        plan_price: updates.customPrice ? JSON.stringify({
          amount: updates.customPrice.amount || 0,
          currency: updates.customPrice.currency || 'usd',
          interval: updates.customPrice.interval || 'month'
        }) : null,
        billing_start_date: updates.billingStart === 'never' ? null : (updates.billingStart || null),
        billing_never: updates.billingStart === 'never' ? true : false,
        metadata: JSON.stringify(updates.customLimits || {}),
        status: updates.status ? (updates.status === 'Active' ? 'active' : 'inactive') : 'active',
        updated_at: new Date().toISOString()
      };

      await upsertSubscriptionDoc(subscriptionPayload);
    }

    log(`Updated user ${userId}`);
    return res.json({ success: true, user: json });
  } catch (err) {
    error(`Failed to update user: ${err.message}`);
    return res.json({ success: false, message: err.message || 'Failed to update user' }, 500);
  }
};

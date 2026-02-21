const sdk = require('node-appwrite');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  if (
    !process.env.APPWRITE_ENDPOINT ||
    !process.env.APPWRITE_PROJECT_ID ||
    !process.env.APPWRITE_API_KEY ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.DATABASE_ID ||
    !process.env.ACCOUNTS_COLLECTION_ID
  ) {
    error("Missing environment variables. Please check your function settings.");
    return res.json({ error: 'Internal Server Error: Missing configuration.' }, 500);
  }

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  try {
    const user = JSON.parse(req.env['APPWRITE_FUNCTION_EVENT_DATA']);

    if (!user.email) {
      console.log(`User ${user.$id} has no email, skipping Stripe customer creation.`);
      return res.json({ success: false, message: "User has no email." });
    }

    // 1. Create a Stripe Customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        appwrite_user_id: user.$id,
      },
    });

    // 2. Create a document in the accounts collection
    const accountData = {
      user_id: user.$id,
      stripe_customer_id: customer.id,
    };
    
    // 3. Set document permissions so only the user can read/update it
    const permissions = [
      sdk.Permission.read(sdk.Role.user(user.$id)),
      sdk.Permission.update(sdk.Role.user(user.$id)),
      // Admins can also manage this record
      sdk.Permission.read(sdk.Role.team('admin')),
      sdk.Permission.update(sdk.Role.team('admin')),
      sdk.Permission.delete(sdk.Role.team('admin')),
    ];

    await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.ACCOUNTS_COLLECTION_ID,
      sdk.ID.unique(),
      accountData,
      permissions
    );

    res.json({
      success: true,
      message: `Stripe customer created and account document created for user ${user.$id}.`,
      stripeCustomerId: customer.id,
    });
  } catch (err) {
    error("Failed to create stripe customer:", err);
    res.json({ error: err.message }, 500);
  }
};

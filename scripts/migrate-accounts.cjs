const sdk = require('node-appwrite');
const stripe = require('stripe');

// --- Environment Setup ---
// Looks for a .env file in the project root
require('dotenv').config();

const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    STRIPE_SECRET_KEY,
    DATABASE_ID,
    ACCOUNTS_COLLECTION_ID
} = process.env;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !STRIPE_SECRET_KEY || !DATABASE_ID || !ACCOUNTS_COLLECTION_ID) {
    console.error("❌ ERROR: Missing one or more required environment variables.");
    console.log("Please create a .env file in the project root with all required variables.");
    process.exit(1);
}

// --- Initialize SDKs ---
const appwriteClient = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const appwriteUsers = new sdk.Users(appwriteClient);
const appwriteDatabases = new sdk.Databases(appwriteClient);
const stripeClient = stripe(STRIPE_SECRET_KEY);

// --- Migration Logic ---
async function migrateExistingUsers() {
    console.log("🚀 Starting user migration to accounts collection...");

    try {
        let hasMoreUsers = true;
        let cursor = null; // For pagination

        while (hasMoreUsers) {
            // 1. Fetch a batch of users
            const queryOptions = [sdk.Query.limit(100)];
            if (cursor) {
                queryOptions.push(sdk.Query.cursorAfter(cursor));
            }

            const userList = await appwriteUsers.list(queryOptions);

            if (userList.users.length === 0) {
                hasMoreUsers = false;
                continue;
            }
            
            console.log(`Found ${userList.users.length} users in this batch. Processing...`);

            // 2. Process each user in the batch
            for (const user of userList.users) {
                // Check if user already has an account entry
                const existingAccounts = await appwriteDatabases.listDocuments(
                    DATABASE_ID,
                    ACCOUNTS_COLLECTION_ID,
                    [sdk.Query.equal('user_id', user.$id)]
                );

                if (existingAccounts.total > 0) {
                    console.log(`✅ User ${user.email} (${user.$id}) already has an account. Skipping.`);
                    continue;
                }
                
                if (!user.email) {
                    console.log(`⚠️ User ${user.$id} has no email. Cannot create Stripe customer. Skipping.`);
                    continue;
                }

                console.log(`- Processing migration for ${user.email} (${user.$id})...`);

                try {
                    // 3. Create Stripe Customer
                    const customer = await stripeClient.customers.create({
                        email: user.email,
                        name: user.name,
                        metadata: {
                            appwrite_user_id: user.$id,
                        },
                    });
                    console.log(`   - Created Stripe customer: ${customer.id}`);

                    // 4. Create document in 'accounts' collection
                    const accountData = {
                        user_id: user.$id,
                        stripe_customer_id: customer.id,
                    };

                    const permissions = [
                        sdk.Permission.read(sdk.Role.user(user.$id)),
                        sdk.Permission.update(sdk.Role.user(user.$id)),
                        sdk.Permission.read(sdk.Role.team('admin')),
                        sdk.Permission.update(sdk.Role.team('admin')),
                        sdk.Permission.delete(sdk.Role.team('admin')),
                    ];

                    await appwriteDatabases.createDocument(
                        DATABASE_ID,
                        ACCOUNTS_COLLECTION_ID,
                        sdk.ID.unique(),
                        accountData,
                        permissions
                    );
                    console.log(`   - Created account document for user ${user.$id}.`);

                } catch (innerError) {
                    console.error(`❌ FAILED to process user ${user.email}:`, innerError.message || innerError);
                }
            }

            // Update cursor for next batch
            if (userList.users.length < 100) {
                hasMoreUsers = false;
            } else {
                cursor = userList.users[userList.users.length - 1].$id;
            }
        }

        console.log("\n🎉 Migration script finished successfully!");

    } catch (error) {
        console.error("\n❌ An unexpected error occurred during migration:", error.message || error);
    }
}

migrateExistingUsers();

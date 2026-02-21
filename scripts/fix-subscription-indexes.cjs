const sdk = require('node-appwrite');
require('dotenv').config();

const client = new sdk.Client();
const databases = new sdk.Databases(client);

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY
} = process.env;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('❌ ERROR: Missing environment variables');
  console.log('Required: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
  process.exit(1);
}

client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

async function fixIndexes() {
  try {
    console.log('Deleting unique index on user_id...');
    await databases.deleteIndex('platform_db', 'subscriptions', 'user_id_index');
    console.log('✓ Deleted user_id_index');
    
    // Wait a bit for the deletion to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Creating non-unique index on user_id...');
    await databases.createIndex(
      'platform_db',
      'subscriptions',
      'user_id_index',
      'key',
      ['user_id'],
      ['ASC']
    );
    console.log('✓ Created non-unique user_id_index');
    
    console.log('Creating unique index on stripe_subscription_id...');
    await databases.createIndex(
      'platform_db',
      'subscriptions',
      'stripe_subscription_id_index',
      'unique',
      ['stripe_subscription_id'],
      ['ASC']
    );
    console.log('✓ Created unique stripe_subscription_id_index');
    
    console.log('\n✓ All indexes updated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixIndexes();

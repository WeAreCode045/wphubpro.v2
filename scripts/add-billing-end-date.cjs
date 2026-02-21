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

async function addBillingEndDateField() {
  try {
    console.log('Adding billing_end_date field to subscriptions collection...');
    
    await databases.createStringAttribute(
      'platform_db',
      'subscriptions',
      'billing_end_date',
      50,
      false, // required
      null, // default
      false // array
    );
    
    console.log('✓ Added billing_end_date field successfully!');
    console.log('Note: The field may take a few moments to become available.');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ billing_end_date field already exists');
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

addBillingEndDateField();

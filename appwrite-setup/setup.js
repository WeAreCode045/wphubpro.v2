
const sdk = require('node-appwrite');

// --- Configuration ---
// These values should be set in your environment variables.
const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
} = process.env;

const DATABASE_ID = 'platform_db';
const DATABASE_NAME = 'The Platform DB';

const COLLECTIONS = [
    {
        id: 'subscriptions',
        name: 'Subscriptions',
        permissions: [ sdk.Permission.create(sdk.Role.users()) ],
        attributes: [
            { key: 'user_id', type: 'string', size: 255, required: true },
            { key: 'stripe_customer_id', type: 'string', size: 255, required: true },
            { key: 'plan_id', type: 'string', size: 255, required: true },
            { key: 'status', type: 'string', size: 50, required: true },
            { key: 'sites_limit', type: 'integer', required: true },
            { key: 'storage_limit', type: 'integer', required: true },
            { key: 'library_limit', type: 'integer', required: true },
        ],
        indexes: [
            { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
        ]
    },
    {
        id: 'sites',
        name: 'Sites',
        permissions: [ sdk.Permission.create(sdk.Role.users()) ],
        attributes: [
            { key: 'user_id', type: 'string', size: 255, required: true },
            { key: 'site_url', type: 'string', size: 255, required: true },
            { key: 'site_name', type: 'string', size: 255, required: true },
            { key: 'wp_username', type: 'string', size: 255, required: true },
            { key: 'wp_app_password', type: 'string', size: 512, required: true }, // Encrypted
        ],
        indexes: [
             { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
        ]
    },
    {
        id: 'library',
        name: 'Library',
        permissions: [ sdk.Permission.create(sdk.Role.users()) ],
        attributes: [
            { key: 'user_id', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'type', type: 'string', size: 50, required: true }, // 'plugin' or 'theme'
            { key: 'source', type: 'string', size: 50, required: true }, // 'official' or 'local'
            { key: 'version', type: 'string', size: 50, required: true },
            { key: 'author', type: 'string', size: 255, required: false },
            { key: 'description', type: 'string', size: 10000, required: false },
            { key: 's3_path', type: 'string', size: 512, required: false },
            { key: 'wp_slug', type: 'string', size: 255, required: false },
        ],
        indexes: [
            { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'user_id_type_index', type: 'key', attributes: ['user_id', 'type'], orders: ['ASC', 'ASC'] },
        ]
    },
    {
        id: 'platform_settings',
        name: 'Platform Settings',
        // More restrictive permissions: only team members can manage settings.
        permissions: [
            sdk.Permission.read(sdk.Role.any()),
            sdk.Permission.create(sdk.Role.team('admin')),
            sdk.Permission.update(sdk.Role.team('admin')),
            sdk.Permission.delete(sdk.Role.team('admin')),
        ],
        attributes: [
            { key: 'key', type: 'string', size: 255, required: true },
            { key: 'value', type: 'string', size: 10000, required: true }, // JSON string
        ],
        indexes: [
            { key: 'key_index', type: 'unique', attributes: ['key'], orders: ['ASC'] },
        ]
    }
];

// --- Helper Functions ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main Execution ---
async function setupAppwrite() {
    console.log('--- Starting Appwrite Setup ---');

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        console.error('Error: Missing required environment variables (APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY).');
        process.exit(1);
    }

    try {
        const client = new sdk.Client()
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);

        const databases = new sdk.Databases(client);

        // 1. Create Database
        console.log(`\nChecking for database '${DATABASE_NAME}'...`);
        try {
            await databases.get(DATABASE_ID);
            console.log(`Database '${DATABASE_NAME}' already exists. Skipping creation.`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`Creating database '${DATABASE_NAME}'...`);
                await databases.create(DATABASE_ID, DATABASE_NAME);
                console.log(`Database '${DATABASE_NAME}' created successfully.`);
            } else { throw error; }
        }

        // 2. Create Collections, Attributes, and Indexes
        for (const collection of COLLECTIONS) {
            console.log(`\n--- Processing collection '${collection.name}' ---`);

            try {
                await databases.getCollection(DATABASE_ID, collection.id);
                console.log(`Collection '${collection.name}' already exists.`);
            } catch (error) {
                 if (error.code === 404) {
                    console.log(`Creating collection '${collection.name}'...`);
                    // NOTE: On document creation, you must provide specific permissions for the user, e.g., [Permission.read(Role.user('USER_ID'))]
                    await databases.createCollection(DATABASE_ID, collection.id, collection.name, collection.permissions);
                    console.log(`Collection '${collection.name}' created successfully.`);
                    await wait(500); // Appwrite needs a moment before we can add attributes
                } else { throw error; }
            }
            
            const { attributes: existingAttributes } = await databases.listAttributes(DATABASE_ID, collection.id);
            const existingAttrKeys = existingAttributes.map(attr => attr.key);
            for(const attr of collection.attributes) {
                if (existingAttrKeys.includes(attr.key)) {
                    console.log(`- Attribute '${attr.key}' already exists. Skipping.`);
                    continue;
                }
                console.log(`- Creating attribute '${attr.key}'...`);
                if (attr.type === 'string') {
                    await databases.createStringAttribute(DATABASE_ID, collection.id, attr.key, attr.size, attr.required, attr.default, attr.array);
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(DATABASE_ID, collection.id, attr.key, attr.required, attr.min, attr.max, attr.default, attr.array);
                }
                console.log(`- Attribute '${attr.key}' created.`);
                await wait(1000); // Wait for attribute to become available for indexing
            }
            
            const { indexes: existingIndexes } = await databases.listIndexes(DATABASE_ID, collection.id);
            const existingIndexKeys = existingIndexes.map(idx => idx.key);
            for(const index of collection.indexes || []) {
                if (existingIndexKeys.includes(index.key)) {
                    console.log(`- Index '${index.key}' already exists. Skipping.`);
                    continue;
                }
                console.log(`- Creating index '${index.key}'...`);
                await databases.createIndex(DATABASE_ID, collection.id, index.key, index.type, index.attributes, index.orders);
                console.log(`- Index '${index.key}' created.`);
            }
        }

        console.log('\n--- Appwrite Setup Completed Successfully! ---');
        console.log("Next steps: Remember to set document-level permissions when creating records for user data privacy.");

    } catch (error) {
        console.error('\n--- An error occurred during setup ---');
        console.error(error.message);
        if (error.response) console.error(JSON.stringify(error.response, null, 2));
        process.exit(1);
    }
}

setupAppwrite();

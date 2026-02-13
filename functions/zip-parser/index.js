
const { Client, Databases, ID } = require('node-appwrite');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const unzipper = require('unzipper');
const { Readable } = require('stream');

// --- Helper Functions ---
const parseMetadata = (content, type) => {
    const metadata = {};
    const lines = content.split('\n');
    const headerFields = type === 'plugin' ? {
        'Plugin Name': 'name',
        'Version': 'version',
        'Author': 'author',
        'Description': 'description',
    } : {
        'Theme Name': 'name',
        'Version': 'version',
        'Author': 'author',
        'Description': 'description',
    };

    for (const line of lines) {
        for (const [header, key] of Object.entries(headerFields)) {
            if (line.toLowerCase().startsWith(` * ${header.toLowerCase()}:`) || line.toLowerCase().startsWith(`${header.toLowerCase()}:`)) {
                metadata[key] = line.substring(line.indexOf(':') + 1).trim();
                break;
            }
        }
    }
    return metadata;
};


// --- Main Handler ---
module.exports = async (req, res) => {
    const {
        APPWRITE_FUNCTION_ENDPOINT,
        APPWRITE_FUNCTION_PROJECT_ID,
        APPWRITE_FUNCTION_API_KEY,
        APPWRITE_FUNCTION_USER_ID, // Securely get the user ID from the execution context
        S3_BUCKET,
        S3_REGION,
        S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY,
    } = req.variables;

    // 1. Initialize Clients
    const client = new Client()
        .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
        .setProject(APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(APPWRITE_FUNCTION_API_KEY);
    const databases = new Databases(client);

    const s3 = new S3Client({
        region: S3_REGION,
        credentials: {
            accessKeyId: S3_ACCESS_KEY_ID,
            secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
    });

    try {
        // 2. Validate Input
        const { type } = req.payload ? JSON.parse(req.payload) : {};
        const file = req.files?.file;
        const userId = APPWRITE_FUNCTION_USER_ID; // Use the secure user ID

        if (!userId) {
            return res.json({ success: false, message: 'Unauthorized. User must be authenticated.' }, 401);
        }
        if (!type || !file) {
            return res.json({ success: false, message: 'Missing type or file.' }, 400);
        }
        if (type !== 'plugin' && type !== 'theme') {
            return res.json({ success: false, message: 'Invalid type. Must be "plugin" or "theme".' }, 400);
        }

        // 3. Extract Metadata from Zip
        let extractedMeta = null;
        const fileStream = Readable.from(file.buffer);

        await new Promise((resolve, reject) => {
            fileStream.pipe(unzipper.Parse())
                .on('entry', async (entry) => {
                    const fileName = entry.path;
                    const isRootDirFile = !fileName.includes('/');

                    const isPluginFile = type === 'plugin' && isRootDirFile && fileName.endsWith('.php');
                    const isThemeFile = type === 'theme' && fileName === 'style.css';

                    if (isPluginFile || isThemeFile) {
                        const content = await entry.buffer().then(b => b.toString());
                        const meta = parseMetadata(content, type);
                        if (meta.name && meta.version) {
                            extractedMeta = meta;
                            entry.autodrain(); // We found what we need
                        } else {
                            entry.autodrain();
                        }
                    } else {
                        entry.autodrain();
                    }
                })
                .on('finish', resolve)
                .on('error', reject);
        });

        if (!extractedMeta) {
            return res.json({ success: false, message: 'Could not find valid metadata headers in the zip file.' }, 400);
        }
        
        // 4. Upload to S3
        const s3Path = `user/${userId}/${type}/${file.name}`;
        const putCommand = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Path,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await s3.send(putCommand);

        // 5. Create Database Document
        const libraryDocument = {
            userId,
            name: extractedMeta.name,
            type,
            source: 'local',
            version: extractedMeta.version || '0.0.0',
            author: extractedMeta.author || 'Unknown',
            description: extractedMeta.description || '',
            s3Path,
        };

        const createdDoc = await databases.createDocument(
            'platform_db',
            'library',
            ID.unique(),
            libraryDocument
        );

        res.json({ success: true, message: 'File processed successfully!', item: createdDoc });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'An internal server error occurred.', error: error.message }, 500);
    }
};
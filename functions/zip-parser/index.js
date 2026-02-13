const sdk = require('node-appwrite');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const unzipper = require('unzipper');
const stream = require('stream');

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
module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const storage = new sdk.Storage(client);

  const {
    APPWRITE_FUNCTION_ENDPOINT,
    APPWRITE_FUNCTION_PROJECT_ID,
    APPWRITE_FUNCTION_API_KEY,
    APPWRITE_FUNCTION_USER_ID,
    S3_BUCKET,
    S3_REGION,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY
  } = process.env;

  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    error('S3 environment variables are not set.');
    return res.json({ success: false, message: 'S3 environment is not configured.' }, 500);
  }

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    error('Appwrite environment variables are not set.');
    return res.json({ success: false, message: 'Appwrite environment is not configured.' }, 500);
  }

  client
    .setEndpoint(APPWRITE_FUNCTION_ENDPOINT)
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_FUNCTION_API_KEY);
  
  const s3 = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  });

  if (!APPWRITE_FUNCTION_USER_ID) {
    return res.json({ success: false, message: 'Unauthorized. User must be authenticated.' }, 401);
  }

  let payload;
  try {
    payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
  } catch (e) {
    error('Failed to parse payload.');
    return res.json({ success: false, message: 'Invalid request body. JSON expected.' }, 400);
  }

  const { fileId } = payload;
  if (!fileId) {
    return res.json({ success: false, message: 'Missing required field: fileId.' }, 400);
  }

  try {
    log(`Starting zip parse for Appwrite fileId: ${fileId}`);
    
    // 1. Download the file from Appwrite Storage
    const fileStream = await storage.getFileDownload('library', fileId);
    
    // 2. Unzip and Upload to S3
    const uploadedFiles = [];
    const parseStream = fileStream.pipe(unzipper.Parse({ forceStream: true }));

    for await (const entry of parseStream) {
      const { path, type } = entry;
      // We only care about files, not directories
      if (type === 'File') {
        const s3Key = `user/${APPWRITE_FUNCTION_USER_ID}/library/${fileId}/${path}`;
        
        // Use a pass-through stream to handle the data chunks
        const passThrough = new stream.PassThrough();
        entry.pipe(passThrough);

        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: passThrough,
        });

        await s3.send(command);
        log(`Uploaded ${path} to S3 at ${s3Key}`);
        uploadedFiles.push(s3Key);
      } else {
        entry.autodrain();
      }
    }
    
    log(`Successfully processed ${uploadedFiles.length} files from zip.`);

    return res.json({ 
      success: true, 
      message: 'Zip file parsed and contents uploaded to S3.',
      uploadedFiles 
    });

  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
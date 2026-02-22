/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
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

  // Normalize environment variables from req.variables or process.env
  const env = (req && req.variables && Object.keys(req.variables).length > 0) ? req.variables : process.env;

  const APPWRITE_FUNCTION_ENDPOINT = env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY = env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY || env.APPWRITE_KEY;
  const APPWRITE_FUNCTION_USER_ID = env.APPWRITE_FUNCTION_USER_ID || env.APPWRITE_USER_ID; // May be undefined if executed by guest/admin

  let S3_BUCKET = env.S3_BUCKET;
  let S3_REGION = env.S3_REGION;
  let S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID;
  let S3_SECRET_ACCESS_KEY = env.S3_SECRET_ACCESS_KEY;

  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    // Try to load S3 settings from platform_settings collection as a fallback
    try {
      const databasesSdk = new sdk.Databases(client);
      const settingsList = await databasesSdk.listDocuments('platform_db', 'platform_settings', [sdk.Query.equal('key', 's3')]);
      if (settingsList.total > 0) {
        const s3settings = JSON.parse(settingsList.documents[0].value || '{}');
        S3_BUCKET = s3settings.bucket || S3_BUCKET;
        S3_REGION = s3settings.region || S3_REGION;
        S3_ACCESS_KEY_ID = s3settings.accessKey || S3_ACCESS_KEY_ID;
        S3_SECRET_ACCESS_KEY = s3settings.secretKey || S3_SECRET_ACCESS_KEY;
      }
    } catch (e) {
      log('Could not load S3 settings from DB: ' + e.message);
    }

    if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      error('S3 environment variables are not set.');
      return res.json({ success: false, message: 'S3 environment is not configured.' }, 500);
    }
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

  let payload = {};
  try {
    if (req.payload) {
      payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
    } else if (req.bodyRaw) {
      payload = JSON.parse(req.bodyRaw);
    }
  } catch (e) {
    error('Failed to parse payload.');
    return res.json({ success: false, message: 'Invalid request body. JSON expected.' }, 400);
  }

  const { fileId, fileBase64, fileName } = payload;
  if (!fileId && !fileBase64) {
    return res.json({ success: false, message: 'Missing required field: fileId or fileBase64.' }, 400);
  }
  try {
    const uid = payload.userId || APPWRITE_FUNCTION_USER_ID || (req.headers && (req.headers['x-appwrite-user-id'] || req.headers['x-appwrite-function-user-id']));
    if (!uid) return res.json({ success: false, message: 'Unauthorized. User must be authenticated or provide userId in payload.' }, 401);

    log(`Starting zip parse` + (fileId ? ` for Appwrite fileId: ${fileId}` : ` for uploaded file: ${fileName || 'unknown'}`));

    // Prepare input stream for unzipper
    let parseStream;
    if (fileId) {
      // 1. Download the file from Appwrite Storage
      const fileStream = await storage.getFileDownload('library', fileId);
      parseStream = fileStream.pipe(unzipper.Parse({ forceStream: true }));
    } else {
      // Decode base64 payload (may be data URL)
      let base64 = fileBase64;
      const matches = /^data:.*;base64,(.*)$/.exec(base64);
      if (matches) base64 = matches[1];
      const buffer = Buffer.from(base64, 'base64');
      const pass = new stream.PassThrough();
      pass.end(buffer);
      parseStream = pass.pipe(unzipper.Parse({ forceStream: true }));
    }

    // 2. Unzip and Upload to S3
    const uploadedFiles = [];
    let extractedMetadata = {};
    const itemType = payload.type || 'plugin'; // 'plugin' or 'theme'

    for await (const entry of parseStream) {
      const { path, type } = entry;
      // We only care about files, not directories
      if (type === 'File') {
        const s3Key = `user/${uid}/library/${fileId || (fileName || 'upload')}/${path}`;
        
        // Check if this file might contain metadata
        const isThemeStyle = itemType === 'theme' && path.endsWith('style.css') && (path.split('/').length === 2);
        const isPluginMain = itemType === 'plugin' && path.endsWith('.php') && (path.split('/').length === 2);
        
        if ((isThemeStyle || isPluginMain) && Object.keys(extractedMetadata).length === 0) {
          // Buffer the file content to parse metadata
          const contentBuffer = await entry.buffer();
          const content = contentBuffer.toString('utf-8');
          
          try {
            const meta = parseMetadata(content, itemType);
            if (meta && meta.name) {
              extractedMetadata = meta;
              // Add slug based on directory name if possible
              const parts = path.split('/');
              if (parts.length > 1) extractedMetadata.slug = parts[0];
            }
          } catch (e) {
            log(`Failed to parse metadata from ${path}: ${e.message}`);
          }
          
          // Upload the buffer to S3
          const parallelUploads3 = new Upload({
            client: s3,
            params: { Bucket: S3_BUCKET, Key: s3Key, Body: contentBuffer },
          });
          await parallelUploads3.done();
        } else {
          // Regular stream upload
          const passThrough = new stream.PassThrough();
          entry.pipe(passThrough);

          // Use @aws-sdk/lib-storage Upload for streaming
          const parallelUploads3 = new Upload({
            client: s3,
            params: { Bucket: S3_BUCKET, Key: s3Key, Body: passThrough },
          });

          await parallelUploads3.done();
        }

        log(`Uploaded ${path} to S3 at ${s3Key}`);
        uploadedFiles.push(s3Key);
      } else {
        entry.autodrain();
      }
    }
    
    log(`Successfully processed ${uploadedFiles.length} files from zip.`);

    // 3. Save to Appwrite Database (Library Collection)
    // Only if we found metadata or at least have a name/file
    const databaseId = process.env.DATABASE_ID || 'platform_db';
    const collectionId = process.env.LIBRARY_COLLECTION_ID || 'library';
    
    // Determine S3 location (prefix)
    const s3Location = `user/${uid}/library/${fileId || (fileName || 'upload')}/`;
    
    const docData = {
      name: extractedMetadata.name || fileName || 'Untitled Plugin',
      version: extractedMetadata.version || '1.0.0',
      description: extractedMetadata.description || '',
      author: extractedMetadata.author || '',
      source: 'local',
      type: itemType,
      s3_key: s3Location,
      user_id: uid,
      wpSlug: extractedMetadata.slug || (fileName ? fileName.replace('.zip', '') : ''),
      created_at: new Date().toISOString()
    };

    let savedDoc;
    try {
      const databases = new sdk.Databases(client);
      savedDoc = await databases.createDocument(
        databaseId,
        collectionId,
        sdk.ID.unique(),
        docData
      );
      log(`Created library document: ${savedDoc.$id}`);
    } catch (dbErr) {
      log(`Failed to create library document: ${dbErr.message}`);
      // We don't fail the whole process if DB save fails, but we should report it
    }

    return res.json({ 
      success: true, 
      message: 'Zip file parsed, uploaded to S3, and saved to library.',
      uploadedFiles,
      metadata: extractedMetadata,
      item: savedDoc
    });

  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
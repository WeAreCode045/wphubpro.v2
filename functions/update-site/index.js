/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');
const crypto = require('crypto');

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

module.exports = async ({ req, res, log, error }) => {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  const env = (req && req.variables && Object.keys(req.variables).length) ? req.variables : process.env;
  const ENCRYPTION_KEY = env.ENCRYPTION_KEY;

  client
    .setEndpoint(env.APPWRITE_FUNCTION_ENDPOINT || env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_FUNCTION_PROJECT_ID || env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_FUNCTION_API_KEY || env.APPWRITE_API_KEY);

  let payloadObj = null;
  if (req) payloadObj = req.payload || req.body || null;
  if (typeof payloadObj === 'string') {
    try { payloadObj = JSON.parse(payloadObj); } catch (e) { /* skip */ }
  }

  log('update-site payload: ' + JSON.stringify(payloadObj));

  const siteIdFromQuery = (req.query && (req.query.siteId || req.query.site_id)) || null;
  const siteIdFromPayload = (payloadObj && (payloadObj.siteId || payloadObj.site_id)) || null;
  const updates = (req.query && req.query.updates) || (payloadObj && payloadObj.updates) || payloadObj;

  if (!updates) {
    return res.json({ success: false, message: 'Missing updates payload' }, 400);
  }

  // Allow either providing siteId or site_url to identify the site
  let siteId = siteIdFromQuery || siteIdFromPayload || null;
  const siteUrlRaw = updates.site_url || updates.siteUrl || updates.siteUrlRaw || null;

  const finalUpdates = {};
  
  // Map variants and respect empty values: allow clearing fields by passing empty strings
  const hasProp = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  let usernameRaw = null;
  if (hasProp(updates, 'username')) usernameRaw = updates.username;
  else if (hasProp(updates, 'user_login')) usernameRaw = updates.user_login;
  else if (hasProp(updates, 'userLogin')) usernameRaw = updates.userLogin;

  let siteNameRaw = null;
  if (hasProp(updates, 'siteName')) siteNameRaw = updates.siteName;
  else if (hasProp(updates, 'site_name')) siteNameRaw = updates.site_name;

  let siteUrlCandidate = siteUrlRaw;
  if (!siteUrlCandidate) {
    if (hasProp(updates, 'siteUrl')) siteUrlCandidate = updates.siteUrl;
    else if (hasProp(updates, 'site_url')) siteUrlCandidate = updates.site_url;
  }

  // If a password is supplied (Connect flow) — including empty string to clear — handle accordingly
  if (hasProp(updates, 'password')) {
    const rawPass = updates.password;
    // Allow disabling encryption via environment or explicit client flag (_disable_encryption)
    const disableEncEnv = env.DISABLE_ENCRYPTION === '1' || env.DISABLE_ENCRYPTION === 'true';
    const disableEncFlag = hasProp(updates, '_disable_encryption') && !!updates._disable_encryption;
    const disableEnc = disableEncEnv || disableEncFlag;
    if (rawPass === '' || rawPass === null) {
      // Explicitly clear password
      finalUpdates.password = '';
    } else if (disableEnc) {
      finalUpdates.password = rawPass;
    } else {
      if (!ENCRYPTION_KEY) {
        return res.json({ success: false, message: 'ENCRYPTION_KEY not configured' }, 500);
      }
      finalUpdates.password = encrypt(rawPass, ENCRYPTION_KEY);
    }
  }

  // If an api_key is supplied (Bridge plugin) — including empty string to clear — handle accordingly
  if (hasProp(updates, 'api_key') || hasProp(updates, 'apiKey')) {
    const rawKey = hasProp(updates, 'api_key') ? updates.api_key : updates.apiKey;
    const disableEncEnv = env.DISABLE_ENCRYPTION === '1' || env.DISABLE_ENCRYPTION === 'true';
    const disableEncFlag = hasProp(updates, '_disable_encryption') && !!updates._disable_encryption;
    const disableEnc = disableEncEnv || disableEncFlag;
    if (rawKey === '' || rawKey === null) {
      finalUpdates.api_key = '';
    } else if (disableEnc) {
      finalUpdates.api_key = rawKey;
    } else {
      if (!ENCRYPTION_KEY) {
        return res.json({ success: false, message: 'ENCRYPTION_KEY not configured' }, 500);
      }
      finalUpdates.api_key = encrypt(rawKey, ENCRYPTION_KEY);
    }
  }

  if (usernameRaw !== null) finalUpdates.username = usernameRaw;
  if (siteNameRaw !== null) finalUpdates.site_name = siteNameRaw;
  if (siteUrlCandidate !== null) finalUpdates.site_url = siteUrlCandidate;

  // If siteId wasn't provided, try to find the site by site_url or create it
  try {
    if (!siteId && siteUrlCandidate) {
      const decodedUrl = typeof siteUrlCandidate === 'string' ? decodeURIComponent(siteUrlCandidate) : siteUrlCandidate;
      log('Searching for site by URL: ' + decodedUrl);
      // Try to scope search to the current user if available
      const userId = (payloadObj && (payloadObj.userId || payloadObj.user_id)) || (updates && (updates.userId || updates.user_id)) || null;
      let list;
      try {
        if (userId) {
          list = await databases.listDocuments('platform_db', 'sites', [sdk.Query.equal('user_id', userId)]);
        } else {
          // Fallback: list all (not ideal for production)
          list = await databases.listDocuments('platform_db', 'sites', []);
        }
      } catch (e) {
        log('Error listing documents: ' + e.message);
        list = { total: 0, documents: [] };
      }

      // Normalize helper
      const normalize = (u) => {
        try { return String(u).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase(); } catch { return String(u); }
      };

      const target = normalize(decodedUrl);
      const found = (list && list.documents || []).find(d => normalize((d.site_url || d.siteUrl || '')) === target);
      if (found) {
        siteId = found.$id;
        log('Found existing site id by normalized URL: ' + siteId);
      } else {
        // create new site document with provided fields
        const createData = Object.assign({}, finalUpdates);
        if (!createData.site_url) createData.site_url = decodedUrl;
        const created = await databases.createDocument('platform_db', 'sites', sdk.ID.unique(), createData);
        log('Created new site: ' + JSON.stringify(created));
        return res.json({ success: true, document: created });
      }
    }
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }

  log('Updating site id: ' + siteId + ' with: ' + JSON.stringify(finalUpdates));

  try {
    // Guard: ensure we have updates to apply
    if (!siteId) {
      return res.json({ success: false, message: 'Missing siteId to update' }, 400);
    }

    if (!finalUpdates || Object.keys(finalUpdates).length === 0) {
      log('No updates provided to update-site for siteId: ' + siteId);
      return res.json({ success: false, message: 'No update fields provided' }, 400);
    }

    const updated = await databases.updateDocument('platform_db', 'sites', siteId, finalUpdates);
    return res.json({ success: true, document: updated });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
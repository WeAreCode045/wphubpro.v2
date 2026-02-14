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
  
  // Map variants: user_login -> username, site_url variants -> site_url
  const usernameRaw = updates.username || updates.user_login || updates.userLogin || null;
  const siteNameRaw = updates.siteName || updates.site_name || null;
  const siteUrlCandidate = siteUrlRaw || updates.siteUrl || updates.site_url || null;

  // If a password is supplied (Connect flow), encrypt before saving
  if (updates.password) {
    if (!ENCRYPTION_KEY) {
      return res.json({ success: false, message: 'ENCRYPTION_KEY not configured' }, 500);
    }
    finalUpdates.password = encrypt(updates.password, ENCRYPTION_KEY);
  }

  if (usernameRaw) finalUpdates.username = usernameRaw;
  if (siteNameRaw) finalUpdates.site_name = siteNameRaw;
  if (siteUrlCandidate) finalUpdates.site_url = siteUrlCandidate;

  // If siteId wasn't provided, try to find the site by site_url or create it
  try {
    if (!siteId && siteUrlCandidate) {
      const decodedUrl = typeof siteUrlCandidate === 'string' ? decodeURIComponent(siteUrlCandidate) : siteUrlCandidate;
      log('Searching for site by URL: ' + decodedUrl);
      const list = await databases.listDocuments('platform_db', 'sites', [sdk.Query.equal('site_url', decodedUrl)]);
      log('List result: ' + JSON.stringify(list));
      if (list && list.total > 0 && list.documents && list.documents.length > 0) {
        siteId = list.documents[0].$id;
        log('Found existing site id: ' + siteId);
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
    const updated = await databases.updateDocument('platform_db', 'sites', siteId, finalUpdates);
    return res.json({ success: true, document: updated });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
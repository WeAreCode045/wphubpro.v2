const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
    const client = new sdk.Client();
    const teams = new sdk.Teams(client);

    const {
        APPWRITE_ENDPOINT,
        APPWRITE_PROJECT_ID,
        APPWRITE_API_KEY
    } = process.env;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        error('Missing environment variables');
        return res.json({ error: 'Missing required environment variables' }, 500);
    }

    client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    try {
        let payload = {};
        
        if (req.body && typeof req.body === 'object') {
            payload = req.body;
        } else if (req.bodyRaw) {
            payload = JSON.parse(req.bodyRaw);
        } else if (req.payload) {
            payload = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
        }

        const { userId, isAdmin } = payload;
        
        if (!userId) {
            error('userId is required');
            return res.json({ error: 'userId is required' }, 400);
        }

        log('Managing admin team membership for user: ' + userId);
        log('Is Admin: ' + isAdmin);

        const teamId = 'admin';

        if (isAdmin) {
            // Add user to admin team
            try {
                await teams.createMembership(teamId, ['admin'], userId);
                log('Successfully added user ' + userId + ' to admin team');
                return res.json({ success: true, userId, isAdmin: true });
            } catch (err) {
                if (err.code === 409) {
                    // User already in team
                    log('User already in admin team');
                    return res.json({ success: true, userId, isAdmin: true });
                }
                throw err;
            }
        } else {
            // Remove user from admin team
            try {
                // Get all memberships for the admin team
                const memberships = await teams.listMemberships(teamId);
                
                // Find the membership for this user
                const userMembership = memberships.memberships.find(m => m.userId === userId);
                
                if (userMembership) {
                    await teams.deleteMembership(teamId, userMembership.$id);
                    log('Successfully removed user ' + userId + ' from admin team');
                } else {
                    log('User was not in admin team');
                }
                
                return res.json({ success: true, userId, isAdmin: false });
            } catch (err) {
                log('Note: Failed to remove from team - ' + err.message);
                // Don't fail if user isn't in team
                return res.json({ success: true, userId, isAdmin: false });
            }
        }

    } catch (err) {
        error('Failed to manage admin team membership:', err);
        return res.json({ 
            error: err.message || 'An unexpected error occurred',
            details: err.stack 
        }, 500);
    }
};

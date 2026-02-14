// Simple test runner for the update-site function (local, uses mock SDK)
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key';

const fn = require('./index.js');

const req = {
  // Simulate Appwrite passing the payload as a string
  payload: JSON.stringify({
    siteId: 'site123',
    updates: {
      user_login: 'Maurice',
      password: 'jwj0 0J4m OOow qplJ ciui JyTc',
      site_url: 'https://wp1.code045.nl'
    },
    userId: 'user123'
  }),
  query: {},
  variables: {}
};

const res = {
  json: (body, status) => {
    console.log('\n=== FUNCTION RESPONSE ===');
    console.log('status:', status || 200);
    console.log('body:', JSON.stringify(body, null, 2));
  }
};

const log = (...args) => console.log('[log]', ...args);
const error = (...args) => console.error('[error]', ...args);

fn({ req, res, log, error }).then(() => console.log('\nTest run finished')).catch(err => console.error(err));

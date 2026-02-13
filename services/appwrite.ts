
import { Client, Account, Databases, Functions, ID } from 'appwrite';

const APPWRITE_ENDPOINT = 'https://appwrite.code045.nl/v1';
const APPWRITE_PROJECT_ID = '698a55ce00010497b136';

const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export { ID };

// For local testing, you might want a fake session
const createAnonymousSession = async () => {
    try {
        await account.get();
    } catch (e) {
        if (e.code === 401) {
            await account.createAnonymousSession();
        }
    }
};

// Create a session when the app loads
createAnonymousSession();

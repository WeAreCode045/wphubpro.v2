
import { Client, Account, Databases, Functions, Storage, Teams, Avatars, ID } from 'appwrite';

/**
 * Appwrite Productie Configuratie
 * * Deze waarden worden ingeladen vanuit de Vite omgevingsvariabelen.
 * Zorg dat deze aanwezig zijn in je .env file in de root van het project.
 */
const APPWRITE_ENDPOINT = 'https://appwrite.wphub.pro/v1';
const APPWRITE_PROJECT_ID = '698a55ce00010497b136';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
    console.error("Appwrite configuratie ontbreekt. Controleer je .env bestand.");
}

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Initialiseer de services voor gebruik in de rest van de applicatie
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const avatars = new Avatars(client);

export { client, ID };

/**
 * Voorbeeld van het gebruik van een database ID (zoals gedefinieerd in je setup script)
 * Zie: wearecode045/wphubpro.v2/.../appwrite-setup/setup.js
 */
export const DATABASE_ID = 'platform_db';

/**
 * Collectie IDs conform je database schema
 *
 */
export const COLLECTIONS = {
    SITES: 'sites',
    LIBRARY: 'library',
    SETTINGS: 'platform_settings',
    PLANS: 'plans',
    ACCOUNTS: 'accounts'
};

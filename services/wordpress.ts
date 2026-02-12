
// This file will contain functions for interacting with the public WordPress.org API.

const API_BASE = 'https://api.wordpress.org/plugins/info/1.2/';

export const searchWpPlugins = async (searchTerm: string) => {
    if (!searchTerm) return [];

    const url = `${API_BASE}?action=query_plugins&request[search]=${encodeURIComponent(searchTerm)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`WordPress.org API returned status ${response.status}`);
        }
        const data = await response.json();
        return data.plugins || [];
    } catch (error) {
        console.error("Failed to search WordPress plugins:", error);
        throw error;
    }
};
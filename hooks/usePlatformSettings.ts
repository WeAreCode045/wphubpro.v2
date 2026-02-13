
import { useQuery } from '@tanstack/react-query';

// This is the shape of the data we expect from the 'platform_settings' collection
// for a document with key = 'branding'
const mockBrandingSettings = {
    colors: {
        primary: '240 5.9% 10%',
        primaryForeground: '0 0% 98%',
        secondary: '240 4.8% 95.9%',
        secondaryForeground: '240 5.9% 10%',
        card: '0 0% 100%',
        cardForeground: '240 5.9% 10%',
        popover: '0 0% 100%',
        popoverForeground: '240 5.9% 10%',
        border: '240 5.9% 90%',
        input: '240 5.9% 90%',
        ring: '240 5.9% 10%',
        background: '0 0% 100%',
        foreground: '240 5.9% 10%',
        muted: '240 4.8% 95.9%',
        mutedForeground: '240 3.8% 46.1%',
        accent: '240 4.8% 95.9%',
        accentForeground: '240 5.9% 10%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
    },
    font: {
        family: "'Inter', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    },
    logoUrl: '/vite.svg',
};

// This hook fetches platform-wide settings.
// In a real app, this would use the Appwrite SDK to get a document from the 'platform_settings' collection.
export const usePlatformSettings = () => {
    return useQuery({
        queryKey: ['platformSettings', 'branding'],
        queryFn: async () => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 150));
            // In a real app:
            // const doc = await databases.getDocument('platform_db', 'platform_settings', 'branding');
            // return JSON.parse(doc.value);
            return mockBrandingSettings;
        },
        staleTime: Infinity, // These settings rarely change, so we can cache them indefinitely.
    });
};

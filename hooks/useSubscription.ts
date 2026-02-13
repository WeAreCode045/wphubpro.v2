
import { useQuery } from '@tanstack/react-query';
import { useLibraryItems } from './useLibrary';
import { useSites } from './useSites';
import { useUser } from './useAuth';
import { databases } from '../services/appwrite';
import { Query } from 'appwrite';
import { Subscription } from '../types';

const DATABASE_ID = 'platform_db';
const SUBSCRIPTIONS_COLLECTION_ID = 'subscriptions';

export const useSubscription = () => {
    const { data: user } = useUser();
    return useQuery<Subscription | null, Error>({
        queryKey: ['subscription', user?.$id],
        queryFn: async () => {
            if (!user?.$id) return null;
            const response = await databases.listDocuments(
                DATABASE_ID,
                SUBSCRIPTIONS_COLLECTION_ID,
                [Query.equal('user_id', user.$id), Query.limit(1)]
            );
            
            if (response.documents.length > 0) {
                return response.documents[0] as unknown as Subscription;
            }
            
            // Return a default or mock subscription if none is found,
            // so the app doesn't break for new users.
            return {
                userId: user.$id,
                planId: 'Free Tier',
                status: 'active',
                sitesLimit: 1,
                storageLimit: 100, // in MB
                libraryLimit: 5,
            };
        },
        enabled: !!user,
    });
};


export const useUsage = () => {
    const { data: user } = useUser();
    const { data: libraryItems } = useLibraryItems();
    const { data: sites } = useSites();

    return useQuery({
        queryKey: ['usage', user?.$id, libraryItems, sites],
        queryFn: async () => {
            return {
                sitesUsed: sites?.length || 0,
                libraryUsed: libraryItems?.length || 0,
                storageUsed: 0, // In a real app, this would be calculated, e.g., from S3.
            };
        },
        enabled: !!user && libraryItems !== undefined && sites !== undefined,
    });
};

import { useQuery } from '@tanstack/react-query';
import { useLibraryItems } from './useLibrary';
import { useSites } from './useSites';
import { useAuth } from '../contexts/AuthContext';
import { functions } from '../services/appwrite';
import { Subscription } from '../types';

const GET_SUBSCRIPTION_FUNCTION_ID = 'stripe-get-subscription';

export const useSubscription = () => {
    const { user } = useAuth();
    return useQuery<Subscription | null, Error>({
        queryKey: ['subscription', user?.$id],
        queryFn: async () => {
            if (!user?.$id) return null;

            try {
                const execution = await functions.createExecution(
                    GET_SUBSCRIPTION_FUNCTION_ID,
                    '', // No body needed
                    false // isAsync
                );

                if (execution.responseStatusCode >= 400) {
                    const errorBody = JSON.parse(execution.responseBody);
                    throw new Error(errorBody.error || 'Failed to fetch subscription.');
                }
                
                const responseBody = execution.responseBody ? JSON.parse(execution.responseBody) : null;
                
                // If the function returns null (no subscription found), we pass that along.
                if (responseBody === null) {
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
                }

                // The function is designed to return data in the `Subscription` format.
                return responseBody as Subscription;

            } catch (e) {
                // If the execution fails (e.g., function not found, network error), rethrow.
                throw new Error(`An error occurred while fetching subscription: ${e.message}`);
            }
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};


export const useUsage = () => {
    const { user } = useAuth();
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

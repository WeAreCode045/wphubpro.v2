
import { useQuery } from '@tanstack/react-query';
import { useLibraryItems } from './useLibrary';
import { useSites } from './useSites';
import { useAuth } from '../contexts/AuthContext';
import { functions, databases } from '../services/appwrite';
import { Subscription } from '../types';
import { DATABASE_ID, COLLECTIONS } from '../services/appwrite';
import { Query } from 'appwrite';

const GET_SUBSCRIPTION_FUNCTION_ID = 'stripe-get-subscription';

export const useSubscription = () => {
    const { user } = useAuth();
    return useQuery<Subscription | null, Error>({
        queryKey: ['subscription', user?.$id],
        queryFn: async () => {
            if (!user?.$id) return null;

            // Check for labels that indicate a subscription (exclude 'admin' label)
            const subscriptionLabel = user.labels?.find(l => 
                l.toLowerCase() !== 'admin'
            );

            // User has no subscription label (Stripe price or local plan), use default limits
            if (!subscriptionLabel) {
                // Fetch free plan limits from platform settings
                try {
                    const settingsDocs = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTIONS.SETTINGS,
                        [Query.equal('category', 'freePlanLimits')]
                    );

                    if (settingsDocs.documents.length > 0) {
                        const settings = settingsDocs.documents[0].settings;
                        return {
                            userId: user.$id,
                            planId: 'FREE',
                            status: 'active',
                            sitesLimit: parseInt(settings.sitesLimit || '1', 10),
                            libraryLimit: parseInt(settings.libraryLimit || '5', 10),
                            storageLimit: parseInt(settings.storageLimit || '100', 10),
                            source: 'free',
                        } as Subscription;
                    }
                } catch (e) {
                    console.error('Failed to fetch free plan limits:', e);
                }

                // Fallback to default free limits
                return {
                    userId: user.$id,
                    planId: 'FREE',
                    status: 'active',
                    sitesLimit: 1,
                    libraryLimit: 5,
                    storageLimit: 10,
                    source: 'free',
                } as Subscription;
            }

            // User has a subscription label, check if it's a local plan
            let stripeSubscription: Subscription | null = null;
            let isLocalPlan = false;
            
            // First, try to find if this label matches a local plan
            try {
                const localPlanDocs = await databases.listDocuments(
                    DATABASE_ID,
                    'local_plans',
                    [Query.equal('label', subscriptionLabel)]
                );

                if (localPlanDocs.documents.length > 0) {
                    const plan = localPlanDocs.documents[0];
                    isLocalPlan = true;
                    return {
                        userId: user.$id,
                        planId: plan.name || 'LOCAL',
                        status: 'active',
                        sitesLimit: plan.sites_limit || 1,
                        libraryLimit: plan.library_limit || 5,
                        storageLimit: plan.storage_limit || 10,
                        source: 'local',
                    } as Subscription;
                }
            } catch (e) {
                console.error('Failed to search for local plan:', e);
            }

            // If not a local plan, assume it's a Stripe subscription label (product metadata label)
            if (!isLocalPlan) {
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
                    
                    // Store the Stripe subscription (might be null or canceled)
                    stripeSubscription = responseBody as Subscription;

                } catch (e) {
                    console.error('Failed to fetch Stripe subscription:', e);
                    // Don't throw here, continue
                }

                // Return Stripe subscription if it exists and is not canceled
                if (stripeSubscription && stripeSubscription.status !== 'canceled') {
                    return {
                        ...stripeSubscription,
                        source: 'stripe',
                    };
                }
            }

            // If we reach here with a label but no valid subscription found, use default limits
            try {
                const settingsDocs = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.SETTINGS,
                    [Query.equal('category', 'freePlanLimits')]
                );

                if (settingsDocs.documents.length > 0) {
                    const settings = settingsDocs.documents[0].settings;
                    return {
                        userId: user.$id,
                        planId: 'FREE',
                        status: 'active',
                        sitesLimit: parseInt(settings.sitesLimit || '1', 10),
                        libraryLimit: parseInt(settings.libraryLimit || '5', 10),
                        storageLimit: parseInt(settings.storageLimit || '100', 10),
                        source: 'free',
                    } as Subscription;
                }
            } catch (e) {
                console.error('Failed to fetch default limits:', e);
            }

            // Fallback to absolute defaults
            return {
                userId: user.$id,
                planId: 'FREE',
                status: 'active',
                sitesLimit: 1,
                libraryLimit: 5,
                storageLimit: 10,
                source: 'free',
            } as Subscription;
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

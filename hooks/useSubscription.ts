
import { useQuery } from '@tanstack/react-query';
import { useLibraryItems } from './useLibrary';
import { useSites } from './useSites';
import { useAuth } from '../contexts/AuthContext';
import { functions, databases } from '../services/appwrite';
import { Subscription, UsageMetrics } from '../types';
import { DATABASE_ID, COLLECTIONS } from '../services/appwrite';
import { Query } from 'appwrite';

const GET_SUBSCRIPTION_FUNCTION_ID = 'stripe-get-subscription';

export const useSubscription = () => {
    const { user } = useAuth();
    return useQuery<Subscription | null, Error>({
        queryKey: ['subscription', user?.$id],
        queryFn: async () => {
            if (!user?.$id) return null;

            // First, check the accounts table for current_plan_id
            let currentPlanId: string | null = null;
            let stripeCustomerId: string | null = null;
            
            try {
                const accountDocs = await databases.listDocuments(
                    DATABASE_ID,
                    'accounts',
                    [Query.equal('user_id', user.$id), Query.limit(1)]
                );
                
                if (accountDocs.documents.length > 0) {
                    currentPlanId = accountDocs.documents[0].current_plan_id || null;
                    stripeCustomerId = accountDocs.documents[0].stripe_customer_id || null;
                }
            } catch (e) {
                console.error('Failed to fetch accounts data:', e);
            }

            // If user has a current_plan_id, check if it's a local plan first
            if (currentPlanId) {
                try {
                    const localPlanDocs = await databases.listDocuments(
                        DATABASE_ID,
                        'local_plans',
                        [Query.equal('label', currentPlanId)]
                    );

                    if (localPlanDocs.documents.length > 0) {
                        const plan = localPlanDocs.documents[0];
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

                // If not a local plan and user has Stripe customer ID, assume it's a Stripe product label
                if (stripeCustomerId) {
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
                        
                        // Return Stripe subscription if it exists and is not canceled
                        if (responseBody && responseBody.status !== 'canceled') {
                            return {
                                ...responseBody,
                                source: 'stripe',
                            };
                        }
                    } catch (e) {
                        console.error('Failed to fetch Stripe subscription:', e);
                    }
                }
            }

            // Fallback: Check for labels (for backwards compatibility)
            const subscriptionLabel = user.labels?.find(l => 
                l.toLowerCase() !== 'admin'
            );

            if (subscriptionLabel) {
                // Check if label matches a local plan
                try {
                    const localPlanDocs = await databases.listDocuments(
                        DATABASE_ID,
                        'local_plans',
                        [Query.equal('label', subscriptionLabel)]
                    );

                    if (localPlanDocs.documents.length > 0) {
                        const plan = localPlanDocs.documents[0];
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
                    console.error('Failed to search for local plan by label:', e);
                }

                // If not local plan, try fetching Stripe subscription
                if (stripeCustomerId) {
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
                        
                        if (responseBody && responseBody.status !== 'canceled') {
                            return {
                                ...responseBody,
                                source: 'stripe',
                            };
                        }
                    } catch (e) {
                        console.error('Failed to fetch Stripe subscription from label:', e);
                    }
                }
            }

            // No subscription found, return free tier
            try {
                const settingsDocs = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.SETTINGS,
                    [Query.equal('key', 'freePlanLimits')]
                );

                if (settingsDocs.documents.length > 0) {
                    const settings = JSON.parse(settingsDocs.documents[0].value as string);
                    return {
                        userId: user.$id,
                        planId: 'FREE',
                        status: 'active',
                        sitesLimit: parseInt(settings.sitesLimit || '1', 10),
                        libraryLimit: parseInt(settings.libraryLimit || '5', 10),
                        storageLimit: parseInt(settings.storageLimit || '10', 10),
                        source: 'free-tier',
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
                source: 'free-tier',
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

    return useQuery<UsageMetrics, Error>({
        queryKey: ['usage', user?.$id, libraryItems, sites],
        queryFn: async () => {
            // Count local library items as storage uploads
            const localUploads = libraryItems?.filter(item => item.source === 'local') || [];

            return {
                sitesUsed: sites?.length || 0,
                libraryUsed: libraryItems?.length || 0,
                storageUsed: localUploads.length, 
            };
        },
        enabled: !!user && libraryItems !== undefined && sites !== undefined,
    });
};

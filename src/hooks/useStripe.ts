import { useMutation, useQuery } from '@tanstack/react-query';
import { redirectToBillingPortal } from '../services/stripe';
import { useToast } from '../contexts/ToastContext';
import { functions } from '../services/appwrite';
import { StripeInvoice, StripePlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

const STRIPE_LIST_PRODUCTS_FUNCTION_ID = 'stripe-list-products';
const STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID = 'stripe-create-checkout-session';
const STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID = 'stripe-cancel-subscription';

const LIST_INVOICES_FUNCTION_ID = 'stripe-list-invoices';

export const useManageSubscription = () => {
    const { toast } = useToast();

    return useMutation<void, Error>({
        mutationFn: redirectToBillingPortal,
        onError: (error) => {
            toast({
                title: 'Redirection Failed',
                description: error.message || 'Could not redirect to the billing portal.',
                variant: 'destructive',
            });
        }
    });
};


export const useInvoices = () => {
    const { user } = useAuth();
    return useQuery<StripeInvoice[], Error>({
        queryKey: ['invoices', user?.$id],
        queryFn: async () => {
            if (!user) return [];
            const result = await functions.createExecution(LIST_INVOICES_FUNCTION_ID);
            // FIX: The Appwrite Execution model uses `responseStatusCode`.
            if (result.responseStatusCode >= 400) {
                // FIX: The Appwrite Execution model uses `responseBody`.
                throw new Error(JSON.parse(result.responseBody).message || 'Failed to fetch invoices.');
            }
            // FIX: The Appwrite Execution model uses `responseBody`.
            return JSON.parse(result.responseBody).invoices;
        },
        enabled: !!user,
    });
};

export const useStripePlans = () => {
  const { user } = useAuth();
  return useQuery<StripePlan[], Error>({
    queryKey: ['stripePlans'],
    queryFn: async () => {
      const execution = await functions.createExecution(
        STRIPE_LIST_PRODUCTS_FUNCTION_ID,
        '', // No body needed
        false // Not async
      );
      if (execution.responseStatusCode >= 400) {
        throw new Error(JSON.parse(execution.responseBody).error || 'Failed to fetch plans.');
      }
      const response = JSON.parse(execution.responseBody);
      return response.plans || []; // Extract the 'plans' array and fallback to an empty array
    },
    enabled: !!user, // Only fetch if the user is logged in
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useCreateCheckoutSession = () => {
    const { toast } = useToast();
    return useMutation<{ sessionId: string, url: string }, Error, { priceId: string }>({
        mutationFn: async ({ priceId }) => {
            // Get current origin for dynamic redirect URLs
            const returnUrl = window.location.origin;
            
            const execution = await functions.createExecution(
                STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID,
                JSON.stringify({ priceId, returnUrl }),
                false // Not async
            );

            console.log('Stripe checkout execution:', {
                statusCode: execution.responseStatusCode,
                body: execution.responseBody
            });

            if (execution.responseStatusCode >= 400) {
                let errorMessage = 'Failed to create checkout session.';
                try {
                    const errorData = JSON.parse(execution.responseBody);
                    errorMessage = errorData.error || errorMessage;
                } catch {
                    errorMessage = execution.responseBody || errorMessage;
                }
                throw new Error(errorMessage);
            }

            if (!execution.responseBody) {
                throw new Error('Function returned empty response. Check function logs in Appwrite Console.');
            }

            try {
                return JSON.parse(execution.responseBody);
            } catch {
                console.error('Failed to parse response:', execution.responseBody);
                throw new Error(`Invalid response from server: ${execution.responseBody}`);
            }
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Could not initiate subscription: ${error.message}`,
                variant: "destructive",
            });
        },
    });
};

export const useCancelSubscription = () => {
    const { toast } = useToast();
    return useMutation<{ success: boolean }, Error, void>({
        mutationFn: async () => {
            const execution = await functions.createExecution(
                STRIPE_CANCEL_SUBSCRIPTION_FUNCTION_ID,
                '',
                false
            );

            if (execution.responseStatusCode >= 400) {
                const errorData = JSON.parse(execution.responseBody);
                throw new Error(errorData.error || 'Failed to cancel subscription.');
            }

            return JSON.parse(execution.responseBody);
        },
        onSuccess: () => {
            toast({
                title: "Subscription Cancelled",
                description: "Your subscription will be cancelled at the end of the billing period.",
                variant: "default",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Could not cancel subscription: ${error.message}`,
                variant: "destructive",
            });
        },
    });
};
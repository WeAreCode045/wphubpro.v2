import { useMutation, useQuery } from '@tanstack/react-query';
import { redirectToBillingPortal } from '../services/stripe';
import { useToast } from '../contexts/ToastContext';
import { functions } from '../services/appwrite';
import { StripeInvoice } from '../types';
import { useAuth } from '../contexts/AuthContext';

const STRIPE_LIST_PRODUCTS_FUNCTION_ID = 'stripe-list-products';
const STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID = 'stripe-create-checkout-session';

interface StripePlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  priceId: string;
  features: string[];
}

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
            const execution = await functions.createExecution(
                STRIPE_CREATE_CHECKOUT_SESSION_FUNCTION_ID,
                JSON.stringify({ priceId }),
                false // Not async
            );

            if (execution.responseStatusCode >= 400) {
                 throw new Error(JSON.parse(execution.responseBody).error || 'Failed to create checkout session.');
            }
            return JSON.parse(execution.responseBody);
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
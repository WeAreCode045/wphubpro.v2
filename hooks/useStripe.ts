import { useMutation, useQuery } from '@tanstack/react-query';
import { redirectToBillingPortal } from '../services/stripe';
import { useToast } from '../contexts/ToastContext';
import { functions } from '../services/appwrite';
import { StripeInvoice } from '../types';
import { useAuth } from '../contexts/AuthContext';

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
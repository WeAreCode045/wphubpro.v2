
import { useMutation } from '@tanstack/react-query';
import { redirectToBillingPortal } from '../services/stripe';
import { useToast } from '../contexts/ToastContext';

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

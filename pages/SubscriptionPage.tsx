import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSubscription, useUsage } from '../hooks/useSubscription';
import { Loader2, AlertCircle, CreditCard, XCircle, ArrowRight } from 'lucide-react';
import { useManageSubscription, useStripePlans, useCreateCheckoutSession, useCancelSubscription } from '../hooks/useStripe';
import InvoiceList from '../components/subscription/InvoiceList';
import PlanCard from '../components/subscription/PlanCard';
import SubscriptionSuccessPage from './SubscriptionSuccessPage';
import PlanChangeConfirmationModal from '../components/subscription/PlanChangeConfirmationModal';

type BillingInterval = 'monthly' | 'yearly';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    targetPriceId: string;
    targetPlanName: string;
    type: 'upgrade' | 'downgrade';
  }>({
    isOpen: false,
    targetPriceId: '',
    targetPlanName: '',
    type: 'upgrade'
  });

  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();
  const { data: plans, isLoading: isLoadingPlans, isError: isErrorPlans } = useStripePlans();
  const { mutate: createSession, isPending: isSessionLoading } = useCreateCheckoutSession();

  // If success param is present, show success page
  if (searchParams.get('success') === 'true') {
    return <SubscriptionSuccessPage />;
  }

  const handlePlanSelect = (priceId: string) => {
    const selectedPlan = plans?.find(p => p.monthlyPriceId === priceId || p.yearlyPriceId === priceId);
    if (!selectedPlan) return;

    let type: 'upgrade' | 'downgrade' = 'upgrade';

    // Determine upgrade vs downgrade based on price comparison
    if (subscription && subscription.priceId) {
        // Find current plan details
        const currentPlan = plans?.find(p => p.monthlyPriceId === subscription.priceId || p.yearlyPriceId === subscription.priceId);
        
        // Use price ID to lookup amount. 
        // Note: plans array has monthlyPrice/yearlyPrice amounts.
        // We assume we can map priceId -> amount.
        const getPriceAmount = (pid: string) => {
            const p = plans?.find(pl => pl.monthlyPriceId === pid || pl.yearlyPriceId === pid);
            if (!p) return 0;
            return p.monthlyPriceId === pid ? p.monthlyPrice : p.yearlyPrice;
        };

        const currentAmount = getPriceAmount(subscription.priceId);
        const selectedAmount = getPriceAmount(priceId);

        // Normalize to monthly cost for fair comparison if intervals differ
        // Or strictly compare absolute value? Usually monthly equivalent is best for "value" comparison.
        // Let's use monthly equivalent.
        const getMonthlyEquivalent = (pid: string, isCurrentSub = false) => {
             // Try finding in plans list first
             const p = plans?.find(pl => pl.monthlyPriceId === pid || pl.yearlyPriceId === pid);
             if (p) {
                 return p.monthlyPriceId === pid ? p.monthlyPrice : (p.yearlyPrice / 12);
             }
             
             // If not in plans list but is current subscription, use subscription data
             if (isCurrentSub && subscription && subscription.priceAmount !== undefined) {
                 // subscription.priceAmount is in cents, plans list uses units (usually). 
                 // Wait, useStripePlans usually returns units.
                 // We should check if priceAmount is cents. Stripe API returns cents.
                 // Plans array likely has dollars/euros (units).
                 // Let's assume plans are units. subscription.priceAmount is cents.
                 let amount = subscription.priceAmount / 100;
                 
                 let divisor = 1;
                 if (subscription.interval === 'year') divisor = 12;
                 if (subscription.interval === 'month') divisor = 1;
                 divisor = divisor * (subscription.intervalCount || 1);
                 return amount / divisor;
             }
             
             return 0;
        };

        const currentMonthly = getMonthlyEquivalent(subscription.priceId, true);
        const selectedMonthly = getMonthlyEquivalent(priceId, false);

        if (currentMonthly > 0 && selectedMonthly < currentMonthly) {
            type = 'downgrade';
        }
    }

    setConfirmationModal({
      isOpen: true,
      targetPriceId: priceId,
      targetPlanName: selectedPlan.name,
      type
    });
  };

  const handleConfirmChange = (priceId: string, type: 'upgrade' | 'downgrade') => {
    createSession({ priceId, updateType: type }, {
      onSuccess: (data) => {
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
        if (data.url) {
          window.location.href = data.url;
        } else if (data.subscriptionId) {
          // In-place update successful
          navigate(`/subscription?success=true&plan_id=${priceId}`);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {subscription?.source === 'free-tier' || !subscription ? 'Choose Your Plan' : 'Change Your Plan'}
        </h1>
        <Button variant="outline" onClick={() => navigate('/subscription')}>
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          Back to Subscription
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            {subscription?.source === 'free-tier' || !subscription
              ? 'Select a plan to get started and unlock premium features.'
              : 'Upgrade or downgrade your subscription to better fit your needs.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Billing Interval Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === 'monthly'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === 'yearly'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          
          {isLoadingPlans && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {isErrorPlans && (
            <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <p>Failed to load plans. Please refresh the page or contact support if the issue persists.</p>
            </div>
          )}
          
          {!isLoadingPlans && !isErrorPlans && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(plans || []).map((plan) => {
                const isCurrent = (billingInterval === 'monthly' && plan.monthlyPriceId === subscription?.priceId) ||
                                 (billingInterval === 'yearly' && plan.yearlyPriceId === subscription?.priceId);
                
                return (
                  <PlanCard 
                    key={plan.id} 
                    plan={plan}
                    billingInterval={billingInterval}
                    onSubscribe={handlePlanSelect} 
                    isLoading={isSessionLoading}
                    isCurrent={isCurrent}
                    currentUsage={usage}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <PlanChangeConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={() => handleConfirmChange(confirmationModal.targetPriceId, confirmationModal.type)}
          targetPriceId={confirmationModal.targetPriceId}
          targetPlanName={confirmationModal.targetPlanName}
          type={confirmationModal.type}
        />
      )}
    </div>
  );
};

export default SubscriptionPage;

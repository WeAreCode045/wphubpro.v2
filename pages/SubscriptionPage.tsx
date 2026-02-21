import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSubscription } from '../hooks/useSubscription';
import { Loader2, AlertCircle, CreditCard, XCircle, ArrowRight } from 'lucide-react';
import { useManageSubscription, useStripePlans, useCreateCheckoutSession, useCancelSubscription } from '../hooks/useStripe';
import InvoiceList from '../components/subscription/InvoiceList';
import PlanCard from '../components/subscription/PlanCard';
import Modal from '../components/ui/Modal';

type BillingInterval = 'monthly' | 'yearly';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const { data: subscription } = useSubscription();
  const { data: plans, isLoading: isLoadingPlans, isError: isErrorPlans } = useStripePlans();
  const createCheckoutSession = useCreateCheckoutSession();

  const handleSubscribe = (priceId: string) => {
    createCheckoutSession.mutate({ priceId }, {
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
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
                    onSubscribe={handleSubscribe} 
                    isLoading={createCheckoutSession.isPending}
                    isCurrent={isCurrent}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPage;

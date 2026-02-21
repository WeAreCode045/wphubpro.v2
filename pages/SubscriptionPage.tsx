import React, { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSubscription } from '../hooks/useSubscription';
import { Loader2, AlertCircle, CreditCard, XCircle } from 'lucide-react';
import { useManageSubscription, useStripePlans, useCreateCheckoutSession, useCancelSubscription } from '../hooks/useStripe';
import InvoiceList from '../components/subscription/InvoiceList';
import PlanCard from '../components/subscription/PlanCard';
import Modal from '../components/ui/Modal';

type BillingInterval = 'monthly' | 'yearly';

const SubscriptionPage: React.FC = () => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeSection, setShowUpgradeSection] = useState(false);
  const { data: subscription, isLoading, isError, error, refetch } = useSubscription();
  const manageSubscriptionMutation = useManageSubscription();
  const { data: plans, isLoading: isLoadingPlans, isError: isErrorPlans } = useStripePlans();
  const createCheckoutSession = useCreateCheckoutSession();
  const cancelSubscription = useCancelSubscription();


  const handleManage = () => {
    manageSubscriptionMutation.mutate();
  };

  const handleSubscribe = (priceId: string) => {
    createCheckoutSession.mutate({ priceId }, {
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
        }
      },
    });
  };

  const handleCancelConfirm = () => {
    cancelSubscription.mutate(undefined, {
      onSuccess: () => {
        setShowCancelModal(false);
        refetch();
      },
    });
  };

  // Show plan selection for users without subscription or with free tier
  const shouldShowPlanSelection = !subscription || subscription.source === 'free-tier';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscription</h1>
      
      {shouldShowPlanSelection && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>Select a plan to get started and unlock premium features.</CardDescription>
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
            {isLoadingPlans && <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
            {isErrorPlans && (
              <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>Failed to load plans. Please refresh the page or contact support if the issue persists.</p>
              </div>
            )}
            {!isLoadingPlans && !isErrorPlans && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(plans || []).map((plan) => (
                  <PlanCard 
                    key={plan.id} 
                    plan={plan}
                    billingInterval={billingInterval}
                    onSubscribe={handleSubscribe} 
                    isLoading={createCheckoutSession.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {subscription && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Plan</CardTitle>
              {subscription.source === 'free-tier' && (
                <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    Free Tier
                  </span>
                  Upgrade to unlock more features
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {isError && (
                <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <p>{error?.message || 'Failed to load subscription details.'}</p>
                </div>
              )}

              {subscription && (
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-semibold text-foreground">{subscription.planId}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-semibold capitalize ${subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {subscription.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Site Limit</span>
                    <span className="font-semibold text-foreground">{subscription.sitesLimit === 9999 ? 'Unlimited' : subscription.sitesLimit}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Library Limit</span>
                    <span className="font-semibold text-foreground">{subscription.libraryLimit === 9999 ? 'Unlimited' : subscription.libraryLimit}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Upload Limit</span>
                    <span className="font-semibold text-foreground">{subscription.storageLimit === 9999 ? 'Unlimited' : subscription.storageLimit}</span>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    {subscription.source === 'stripe' && (
                      <>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => setShowUpgradeSection(!showUpgradeSection)}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {showUpgradeSection ? 'Hide Plans' : 'Change Plan'}
                        </Button>
                        
                        <Button 
                          className="w-full" 
                          onClick={handleManage}
                          disabled={manageSubscriptionMutation.isPending}
                        >
                          {manageSubscriptionMutation.isPending ? (
                              <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Redirecting...
                              </>
                          ) : (
                              'Manage Billing in Stripe'
                          )}
                        </Button>
                        
                        {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                          <Button 
                            className="w-full" 
                            variant="destructive"
                            onClick={() => setShowCancelModal(true)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Subscription
                          </Button>
                        )}
                        
                        {subscription.cancelAtPeriodEnd && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              Your subscription will be cancelled at the end of the current billing period.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {subscription.source === 'local' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                          Admin-Assigned Plan
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          This plan was assigned to you by an administrator. Contact support for any changes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
              <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>View and download your past invoices.</CardDescription>
              </CardHeader>
              <CardContent>
                  <InvoiceList />
              </CardContent>
          </Card>
        </div>
      )}
      
      {subscription && showUpgradeSection && (
        <Card>
          <CardHeader>
            <CardTitle>{subscription.source === 'free-tier' ? 'Choose Your Plan' : 'Available Plans'}</CardTitle>
            <CardDescription>
              {subscription.source === 'free-tier' 
                ? 'Upgrade to a premium plan to unlock more features and higher limits.' 
                : 'Upgrade or downgrade your subscription to better fit your needs.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            
            {isLoadingPlans && <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
            {isErrorPlans && (
              <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>Failed to load plans. Please refresh the page or contact support if the issue persists.</p>
              </div>
            )}
            {!isLoadingPlans && !isErrorPlans && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {(plans || []).map((plan) => (
                  <PlanCard 
                    key={plan.id} 
                    plan={plan}
                    billingInterval={billingInterval}
                    onSubscribe={handleSubscribe} 
                    isLoading={createCheckoutSession.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={cancelSubscription.isPending}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionPage;

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useSubscription } from '../hooks/useSubscription';
import { useStripePlans } from '../hooks/useStripe';
import confetti from 'canvas-confetti';

const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: subscription, isLoading: isSubLoading, refetch } = useSubscription();
  const { data: plans } = useStripePlans();

  const planId = searchParams.get('plan_id'); // If passed from in-place update
  
  // Find the plan details either from query param or from updated subscription
  const currentPlan = plans?.find(p => 
    p.monthlyPriceId === (planId || subscription?.priceId) || 
    p.yearlyPriceId === (planId || subscription?.priceId)
  );
  
  useEffect(() => {
    // Refetch subscription to ensure we have latest data
    refetch();
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, [refetch]);

  if (isSubLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="max-w-md w-full border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Subscription Updated!</CardTitle>
          <CardDescription>
            Your plan has been successfully changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
              Current Plan Details
            </h3>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Plan Name</span>
              <span className="text-sm font-bold text-primary">
                {currentPlan?.name || subscription?.planId || 'Premium Plan'}
              </span>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 capitalize">
                {subscription?.status || 'Active'}
              </span>
            </div>

            {subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Renewal</span>
                <span className="text-sm">
                  {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <p>Your new limits are active immediately. You can now access all features included in your plan.</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p>A prorated invoice (if applicable) has been generated for this change.</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')} size="lg" className="w-full">
              Go to Dashboard
            </Button>
            <Button onClick={() => navigate('/subscription')} variant="ghost" size="sm" className="w-full">
              View Subscription Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccessPage;

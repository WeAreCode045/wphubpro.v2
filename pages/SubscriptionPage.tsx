
import React from 'react';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useSubscription } from '../hooks/useSubscription';
import { Loader2, AlertCircle } from 'lucide-react';
import { useManageSubscription } from '../hooks/useStripe';
import InvoiceList from '../components/subscription/InvoiceList';

const SubscriptionPage: React.FC = () => {
  const { data: subscription, isLoading, isError, error } = useSubscription();
  const manageSubscriptionMutation = useManageSubscription();

  const handleManage = () => {
    manageSubscriptionMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscription</h1>
      
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Plan</CardTitle>
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
                  <span className="font-semibold text-foreground">{subscription.sitesLimit}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Library Limit</span>
                  <span className="font-semibold text-foreground">{subscription.libraryLimit}</span>
                </div>
                 <Button 
                  className="w-full mt-6" 
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
    </div>
  );
};

export default SubscriptionPage;

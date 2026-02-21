
import React from 'react';
import { Globe, Library, Gem, DollarSign, PlusCircle, Loader2 } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import UsageGauge from '../components/dashboard/UsageGauge';
import Button from '../components/ui/Button';
import { useSubscription, useUsage } from '../hooks/useSubscription';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { useSites } from '../hooks/useSites';
import { Link } from 'react-router-dom';


const DashboardPage: React.FC = () => {
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { data: sites, isLoading: isLoadingSites } = useSites();
  // Usage hook depends on sites, so it will refetch when sites data is available
  const { data: usage, isLoading: isLoadingUsage } = useUsage();

  const isLoading = isLoadingSubscription || isLoadingSites || isLoadingUsage;

  const { data: details } = usePlatformSettings('details');

  const WelcomeEmptyState = () => (
    <Card className="lg:col-span-2">
      <CardContent className="p-8 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-secondary rounded-full">
            <Globe className="w-10 h-10 text-primary" />
        </div>
        <h3 className="mt-4 text-xl font-semibold">Welcome to {details?.name || 'The Platform'}</h3>
        <p className="mt-1 text-muted-foreground">{details?.subtitle || 'Get started by connecting your first WordPress site.'}</p>
        <Button asChild className="mt-6">
          <Link to="/sites">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Your First Site
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>
      
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sites" value={isLoadingSites ? '...' : `${sites?.length || 0}`} icon={Globe} />
        <StatCard title="Library Items" value={isLoadingUsage ? '...' : `${usage?.libraryUsed || 0}`} icon={Library} />
        <StatCard title="Subscription" value={isLoadingSubscription ? '...' : subscription?.planId || 'N/A'} icon={Gem} />
        <StatCard title="Monthly Revenue" value="$1,250" icon={DollarSign} change="+12.5%" changeType="increase" />
      </div>

      {/* Usage and Subscription Overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        {isLoading ? (
          <Card className="lg:col-span-2 flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </Card>
        ) : sites && sites.length === 0 ? (
          <WelcomeEmptyState />
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>Your current usage based on your subscription plan.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
              <UsageGauge label="Sites Used" used={usage?.sitesUsed || 0} limit={subscription?.sitesLimit || 0} unit="" />
              <UsageGauge label="Library Items" used={usage?.libraryUsed || 0} limit={subscription?.libraryLimit || 0} unit="" />
            </CardContent>
          </Card>
        )}
        
        <Card>
            <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              {isLoadingSubscription ? (
                 <div className="flex items-center justify-center flex-grow">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                 </div>
              ) : (
                <>
                  <div className="space-y-4 flex-grow">
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                          <p className="font-semibold text-foreground">{subscription?.planId}</p>
                      </div>
                       <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <p className={`font-semibold capitalize ${subscription?.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {subscription?.status}
                          </p>
                      </div>
                      {subscription?.source === 'stripe' && subscription?.currentPeriodEnd && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                            <p className="font-semibold text-foreground">
                              {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                        </div>
                      )}
                      <div>
                          <p className="text-sm font-medium text-muted-foreground mb-4">Plan Limits</p>
                          <div className="grid grid-cols-3 gap-3">
                            <UsageGauge 
                              label="Sites" 
                              used={usage?.sitesUsed || 0} 
                              limit={subscription?.sitesLimit || 0} 
                            />
                            <UsageGauge 
                              label="Library" 
                              used={usage?.libraryUsed || 0} 
                              limit={subscription?.libraryLimit || 0} 
                            />
                            <UsageGauge 
                              label="Uploads" 
                              used={usage?.storageUsed || 0} 
                              limit={subscription?.storageLimit || 0} 
                            />
                          </div>
                      </div>
                  </div>
                  <Button className="mt-6 w-full">Manage Subscription</Button>
                </>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
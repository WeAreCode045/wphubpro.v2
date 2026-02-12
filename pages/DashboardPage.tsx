
import React from 'react';
import { Globe, Library, Gem, DollarSign } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import UsageGauge from '../components/dashboard/UsageGauge';
import Button from '../components/ui/Button';

// Mock data, to be replaced with data from TanStack Query hooks
const mockSubscription = {
  planId: 'Pro Plan',
  status: 'active',
  sitesLimit: 10,
  libraryLimit: 50,
};

const mockUsage = {
  sitesUsed: 3,
  libraryUsed: 12,
};

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>
      
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sites" value="3" icon={Globe} change="+1" changeType="increase" />
        <StatCard title="Library Items" value="12" icon={Library} change="+5" changeType="increase" />
        <StatCard title="Subscription" value="Pro Plan" icon={Gem} />
        <StatCard title="Monthly Revenue" value="$1,250" icon={DollarSign} change="+12.5%" changeType="increase" />
      </div>

      {/* Usage and Subscription Overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Your current usage based on your subscription plan.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
            <UsageGauge label="Sites Used" used={mockUsage.sitesUsed} limit={mockSubscription.sitesLimit} unit="" />
            <UsageGauge label="Library Items" used={mockUsage.libraryUsed} limit={mockSubscription.libraryLimit} unit="" />
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
                <div className="space-y-4 flex-grow">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                        <p className="font-semibold text-foreground">{mockSubscription.planId}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className={`font-semibold capitalize ${mockSubscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {mockSubscription.status}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                        <p className="font-semibold text-foreground">October 25, 2024</p>
                    </div>
                </div>
                <Button className="mt-6 w-full">Manage Subscription</Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

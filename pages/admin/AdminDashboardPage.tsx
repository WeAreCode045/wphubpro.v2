import React from 'react';
import { 
  Users, 
  CreditCard, 
  Package, 
  TrendingUp, 
  Activity, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

const AdminDashboardPage: React.FC = () => {
  // Placeholder data - in a real app, this would come from a useAdminDashboard hook
  const stats = [
    { title: 'Total Users', value: '1,284', icon: Users, change: '+12%', changeType: 'increase' },
    { title: 'Active Subscriptions', value: '842', icon: CreditCard, change: '+5.2%', changeType: 'increase' },
    { title: 'MRR', value: '$12,450', icon: DollarSign, change: '+18.4%', changeType: 'increase' },
    { title: 'Churn Rate', value: '2.4%', icon: Activity, change: '-0.5%', changeType: 'decrease' },
  ];

  const recentOrders = [
    { id: 'ORD-7281', customer: 'John Doe', plan: 'Pro Monthly', amount: '$29.00', status: 'Paid', date: '2 mins ago' },
    { id: 'ORD-7280', customer: 'Sarah Smith', plan: 'Business Yearly', amount: '$490.00', status: 'Paid', date: '1 hour ago' },
    { id: 'ORD-7279', customer: 'Mike Johnson', plan: 'Starter Monthly', amount: '$12.00', status: 'Paid', date: '3 hours ago' },
    { id: 'ORD-7278', customer: 'Alex Wilson', plan: 'Pro Monthly', amount: '$29.00', status: 'Failed', date: '5 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your platform performance and subscriptions.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard 
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            changeType={stat.changeType as 'increase' | 'decrease'}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest transactions across the platform.</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{order.id}</td>
                    <td className="py-3 px-4">{order.customer}</td>
                    <td className="py-3 px-4">{order.plan}</td>
                    <td className="py-3 px-4 font-semibold">{order.amount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Active subscriptions by plan type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Business Yearly', value: 45, color: 'bg-primary' },
              { label: 'Pro Monthly', value: 32, color: 'bg-blue-500' },
              { label: 'Starter Monthly', value: 18, color: 'bg-orange-500' },
              { label: 'Free Trial', value: 5, color: 'bg-muted' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color}`} 
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

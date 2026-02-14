import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { functions } from '../../services/appwrite';
import { 
  Search, 
  Download, 
  ExternalLink,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const OrdersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: orders = [], isLoading, isError, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const result = await functions.createExecution('stripe-list-payment-intents');
      if (result.responseStatusCode >= 400) {
        throw new Error(JSON.parse(result.responseBody).message || 'Failed to fetch orders.');
      }
      return JSON.parse(result.responseBody).orders;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Succeeded': return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'Failed': return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case 'Pending': return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default: return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Succeeded': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Failed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription Orders</h1>
          <p className="text-muted-foreground mt-1">View and manage all Stripe transactions and invoices.</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by order ID or customer..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-sm">Order ID</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Customer</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Plan</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Amount</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-4 px-4 font-semibold text-sm">Date</th>
                <th className="text-right py-4 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={7}>Error: {error.message}</td></tr>
              ) : (
                orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                  <td className="py-4 px-4">
                    <div className="font-mono text-xs text-primary font-bold">{order.id}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-foreground text-sm">{order.customer}</div>
                      <div className="text-xs text-muted-foreground">{order.email}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm">{order.plan}</span>
                  </td>
                  <td className="py-4 px-4 font-bold text-sm">
                    {order.amount}
                  </td>
                  <td className="py-4 px-4">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border w-fit ${getStatusStyles(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-muted-foreground">
                    {order.date}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Download Invoice">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View in Stripe">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;

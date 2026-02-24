import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { functions } from "../../services/appwrite.ts";
import {
  Search,
  Download,
  ExternalLink,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Card, { CardHeader, CardContent } from "../../components/ui/Card.tsx";
import Table from "../../components/ui/Table.tsx";
import Button from "../../components/ui/Button.tsx";
import Input from "../../components/ui/Input.tsx";
import Select from "../../components/ui/Select.tsx";

const OrdersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        const result = await functions.createExecution(
          "stripe-list-payment-intents",
        );
        if (result.responseStatusCode >= 400) {
          const errorData = JSON.parse(result.responseBody);
          throw new Error(errorData.message || "Failed to fetch orders.");
        }
        const data = JSON.parse(result.responseBody);
        return data.orders || [];
      } catch (err: any) {
        console.error("Error fetching orders:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "succeeded":
      case "paid":
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "failed":
        return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case "pending":
      case "processing":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "succeeded":
      case "paid":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pending":
      case "processing":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-secondary text-muted-foreground border-border";
    }
  };

  const filteredOrders = orders.filter((order: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id?.toLowerCase().includes(query) ||
      order.customer?.toLowerCase().includes(query) ||
      order.email?.toLowerCase().includes(query)
    );
  });

  const visibleOrders = filteredOrders.filter((order: any) => {
    if (statusFilter === "all") return true;
    return order.status?.toLowerCase() === statusFilter;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Subscription Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all Stripe transactions and invoices.
          </p>
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
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="max-w-[160px]"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="succeeded">Succeeded</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
              </Select>
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error?.message || "Failed to load orders"}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>No orders found</p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Order ID
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Customer
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Plan
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Amount
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">
                    Date
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors group"
                  >
                    <td className="py-4 px-4">
                      <div className="font-mono text-xs text-primary font-bold">
                        {order.id}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-foreground text-sm">
                          {order.customer}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm">{order.plan}</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-sm">
                      {order.amount}
                    </td>
                    <td className="py-4 px-4">
                      <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border w-fit ${getStatusStyles(order.status)}`}
                      >
                        {getStatusIcon(order.status)}
                        {order.status}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-muted-foreground">
                      {order.date}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Download Invoice"
                          onClick={() => {
                            const url = order.invoice?.invoice_pdf || order.invoice?.hosted_invoice_url;
                            if (url) window.open(url, '_blank');
                            else alert('No invoice PDF available for this transaction.');
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View in Stripe"
                          onClick={() => {
                            // open Stripe dashboard link for the charge/payment intent
                            const pi = order.raw;
                            const dashboardUrl = pi && pi.charges && pi.charges.data && pi.charges.data[0] && pi.charges.data[0].id
                              ? `https://dashboard.stripe.com/payments/${pi.charges.data[0].id}`
                              : null;
                            if (dashboardUrl) window.open(dashboardUrl, '_blank');
                            else alert('Unable to open Stripe dashboard for this transaction.');
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { functions, databases, DATABASE_ID } from "../services/appwrite";
import { useAuth } from "../contexts/AuthContext";
import { Query } from "appwrite";
import {
  Download,
  ExternalLink,
  CreditCard,
  Calendar,
  User,
  Package,
  FileText,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Database,
  Folder,
  Globe,
} from "lucide-react";
import Card, { CardHeader, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Tabs from "../components/ui/Tabs";

const UserSubscriptionDetailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const waitForExecutionResponse = async (
    executionId: string,
    functionId: string,
  ) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const execution = await functions.getExecution(functionId, executionId);
      const body = execution.responseBody;
      if (body && typeof body === "string" && body.trim() !== "") {
        return execution;
      }
      if (execution.status === "completed" || execution.status === "failed") {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return null;
  };

  const {
    data: subscriptionId,
    isLoading: isLoadingSubscription,
  } = useQuery({
    queryKey: ["user-subscription-id", user?.$id],
    queryFn: async () => {
      if (!user?.$id) throw new Error("Not authenticated");

      // Get subscription ID from subscriptions collection
      const response = await databases.listDocuments(
        DATABASE_ID,
        "subscriptions",
        [Query.equal("user_id", user.$id), Query.limit(1)],
      );

      if (response.documents.length === 0) {
        throw new Error("No subscription found");
      }

      return response.documents[0].stripe_subscription_id;
    },
    enabled: !!user?.$id,
  });

  const {
    data: details,
    isLoading: isLoadingDetails,
    isError,
    error,
  } = useQuery({
    queryKey: ["subscription-details", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) throw new Error("No subscription ID");

      const functionId = "stripe-get-subscription-details";
      const result = await functions.createExecution(
        functionId,
        JSON.stringify({ subscriptionId }),
        false,
      );

      let finalResult = result;
      let body = result.responseBody;

      if (!body || typeof body !== "string" || body.trim() === "") {
        const execution = await waitForExecutionResponse(
          result.$id,
          functionId,
        );
        if (execution) {
          finalResult = execution;
          body = execution.responseBody;
        }
      }

      if (!body || typeof body !== "string" || body.trim() === "") {
        throw new Error(
          `No response from server. Status: ${finalResult.responseStatusCode || "n/a"}.`,
        );
      }

      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Invalid JSON response from server.");
      }

      if (finalResult.responseStatusCode >= 400) {
        throw new Error(parsed?.error || "Failed to fetch subscription details.");
      }

      return parsed;
    },
    enabled: !!subscriptionId,
    staleTime: 1000 * 60,
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      canceled: "bg-red-500/10 text-red-500 border-red-500/20",
      incomplete: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      past_due: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      unpaid: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
      <span
        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${statusColors[status] || "bg-gray-500/10 text-gray-500 border-gray-500/20"}`}
      >
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    
    setActionLoading('cancel');
    try {
      const result = await functions.createExecution(
        'stripe-cancel-subscription',
        JSON.stringify({ subscriptionId: subscription.id }),
        false
      );
      
      if (result.responseStatusCode >= 400) {
        throw new Error('Failed to cancel subscription');
      }
      
      alert('Subscription canceled successfully');
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayInvoice = async (invoiceId: string, hostedUrl: string) => {
    // Open Stripe hosted invoice page for payment
    window.open(hostedUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Subscription Details
        </h1>
        <Card className="bg-destructive/5 border-destructive">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive mb-4">
              {error?.message || "No active subscription found"}
            </p>
            <Button onClick={() => navigate("/subscription")}>
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) return null;

  const { subscription, customer, plan, invoices, upcoming_invoice, payment_method } = details;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            My Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your subscription and billing details
          </p>
        </div>
        {getStatusBadge(subscription.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Current Plan</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Plan</label>
              <p className="font-medium text-lg">{plan.product_name || "—"}</p>
              {plan.product_description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.product_description}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Price</label>
              <p className="font-medium text-lg">
                {plan.unit_amount
                  ? formatCurrency(plan.unit_amount, plan.currency || "usd")
                  : "—"}
                {plan.interval && (
                  <span className="text-sm text-muted-foreground ml-2">
                    / {plan.interval_count > 1 ? `${plan.interval_count} ` : ""}
                    {plan.interval}
                    {plan.interval_count > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Billing Cycle */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Billing Cycle</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Current Period</label>
              <p className="font-medium">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </p>
            </div>
            {subscription.trial_end && (
              <div>
                <label className="text-sm text-muted-foreground">Trial Ends</label>
                <p className="font-medium">{formatDate(subscription.trial_end)}</p>
              </div>
            )}
            {subscription.cancel_at && (
              <div>
                <label className="text-sm text-muted-foreground">Scheduled Cancellation</label>
                <p className="font-medium text-orange-500">{formatDate(subscription.cancel_at)}</p>
              </div>
            )}
            {subscription.canceled_at && (
              <div>
                <label className="text-sm text-muted-foreground">Canceled At</label>
                <p className="font-medium text-red-500">{formatDate(subscription.canceled_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        {payment_method && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Payment Method</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Type</label>
                <p className="font-medium capitalize">{payment_method.type}</p>
              </div>
              {payment_method.card && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">Card</label>
                    <p className="font-medium">
                      {payment_method.card.brand.toUpperCase()} •••• {payment_method.card.last4}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Expiration</label>
                    <p className="font-medium">
                      {payment_method.card.exp_month}/{payment_method.card.exp_year}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Invoice */}
        {upcoming_invoice && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Next Payment</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Amount Due</label>
                <p className="font-medium text-lg">
                  {formatCurrency(upcoming_invoice.amount_due, upcoming_invoice.currency)}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Due Date</label>
                <p className="font-medium">
                  {upcoming_invoice.next_payment_attempt
                    ? formatDate(upcoming_invoice.next_payment_attempt)
                    : formatDate(upcoming_invoice.period_end)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Invoice History</h2>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices found</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">
                        Invoice #{invoice.number || invoice.id.slice(-8)}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          invoice.paid
                            ? "bg-green-500/10 text-green-500"
                            : invoice.status === "open"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {invoice.paid ? "Paid" : invoice.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{formatDate(invoice.created)}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(invoice.amount_due, invoice.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invoice.hosted_invoice_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    )}
                    {invoice.invoice_pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.invoice_pdf, "_blank")}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSubscriptionDetailPage;

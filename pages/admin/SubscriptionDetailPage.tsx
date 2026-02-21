import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { functions } from "../../services/appwrite";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  CreditCard,
  Calendar,
  User,
  Package,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Card, { CardHeader, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const SubscriptionDetailPage: React.FC = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const navigate = useNavigate();

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
    data: details,
    isLoading,
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
        <Button variant="outline" onClick={() => navigate("/admin/subscriptions")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subscriptions
        </Button>
        <Card className="bg-destructive/5 border-destructive">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">
              {error?.message || "Failed to load subscription details"}
            </p>
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/subscriptions")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Subscription Details
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {subscription.id}
            </p>
          </div>
        </div>
        {getStatusBadge(subscription.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Customer Details</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Name</label>
              <p className="font-medium">{customer.name || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">{customer.email || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Phone</label>
              <p className="font-medium">{customer.phone || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Customer ID</label>
              <p className="font-mono text-sm">{customer.id}</p>
            </div>
            {customer.balance !== 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Balance</label>
                <p className={`font-medium ${customer.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(customer.balance, customer.currency || 'usd')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Plan Details</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Product</label>
              <p className="font-medium">{plan.product_name || "—"}</p>
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
            <div>
              <label className="text-sm text-muted-foreground">Product ID</label>
              <p className="font-mono text-sm">{plan.product_id || "—"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Price ID</label>
              <p className="font-mono text-sm">{plan.price_id || "—"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Subscription Timeline</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Created</label>
              <p className="font-medium">{formatDate(subscription.created)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Start Date</label>
              <p className="font-medium">{formatDate(subscription.start_date)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Current Period Start</label>
              <p className="font-medium">{formatDate(subscription.current_period_start)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Current Period End</label>
              <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
            </div>
            {subscription.trial_start && subscription.trial_end && (
              <div>
                <label className="text-sm text-muted-foreground">Trial Period</label>
                <p className="font-medium">
                  {formatDate(subscription.trial_start)} - {formatDate(subscription.trial_end)}
                </p>
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
            {subscription.ended_at && (
              <div>
                <label className="text-sm text-muted-foreground">Ended At</label>
                <p className="font-medium">{formatDate(subscription.ended_at)}</p>
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
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Upcoming Invoice</h2>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Amount Due</label>
                <p className="font-medium text-lg">
                  {formatCurrency(upcoming_invoice.amount_due, upcoming_invoice.currency)}
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Period Start</label>
                <p className="font-medium">{formatDate(upcoming_invoice.period_start)}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Period End</label>
                <p className="font-medium">{formatDate(upcoming_invoice.period_end)}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Next Payment Attempt</label>
                <p className="font-medium">
                  {upcoming_invoice.next_payment_attempt
                    ? formatDate(upcoming_invoice.next_payment_attempt)
                    : "—"}
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
            <h2 className="text-xl font-semibold">Invoices ({invoices.length})</h2>
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
                        Invoice #{invoice.number || invoice.id}
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
                      {invoice.period_start && invoice.period_end && (
                        <>
                          <span>•</span>
                          <span>
                            {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                          </span>
                        </>
                      )}
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

export default SubscriptionDetailPage;

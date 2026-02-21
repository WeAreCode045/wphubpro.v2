import React, { useState } from "react";
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
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Database,
  Folder,
  Globe,
} from "lucide-react";
import Card, { CardHeader, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";

const SubscriptionDetailPage: React.FC = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
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

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    
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

  // Build timeline events
  const timelineEvents = [
    {
      label: 'Subscription Created',
      date: subscription.created,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-green-500',
    },
    subscription.trial_start && {
      label: 'Trial Started',
      date: subscription.trial_start,
      icon: <Clock className="w-4 h-4" />,
      color: 'text-blue-500',
    },
    subscription.trial_end && {
      label: 'Trial Ended',
      date: subscription.trial_end,
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-blue-500',
    },
    subscription.canceled_at && {
      label: 'Canceled',
      date: subscription.canceled_at,
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-red-500',
    },
    subscription.cancel_at && !subscription.canceled_at && {
      label: 'Scheduled Cancellation',
      date: subscription.cancel_at,
      icon: <Clock className="w-4 h-4" />,
      color: 'text-orange-500',
    },
    subscription.ended_at && {
      label: 'Subscription Ended',
      date: subscription.ended_at,
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-red-500',
    },
  ].filter(Boolean) as Array<{ label: string; date: number; icon: React.ReactNode; color: string }>;

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Top Row: Plan Details + Customer Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Plan Details</h2>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Plan Name</label>
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

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <label className="block">Product ID</label>
                <p className="font-mono truncate">{plan.product_id || "—"}</p>
              </div>
              <div>
                <label className="block">Price ID</label>
                <p className="font-mono truncate">{plan.price_id || "—"}</p>
              </div>
            </div>

            {/* Plan Limits */}
            {plan.limits && (plan.limits.sites_limit || plan.limits.library_limit || plan.limits.storage_limit) && (
              <div className="pt-3 border-t border-border">
                <label className="text-sm text-muted-foreground mb-2 block">Plan Limits</label>
                <div className="space-y-2">
                  {plan.limits.sites_limit && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-primary" />
                      <span>
                        <span className="font-medium">{plan.limits.sites_limit}</span> Sites
                      </span>
                    </div>
                  )}
                  {plan.limits.library_limit && (
                    <div className="flex items-center gap-2 text-sm">
                      <Folder className="w-4 h-4 text-primary" />
                      <span>
                        <span className="font-medium">{plan.limits.library_limit}</span> Library Items
                      </span>
                    </div>
                  )}
                  {plan.limits.storage_limit && (
                    <div className="flex items-center gap-2 text-sm">
                      <Database className="w-4 h-4 text-primary" />
                      <span>
                        <span className="font-medium">{plan.limits.storage_limit}</span> GB Storage
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Admin Action Buttons */}
            {subscription.status === 'active' && !subscription.cancel_at && (
              <div className="pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={handleCancelSubscription}
                  disabled={actionLoading === 'cancel'}
                >
                  {actionLoading === 'cancel' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Canceling...</>
                  ) : (
                    <><XCircle className="w-4 h-4 mr-2" /> Cancel Subscription</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Details */}
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
            {customer.phone && (
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <p className="font-medium">{customer.phone}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground">Customer ID</label>
              <p className="font-mono text-xs break-all">{customer.id}</p>
            </div>
            {customer.address && (
              <div>
                <label className="text-sm text-muted-foreground">Address</label>
                <p className="font-medium text-sm">
                  {customer.address.line1}
                  {customer.address.line2 && `, ${customer.address.line2}`}
                  <br />
                  {customer.address.city}, {customer.address.state} {customer.address.postal_code}
                  <br />
                  {customer.address.country}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground">Customer Since</label>
              <p className="font-medium">
                {customer.created ? formatDate(customer.created) : "—"}
              </p>
            </div>
            {customer.balance !== 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Account Balance</label>
                <p className={`font-medium ${customer.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(customer.balance, customer.currency || 'usd')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Tabs (left) + Timeline (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabs Container - 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="billing">
                <Tabs.List>
                  <Tabs.Trigger value="billing">Billing & Payment</Tabs.Trigger>
                  <Tabs.Trigger value="invoices">Invoice History</Tabs.Trigger>
                </Tabs.List>

                {/* Billing & Payment Tab */}
                <Tabs.Content value="billing">
                  <div className="space-y-6">
                    {/* Billing Cycle */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Billing Cycle</h3>
                      </div>
                      <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Current Period</span>
                          <span className="text-sm font-medium">
                            {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Created</span>
                          <span className="text-sm font-medium">{formatDate(subscription.created)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Start Date</span>
                          <span className="text-sm font-medium">{formatDate(subscription.start_date)}</span>
                        </div>
                        {subscription.trial_end && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Trial Ends</span>
                            <span className="text-sm font-medium">{formatDate(subscription.trial_end)}</span>
                          </div>
                        )}
                        {subscription.cancel_at && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Cancels On</span>
                            <span className="text-sm font-medium text-orange-500">{formatDate(subscription.cancel_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Method */}
                    {payment_method && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Payment Method</h3>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <span className="text-sm font-medium capitalize">{payment_method.type}</span>
                          </div>
                          {payment_method.card && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Card</span>
                                <span className="text-sm font-medium">
                                  {payment_method.card.brand.toUpperCase()} •••• {payment_method.card.last4}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Expires</span>
                                <span className="text-sm font-medium">
                                  {payment_method.card.exp_month}/{payment_method.card.exp_year}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upcoming Invoice */}
                    {upcoming_invoice && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Next Payment</h3>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Amount Due</span>
                            <span className="text-lg font-semibold text-foreground">
                              {formatCurrency(upcoming_invoice.amount_due, upcoming_invoice.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Due Date</span>
                            <span className="text-sm font-medium">
                              {upcoming_invoice.next_payment_attempt
                                ? formatDate(upcoming_invoice.next_payment_attempt)
                                : formatDate(upcoming_invoice.period_end)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Tabs.Content>

                {/* Invoice History Tab */}
                <Tabs.Content value="invoices">
                  <div className="space-y-3">
                    {invoices.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No invoices found</p>
                    ) : (
                      invoices.map((invoice: any) => (
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
                            {!invoice.paid && invoice.status === 'open' && invoice.hosted_invoice_url && (
                              <Button
                                size="sm"
                                onClick={() => handlePayInvoice(invoice.id, invoice.hosted_invoice_url)}
                              >
                                Pay Now
                              </Button>
                            )}
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
                      ))
                    )}
                  </div>
                </Tabs.Content>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Timeline - 1 column */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Timeline</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timelineEvents.map((event, index) => (
                  <div key={index} className="flex gap-3">
                    <div className={`mt-1 ${event.color}`}>
                      {event.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.date)}
                      </p>
                    </div>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No timeline events
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetailPage;"
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

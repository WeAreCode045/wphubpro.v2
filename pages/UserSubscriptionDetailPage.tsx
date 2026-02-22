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
import UsageGauge from "../components/dashboard/UsageGauge";

import { useManageSubscription } from "../hooks/useStripe";
import { useUsage } from "../hooks/useSubscription";

const UserSubscriptionDetailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const manageSubscriptionMutation = useManageSubscription();
  const { data: usage } = useUsage();
  const [cancelingUpdate, setCancelingUpdate] = useState(false);

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
    data: subscriptionDoc,
    isLoading: isLoadingSubscription,
  } = useQuery({
    queryKey: ["user-subscription-doc", user?.$id],
    queryFn: async () => {
      if (!user?.$id) throw new Error("Not authenticated");

      // Get subscription document from subscriptions collection
      const response = await databases.listDocuments(
        DATABASE_ID,
        "subscriptions",
        [Query.equal("user_id", user.$id), Query.limit(1)],
      );

      if (response.documents.length === 0) {
        throw new Error("No subscription found");
      }

      return response.documents[0];
    },
    enabled: !!user?.$id,
  });

  const {
    data: details,
    isLoading: isLoadingDetails,
    isError,
    error,
  } = useQuery({
    queryKey: ["subscription-details", subscriptionDoc?.$id],
    queryFn: async () => {
      if (!subscriptionDoc) throw new Error("No subscription found");

      // If it's a local plan, fetch from local_plans collection
      if (subscriptionDoc.source === 'local') {
        const planLabel = subscriptionDoc.plan_label || subscriptionDoc.plan_id;
        const planDocs = await databases.listDocuments(
          DATABASE_ID,
          "local_plans",
          [Query.equal("label", planLabel)]
        );

        const localPlan = planDocs.documents[0] || {
          name: subscriptionDoc.plan_id || "Local Plan",
          sites_limit: 1,
          library_limit: 5,
          storage_limit: 10,
          price: "0",
          interval: "month"
        };

        // Synthesize a details object that matches the Stripe response structure
        return {
          subscription: {
            id: subscriptionDoc.$id,
            status: subscriptionDoc.status || 'active',
            current_period_start: Math.floor(new Date(subscriptionDoc.billing_start_date || subscriptionDoc.$createdAt).getTime() / 1000),
            current_period_end: subscriptionDoc.billing_end_date ? Math.floor(new Date(subscriptionDoc.billing_end_date).getTime() / 1000) : null,
            created: Math.floor(new Date(subscriptionDoc.$createdAt).getTime() / 1000),
            source: 'local'
          },
          customer: {
            name: subscriptionDoc.user_name || user?.name,
            email: subscriptionDoc.user_email || user?.email,
            created: Math.floor(new Date(subscriptionDoc.$createdAt).getTime() / 1000),
          },
          plan: {
            product_name: localPlan.name,
            product_description: "Admin-assigned local plan",
            unit_amount: parseFloat(localPlan.price || "0") * 100,
            currency: "eur",
            interval: localPlan.interval || "month",
            interval_count: 1,
            limits: {
              sites_limit: localPlan.sites_limit,
              library_limit: localPlan.library_limit,
              storage_limit: localPlan.storage_limit
            }
          },
          invoices: [],
          upcoming_invoice: null,
          payment_method: null
        };
      }

      // Stripe flow
      const subscriptionId = subscriptionDoc.stripe_subscription_id;
      if (!subscriptionId) throw new Error("No Stripe subscription ID found");

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
    enabled: !!subscriptionDoc,
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

  const isLoading = isLoadingSubscription || isLoadingDetails;

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
            <Button onClick={() => navigate("/subscription/plans")}>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            My Subscription
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your subscription and billing details
          </p>
        </div>
        {getStatusBadge(subscription.status)}
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Plan Details - Left Block (Big) */}
        <div className="lg:row-span-2 h-full">
          <Card className="h-full">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-semibold">Plan Details</h2>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div>
                <label className="text-xs text-muted-foreground">Plan Name</label>
                <p className="font-medium text-base">{plan.product_name || "—"}</p>
                {plan.product_description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.product_description}
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Price</label>
                <p className="font-medium text-base">
                  {plan.unit_amount
                    ? formatCurrency(plan.unit_amount, plan.currency || "usd")
                    : "—"}
                  {plan.interval && (
                    <span className="text-xs text-muted-foreground ml-1.5">
                      / {plan.interval_count > 1 ? `${plan.interval_count} ` : ""}
                      {plan.interval}
                      {plan.interval_count > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>

              {/* Plan Limits - Circular Gauges */}
              {plan.limits && (plan.limits.sites_limit || plan.limits.library_limit || plan.limits.storage_limit) && (
                <div className="pt-4 border-t border-border">
                  <label className="text-xs text-muted-foreground mb-4 block font-medium uppercase tracking-wider">Plan Usage & Limits</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {plan.limits.sites_limit && (
                      <div className="scale-75 origin-top">
                        <UsageGauge 
                          label="Sites" 
                          used={usage?.sitesUsed || 0} 
                          limit={plan.limits.sites_limit} 
                        />
                      </div>
                    )}
                    {plan.limits.library_limit && (
                      <div className="scale-75 origin-top">
                        <UsageGauge 
                          label="Library" 
                          used={usage?.libraryUsed || 0} 
                          limit={plan.limits.library_limit} 
                        />
                      </div>
                    )}
                    {plan.limits.storage_limit && (
                      <div className="scale-75 origin-top">
                        <UsageGauge 
                          label="Uploads" 
                          used={usage?.storageUsed || 0} 
                          limit={plan.limits.storage_limit} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs py-1 h-8"
                    onClick={() => navigate('/subscription/plans')}
                  >
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs py-1 h-8"
                    onClick={() => navigate('/subscription/plans')}
                  >
                    <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
                    Downgrade
                  </Button>
                </div>
                {/* Stripe-managed actions are only available for Stripe subscriptions. */}
                {subscription.source !== 'local' && subscription.status === 'active' && (
                  <Button 
                    className="w-full text-xs py-1 h-8" 
                    onClick={() => manageSubscriptionMutation.mutate()}
                    disabled={manageSubscriptionMutation.isPending}
                  >
                    {manageSubscriptionMutation.isPending ? (
                        <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Redirecting...
                        </>
                    ) : (
                        'Manage Billing in Stripe'
                    )}
                  </Button>
                )}

                {subscription.source !== 'local' && subscription.status === 'active' && !subscription.cancel_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:bg-destructive/10 text-xs py-1 h-8"
                    onClick={handleCancelSubscription}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Canceling...</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Subscription</>
                    )}
                  </Button>
                )}

                {subscription.source === 'local' && (
                  <div className="bg-accent/5 border-accent/10 p-3 rounded-md text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Local plan assigned by administrator</p>
                        <p className="text-xs text-muted-foreground mt-1">This plan was assigned by your administrator and is managed outside of Stripe. To change or cancel this plan, contact your account administrator.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details - Top Right */}
        <div>
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Customer Details</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <p className="font-medium text-sm">{customer.name || user?.name || "—"}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <p className="font-medium text-sm">{customer.email || user?.email || "—"}</p>
              </div>
              {customer.phone && (
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <p className="font-medium text-sm">{customer.phone}</p>
                </div>
              )}
              {customer.address && (
                <div>
                  <label className="text-xs text-muted-foreground">Address</label>
                  <p className="font-medium text-xs leading-relaxed">
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
                <label className="text-xs text-muted-foreground">Customer Since</label>
                <p className="font-medium text-sm">
                  {customer.created ? formatDate(customer.created) : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Billing & Invoices - Bottom Right */}
        <div>
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="billing">
                <div className="px-4 border-b border-border">
                  <Tabs.List className="mb-0">
                    <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
                    <Tabs.Trigger value="invoices">Invoices</Tabs.Trigger>
                  </Tabs.List>
                </div>

                {/* Billing & Payment Tab */}
                <Tabs.Content value="billing" className="p-4 mt-0">
                  {subscription.source === 'local' ? (
                    <div className="space-y-4">
                      <div className="bg-accent/5 border-accent/10 p-4 rounded-md text-sm">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                          <div>
                            <p className="font-medium">Local subscription</p>
                            <p className="text-xs text-muted-foreground mt-1">This subscription was assigned and is managed by your administrator. Billing and invoices are handled outside of Stripe in this case.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Billing Cycle */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <h3 className="text-sm font-semibold">Billing Cycle</h3>
                        </div>
                        <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Current Period</span>
                            <span className="font-medium">
                              {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                            </span>
                          </div>
                          {subscription.trial_end && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Trial Ends</span>
                              <span className="font-medium">{formatDate(subscription.trial_end)}</span>
                            </div>
                          )}
                          {subscription.cancel_at && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Cancels On</span>
                              <span className="font-medium text-orange-500">{formatDate(subscription.cancel_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      {payment_method && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-3.5 h-3.5 text-primary" />
                            <h3 className="text-sm font-semibold">Payment Method</h3>
                          </div>
                          <div className="bg-muted/30 p-3 rounded-lg space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Type</span>
                              <span className="font-medium capitalize">{payment_method.type}</span>
                            </div>
                            {payment_method.card && (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Card</span>
                                  <span className="font-medium">
                                    {payment_method.card.brand.toUpperCase()} •••• {payment_method.card.last4}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Expires</span>
                                  <span className="font-medium">
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
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <h3 className="text-sm font-semibold">Next Payment</h3>
                          </div>
                          <div className="bg-muted/30 p-3 rounded-lg space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Amount Due</span>
                              <span className="font-semibold text-foreground text-sm">
                                {formatCurrency(upcoming_invoice.amount_due, upcoming_invoice.currency)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Due Date</span>
                              <span className="font-medium">
                                {upcoming_invoice.next_payment_attempt
                                  ? formatDate(upcoming_invoice.next_payment_attempt)
                                  : formatDate(upcoming_invoice.period_end)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Tabs.Content>

                {/* Invoice History Tab */}
                <Tabs.Content value="invoices" className="p-4 mt-0">
                  <div className="space-y-2">
                    {subscription.source === 'local' ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        This subscription is managed locally by your administrator. Invoice history and payments are handled outside of Stripe for this subscription.
                      </div>
                    ) : invoices.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-6">No invoices found</p>
                    ) : (
                      invoices.map((invoice: any) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-xs">
                                Invoice #{invoice.number || invoice.id.slice(-8)}
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
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
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              <span>{formatDate(invoice.created)}</span>
                              <span>•</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(invoice.amount_due, invoice.currency)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!invoice.paid && invoice.status === 'open' && invoice.hosted_invoice_url && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                onClick={() => handlePayInvoice(invoice.id, invoice.hosted_invoice_url)}
                              >
                                Pay Now
                              </Button>
                            )}
                            {invoice.hosted_invoice_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                            {invoice.invoice_pdf && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                onClick={() => window.open(invoice.invoice_pdf, "_blank")}
                              >
                                <Download className="w-3 h-3 mr-1" />
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
      </div>
    </div>
  );
};

export default UserSubscriptionDetailPage;

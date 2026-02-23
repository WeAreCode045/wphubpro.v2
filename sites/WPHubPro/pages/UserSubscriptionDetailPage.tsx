import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { functions, databases, DATABASE_ID } from "../services/appwrite";
import { useAuth } from "../contexts/AuthContext";
import { Query } from "appwrite";
import {
  Loader2,
  AlertCircle,
} from "lucide-react";
import Card, { CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useManageSubscription } from "../hooks/useStripe";
import { useUsage } from "../hooks/useSubscription";
import SubscriptionPlanDetailsCard from "../components/subscription/SubscriptionPlanDetailsCard";
import SubscriptionCustomerDetailsCard from "../components/subscription/SubscriptionCustomerDetailsCard";
import SubscriptionBillingTabs from "../components/subscription/SubscriptionBillingTabs";
import type { SubscriptionDetails } from "../components/subscription/subscription-detail-types";

const UserSubscriptionDetailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const manageSubscriptionMutation = useManageSubscription();
  const { data: usage } = useUsage();

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
        return null;
      }

      return response.documents[0] || null;
    },
    enabled: !!user?.$id,
  });

  const {
    data: details,
    isLoading: isLoadingDetails,
    isError,
    error,
  } = useQuery<SubscriptionDetails>({
    queryKey: ["subscription-details", subscriptionDoc?.$id],
    queryFn: async () => {
      if (!subscriptionDoc) throw new Error("No subscription found");

      // If it's a local plan (either marked as 'local' source OR no stripe_subscription_id), fetch from local_plans collection
      const isLocalPlan = subscriptionDoc.source === 'local' || !subscriptionDoc.stripe_subscription_id;
      
      if (isLocalPlan) {
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
    enabled: !!subscriptionDoc && subscriptionDoc.source !== "free-tier",
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

  const formatDateFromString = (value: string) => {
    const timestamp = Number(value);
    if (!Number.isNaN(timestamp)) {
      return formatDate(timestamp);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
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
  const isFreeTier = !subscriptionDoc || subscriptionDoc.source === "free-tier";

  const localMetadata = useMemo(() => {
    if (!subscriptionDoc?.metadata) return null;
    if (typeof subscriptionDoc.metadata === "string") {
      try {
        return JSON.parse(subscriptionDoc.metadata) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (typeof subscriptionDoc.metadata === "object") {
      return subscriptionDoc.metadata as Record<string, unknown>;
    }
    return null;
  }, [subscriptionDoc]);

  const assignedByLabel =
    (localMetadata?.assigned_by_user_name as string | undefined) ||
    (localMetadata?.assigned_by_user_id as string | undefined) ||
    "—";
  const assignedAtValue =
    (localMetadata?.assigned_at as string | undefined) ||
    subscriptionDoc?.$createdAt ||
    "";
  const assignedAtLabel = assignedAtValue ? formatDateFromString(assignedAtValue) : "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isFreeTier) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Subscription Details
        </h1>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-base font-semibold text-foreground">
              You are currently on the Free-Tier plan.
            </p>
            <p className="text-sm text-muted-foreground">
              Want to use the advantages of a Pro account? Check our plans.
            </p>
            <Button onClick={() => navigate("/subscription/plans")}>
              View Plans
            </Button>
          </CardContent>
        </Card>
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
        <div className="lg:row-span-2 h-full">
          <SubscriptionPlanDetailsCard
            plan={plan}
            subscription={subscription}
            usage={usage}
            onUpgrade={() => navigate("/subscription/plans")}
            onDowngrade={() => navigate("/subscription/plans")}
            onManageStripe={() => manageSubscriptionMutation.mutate()}
            onCancel={handleCancelSubscription}
            isManaging={manageSubscriptionMutation.isPending}
            isCanceling={actionLoading === "cancel"}
            formatCurrency={formatCurrency}
            isLocal={subscription.source === "local"}
            assignedByLabel={assignedByLabel}
            assignedAtLabel={assignedAtLabel}
          />
        </div>

        <div>
          <SubscriptionCustomerDetailsCard
            customer={customer}
            fallbackName={user?.name}
            fallbackEmail={user?.email}
            formatDate={formatDate}
          />
        </div>

        <div>
          <SubscriptionBillingTabs
            subscription={subscription}
            paymentMethod={payment_method}
            upcomingInvoice={upcoming_invoice}
            invoices={invoices}
            onPayInvoice={handlePayInvoice}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </div>
  );
};

export default UserSubscriptionDetailPage;

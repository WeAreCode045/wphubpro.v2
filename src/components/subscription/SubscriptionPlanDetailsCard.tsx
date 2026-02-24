import React from "react";
import { Package, TrendingDown, TrendingUp, AlertCircle, Loader2, XCircle } from "lucide-react";
import Card, { CardHeader, CardContent } from "../ui/Card";
import Button from "../ui/Button";
import UsageGauge from "../dashboard/UsageGauge";
import type { SubscriptionCore, SubscriptionPlan, SubscriptionPlanLimits } from "./subscription-detail-types";
import type { UsageMetrics } from "../../types";

interface Props {
  plan: SubscriptionPlan;
  subscription: SubscriptionCore;
  usage: UsageMetrics | undefined;
  onUpgrade: () => void;
  onDowngrade: () => void;
  onManageStripe: () => void;
  onCancel: () => void;
  isManaging: boolean;
  isCanceling: boolean;
  formatCurrency: (amount: number, currency: string) => string;
  isLocal: boolean;
  assignedByLabel: string;
  assignedAtLabel: string;
}

const formatLimitLabel = (limit: number | null | undefined) => {
  if (limit === null || limit === undefined) return "—";
  if (limit === 0) return "0";
  if (limit > 9999) return "Unlimited";
  return String(limit);
};

const hasLimits = (limits?: SubscriptionPlanLimits | null) => {
  if (!limits) return false;
  return Boolean(limits.sites_limit || limits.library_limit || limits.storage_limit || limits.sites_limit === 0 || limits.library_limit === 0 || limits.storage_limit === 0);
};

const SubscriptionPlanDetailsCard: React.FC<Props> = ({
  plan,
  subscription,
  usage,
  onUpgrade,
  onDowngrade,
  onManageStripe,
  onCancel,
  isManaging,
  isCanceling,
  formatCurrency,
  isLocal,
  assignedByLabel,
  assignedAtLabel,
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">Plan Details</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div>
          <label className="text-xs text-muted-foreground">Plan Name</label>
          <p className="font-medium text-base">{plan.product_name || "—"}</p>
          {plan.product_description && (
            <p className="text-xs text-muted-foreground mt-0.5">{plan.product_description}</p>
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
                / {plan.interval_count && plan.interval_count > 1 ? `${plan.interval_count} ` : ""}
                {plan.interval}
                {plan.interval_count && plan.interval_count > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        {hasLimits(plan.limits) && (
          <div className="pt-4 border-t border-border">
            <label className="text-xs text-muted-foreground mb-4 block font-medium uppercase tracking-wider">
              Plan Usage & Limits
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {plan.limits?.sites_limit !== undefined && plan.limits?.sites_limit !== null && (
                <div className="scale-75 origin-top">
                  <UsageGauge label="Sites" used={usage?.sitesUsed || 0} limit={plan.limits.sites_limit} />
                </div>
              )}
              {plan.limits?.library_limit !== undefined && plan.limits?.library_limit !== null && (
                <div className="scale-75 origin-top">
                  <UsageGauge label="Library" used={usage?.libraryUsed || 0} limit={plan.limits.library_limit} />
                </div>
              )}
              {plan.limits?.storage_limit !== undefined && plan.limits?.storage_limit !== null && (
                <div className="scale-75 origin-top">
                  <UsageGauge label="Uploads" used={usage?.storageUsed || 0} limit={plan.limits.storage_limit} />
                </div>
              )}
            </div>
          </div>
        )}

        {isLocal && (
          <div className="pt-4 border-t border-border space-y-2">
            <label className="text-xs text-muted-foreground block font-medium uppercase tracking-wider">
              Custom Plan Assignment
            </label>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assigned by</span>
                <span className="font-medium text-foreground">{assignedByLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assigned on</span>
                <span className="font-medium text-foreground">{assignedAtLabel}</span>
              </div>
              {hasLimits(plan.limits) && (
                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sites limit</span>
                    <span className="font-medium text-foreground">{formatLimitLabel(plan.limits?.sites_limit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Library limit</span>
                    <span className="font-medium text-foreground">{formatLimitLabel(plan.limits?.library_limit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Uploads limit</span>
                    <span className="font-medium text-foreground">{formatLimitLabel(plan.limits?.storage_limit)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs py-1 h-8"
              onClick={onUpgrade}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Upgrade
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs py-1 h-8"
              onClick={onDowngrade}
            >
              <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
              Downgrade
            </Button>
          </div>

          {!isLocal && subscription.status === "active" && (
            <Button
              className="w-full text-xs py-1 h-8"
              onClick={onManageStripe}
              disabled={isManaging}
            >
              {isManaging ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Manage Billing in Stripe"
              )}
            </Button>
          )}

          {!isLocal && subscription.status === "active" && !subscription.cancel_at && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:bg-destructive/10 text-xs py-1 h-8"
              onClick={onCancel}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Canceling...
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Subscription
                </>
              )}
            </Button>
          )}

          {isLocal && (
            <div className="bg-accent/5 border-accent/10 p-3 rounded-md text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Custom plan assigned by administrator</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This plan was assigned by your administrator and is managed outside of Stripe. To change or cancel this plan, contact your account administrator.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionPlanDetailsCard;

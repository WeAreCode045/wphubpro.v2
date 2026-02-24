import React from "react";
import Card, { CardHeader, CardTitle, CardContent } from "../../ui/Card.tsx";
import Label from "../../ui/Label.tsx";
import Badge from "../../ui/Badge.tsx";
import { Package, ShieldCheck } from "lucide-react";

export type PlanType = "local" | "stripe";

export interface PlanLimits {
  sitesLimit: number | null;
  libraryLimit: number | null;
  storageLimit: number | null;
}

interface PlanConfigCardProps {
  type: PlanType;
  label: string | null;
  stripeProductId?: string | null;
  monthlyPrice?: number | null;
  yearlyPrice?: number | null;
  monthlyPriceId?: string | null;
  yearlyPriceId?: string | null;
  currency?: string;
  limits: PlanLimits;
}

const formatPrice = (value: number | null | undefined, currency?: string) => {
  if (value === null || value === undefined) return "—";
  const safeCurrency = currency ? currency.toUpperCase() : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatLimit = (value: number | null) => {
  if (value === null || value === undefined) return "N/A";
  return value === 9999 ? "Unlimited" : String(value);
};

const PlanConfigCard: React.FC<PlanConfigCardProps> = ({
  type,
  label,
  stripeProductId,
  monthlyPrice,
  yearlyPrice,
  monthlyPriceId,
  yearlyPriceId,
  currency,
  limits,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-4 h-4" /> Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge
              variant={type === "local" ? "secondary" : "outline"}
              className="uppercase"
            >
              {type}
            </Badge>
            <div className="text-xs text-muted-foreground">
              Label: <span className="font-medium text-foreground">{label || "N/A"}</span>
            </div>
          </div>

          {type === "stripe" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Stripe Product ID
                </Label>
                <div className="font-mono text-[10px] break-all bg-secondary p-2 rounded border border-border">
                  {stripeProductId || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Monthly Price ID
                </Label>
                <div className="font-mono text-[10px] break-all bg-secondary p-2 rounded border border-border">
                  {monthlyPriceId || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Yearly Price ID
                </Label>
                <div className="font-mono text-[10px] break-all bg-secondary p-2 rounded border border-border">
                  {yearlyPriceId || "—"}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Monthly Price
              </Label>
              <div className="text-xl font-bold">
                {formatPrice(monthlyPrice ?? null, currency)}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Yearly Price
              </Label>
              <div className="text-xl font-bold">
                {formatPrice(yearlyPrice ?? null, currency)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Platform Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Sites Limit</span>
            <span className="font-bold">{formatLimit(limits.sitesLimit)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Library Limit</span>
            <span className="font-bold">{formatLimit(limits.libraryLimit)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Upload Limit</span>
            <span className="font-bold">{formatLimit(limits.storageLimit)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanConfigCard;

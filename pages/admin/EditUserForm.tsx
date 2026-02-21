import React, { useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Label from "../../components/ui/Label";
import Checkbox from "../../components/ui/Checkbox";
import Radio from "../../components/ui/Radio";

interface Props {
  user: any;
  onSave: (updates: any) => Promise<void> | void;
  onCancel: () => void;
}

const EditUserForm: React.FC<Props> = ({ user, onSave, onCancel }) => {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [role, setRole] = useState(user.role || "User");
  const [planId, setPlanId] = useState(user.planId || "");
  const [stripeId, setStripeId] = useState(user.stripeId || "");
  const [status, setStatus] = useState(user.status || "Active");
  const [billingStart, setBillingStart] = useState<string | null>(
    user.billing_start_date || null,
  );
  const [billingNever, setBillingNever] = useState<boolean>(
    user.billing_never || false,
  );
  const [priceMode, setPriceMode] = useState<"plan" | "custom">(
    user.plan_price_mode === "custom" ? "custom" : "plan",
  );
  const [customPriceAmount, setCustomPriceAmount] = useState(
    user.plan_price?.amount || "",
  );
  const [customPriceCurrency, setCustomPriceCurrency] = useState(
    user.plan_price?.currency || "usd",
  );
  const [customPriceInterval, setCustomPriceInterval] = useState(
    user.plan_price?.interval || "month",
  );
  const [customLimits, setCustomLimits] = useState<string>(
    JSON.stringify(user.metadata || user.limits || {}, null, 2),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name,
        email,
        role,
        planId,
        stripe_customer_id: stripeId,
        status,
        billingStart: billingNever ? "never" : billingStart,
        priceMode,
        customPrice:
          priceMode === "custom"
            ? {
                amount: Number(customPriceAmount) || 0,
                currency: customPriceCurrency,
                interval: customPriceInterval,
              }
            : null,
      };
      try {
        updates.customLimits = customLimits ? JSON.parse(customLimits) : {};
      } catch (e) {
        // ignore parse error - keep as empty
        updates.customLimits = {};
      }
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <select
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>User</option>
            <option>Admin</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Plan</Label>
          <Input value={planId} onChange={(e) => setPlanId(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stripe Customer ID</Label>
          <Input
            value={stripeId}
            onChange={(e) => setStripeId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      <div className="pt-4">
        <h3 className="text-sm font-semibold mb-2">Billing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Billing Start Date</Label>
            <Input
              type="date"
              value={billingStart || ""}
              onChange={(e) => setBillingStart(e.target.value || null)}
              disabled={billingNever}
            />
          </div>
          <div className="flex items-end justify-end">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={billingNever}
                onChange={(e) => setBillingNever((e.target as HTMLInputElement).checked)}
              />
              <span className="text-sm">Never (manual billing)</span>
            </label>
          </div>
        </div>

        <div className="pt-3">
          <Label>Price Option</Label>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-2">
              <Radio
                name="priceMode"
                value="plan"
                checked={priceMode === "plan"}
                onChange={() => setPriceMode("plan")}
              />
              <span>Use Plan Price</span>
            </label>
            <label className="flex items-center gap-2">
              <Radio
                name="priceMode"
                value="custom"
                checked={priceMode === "custom"}
                onChange={() => setPriceMode("custom")}
              />
              <span>Custom Price</span>
            </label>
          </div>

          {priceMode === "custom" && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Input
                placeholder="amount"
                value={String(customPriceAmount)}
                onChange={(e) => setCustomPriceAmount(e.target.value)}
              />
              <Input
                placeholder="currency"
                value={customPriceCurrency}
                onChange={(e) => setCustomPriceCurrency(e.target.value)}
              />
              <select
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none`}
                value={customPriceInterval}
                onChange={(e) => setCustomPriceInterval(e.target.value)}
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          )}

          <div className="pt-4">
            <Label>Custom Limits (JSON)</Label>
            <textarea
              className="flex w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none"
              value={customLimits}
              onChange={(e) => setCustomLimits(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default EditUserForm;

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, DATABASE_ID } from "../../services/appwrite";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Label from "../../components/ui/Label";
import Select from "../../components/ui/Select";
import Checkbox from "../../components/ui/Checkbox";

interface Props {
  user: any;
  onSave: (updates: any) => Promise<void> | void;
  onCancel: () => void;
}

const EditUserForm: React.FC<Props> = ({ user, onSave, onCancel }) => {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [isAdmin, setIsAdmin] = useState(user.isAdmin || false);
  const [customPlanId, setCustomPlanId] = useState(user.prefs?.current_plan_id || "");
  const [status, setStatus] = useState(user.status || "Active");
  const [saving, setSaving] = useState(false);

  // Fetch custom plans
  const { data: customPlans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["customPlans"],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          'plans'
        );
        return response.documents;
      } catch (err: any) {
        console.error("Error fetching custom plans:", err);
        return [];
      }
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name,
        email,
        isAdmin,
        status,
        localPlanId: customPlanId || null,
      };
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
        <div className="space-y-2 col-span-2 flex items-center space-x-2">
          <Checkbox 
            id="is-admin" 
            checked={isAdmin} 
            onChange={(e) => setIsAdmin(e.target.checked)} 
          />
          <Label htmlFor="is-admin" className="cursor-pointer">Make admin (add to admin team)</Label>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <div className="flex items-center justify-between">
          <Label>Assign Custom Plan (Optional)</Label>
          {customPlanId && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCustomPlanId("")}
              type="button"
            >
              Remove Plan
            </Button>
          )}
        </div>
        {isLoadingPlans ? (
          <div className="text-sm text-muted-foreground">Loading plans...</div>
        ) : (
          <Select
            value={customPlanId}
            onChange={(e) => setCustomPlanId(e.target.value)}
          >
            <option value="">No custom plan assigned</option>
            {customPlans.map((plan: any) => (
              <option key={plan.$id} value={plan.$id}>
                {plan.name} ({plan.label})
              </option>
            ))}
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Assigning a custom plan will set the plan's label on the user. Removing a plan will restore their Stripe subscription if they have one, or revert to free tier.
        </p>
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

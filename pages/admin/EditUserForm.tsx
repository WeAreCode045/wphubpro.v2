import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';

interface Props {
  user: any;
  onSave: (updates: any) => Promise<void> | void;
  onCancel: () => void;
}

const EditUserForm: React.FC<Props> = ({ user, onSave, onCancel }) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole] = useState(user.role || 'User');
  const [planId, setPlanId] = useState(user.planId || '');
  const [stripeId, setStripeId] = useState(user.stripeId || '');
  const [status, setStatus] = useState(user.status || 'Active');
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
        status
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
        <div className="space-y-2">
          <Label>Role</Label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
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
          <Input value={stripeId} onChange={(e) => setStripeId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  );
};

export default EditUserForm;

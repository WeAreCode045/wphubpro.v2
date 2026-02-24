import React from "react";
import Modal from "../../ui/Modal.tsx";
import Select from "../../ui/Select.tsx";
import Label from "../../ui/Label.tsx";
import Button from "../../ui/Button.tsx";
import { Loader2, UserPlus, ShieldCheck } from "lucide-react";

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AssignableUser[];
  selectedUserId: string;
  onSelectUserId: (userId: string) => void;
  onConfirm: () => void;
  isAssigning: boolean;
  planName: string;
  planLabel: string | null;
}

const AssignUserModal: React.FC<AssignUserModalProps> = ({
  isOpen,
  onClose,
  users,
  selectedUserId,
  onSelectUserId,
  onConfirm,
  isAssigning,
  planName,
  planLabel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign User to Plan">
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Select User</Label>
          <Select
            value={selectedUserId}
            onChange={(event) => onSelectUserId(event.target.value)}
          >
            <option value="">Select a user...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Select>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg text-sm space-y-2 border border-primary/10">
          <p className="font-semibold text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Plan Assignment Details
          </p>
          <p className="text-muted-foreground">
            You are about to assign <strong>{planName}</strong> to the selected user.
            This will set the label <strong>{planLabel || "N/A"}</strong> on their account.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!selectedUserId || isAssigning}>
            {isAssigning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Confirm Assignment
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignUserModal;

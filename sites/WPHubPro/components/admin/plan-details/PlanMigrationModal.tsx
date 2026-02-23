import React from "react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Alert from "../../ui/Alert";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export interface UserOnPlan {
  userId: string;
  userName: string;
  userEmail: string;
}

interface PlanMigrationModalProps {
  isOpen: boolean;
  planName: string;
  usersOnPlan: UserOnPlan[];
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const PlanMigrationModal: React.FC<PlanMigrationModalProps> = ({
  isOpen,
  planName,
  usersOnPlan,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 pb-2 border-b border-border">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold">Migrate to Stripe</h2>
            <p className="text-sm text-muted-foreground">
              You are about to migrate "{planName}" to Stripe
            </p>
          </div>
        </div>

        {usersOnPlan.length > 0 && (
          <Alert variant="warning" className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {usersOnPlan.length} user{usersOnPlan.length !== 1 ? "s" : ""}{" "}
                  currently on this plan
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  These users will remain on the local plan. You may need to manually migrate them
                  to the corresponding Stripe plan after migration completes.
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-secondary rounded text-xs">
              {usersOnPlan.map((user) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <span className="font-medium">{user.userName}</span>
                  <span className="text-muted-foreground">{user.userEmail}</span>
                </div>
              ))}
            </div>
          </Alert>
        )}

        {usersOnPlan.length === 0 && (
          <Alert variant="success">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>No users on this plan. Safe to migrate.</p>
            </div>
          </Alert>
        )}

        <div className="bg-secondary p-3 rounded text-sm">
          <p className="font-semibold mb-2">What will happen:</p>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            <li>A new Stripe product will be created</li>
            <li>Pricing for each billing period will be added to Stripe</li>
            <li>The local plan will be linked to the Stripe product</li>
            <li>New subscriptions can use the Stripe pricing</li>
          </ul>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isLoading ? "Migrating..." : "Migrate to Stripe"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PlanMigrationModal;

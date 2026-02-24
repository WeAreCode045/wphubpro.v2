import React from "react";
import { User } from "lucide-react";
import Card, { CardHeader, CardContent } from "../ui/Card.tsx";
import type { SubscriptionCustomer } from "./subscription-detail-types.ts";

interface Props {
  customer: SubscriptionCustomer;
  fallbackName: string | undefined;
  fallbackEmail: string | undefined;
  formatDate: (timestamp: number) => string;
}

const SubscriptionCustomerDetailsCard: React.FC<Props> = ({
  customer,
  fallbackName,
  fallbackEmail,
  formatDate,
}) => {
  return (
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
          <p className="font-medium text-sm">{customer.name || fallbackName || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <p className="font-medium text-sm">{customer.email || fallbackEmail || "—"}</p>
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
  );
};

export default SubscriptionCustomerDetailsCard;

import React, { useState } from "react";
import Card, { CardHeader, CardTitle, CardContent } from "../../ui/Card.tsx";
import Button from "../../ui/Button.tsx";
import Input from "../../ui/Input.tsx";
import Select from "../../ui/Select.tsx";
import Label from "../../ui/Label.tsx";
import Badge from "../../ui/Badge.tsx";
import { DollarSign, Plus, Trash2, Loader2 } from "lucide-react";

export interface PriceRow {
  price: number;
  stripe_price_id?: string | null;
  billing_period: "weekly" | "monthly" | "yearly";
}

interface PricingTableProps {
  prices: PriceRow[];
  isEditing: boolean;
  onAddPrice: (price: PriceRow) => void;
  onRemovePrice: (index: number) => void;
  isLoading?: boolean;
}

const PricingTable: React.FC<PricingTableProps> = ({
  prices,
  isEditing,
  onAddPrice,
  onRemovePrice,
  isLoading = false
}) => {
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [newPeriod, setNewPeriod] = useState<"weekly" | "monthly" | "yearly">(
    "monthly"
  );

  const handleAddPrice = () => {
    if (newPrice === "" || newPrice <= 0) {
      return;
    }
    onAddPrice({
      price: Number(newPrice),
      billing_period: newPeriod,
      stripe_price_id: null,
    });
    setNewPrice("");
    setNewPeriod("monthly");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No prices configured yet
          </div>
        ) : (
          <div className="space-y-2">
            {prices.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-secondary rounded border border-border"
              >
                <div className="flex-1">
                  <div className="font-semibold">${p.price}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {p.billing_period}
                  </div>
                </div>
                {p.stripe_price_id && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.stripe_price_id.substring(0, 20)}...
                  </Badge>
                )}
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemovePrice(idx)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isEditing && (
          <div className="pt-4 border-t border-border space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label className="text-xs">Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) =>
                    setNewPrice(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Billing Period</Label>
                <Select
                  value={newPeriod}
                  onChange={(e) =>
                    setNewPeriod(
                      e.target.value as "weekly" | "monthly" | "yearly"
                    )
                  }
                  disabled={isLoading}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleAddPrice}
              disabled={newPrice === "" || isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Price
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingTable;

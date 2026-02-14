import React from "react";
import Card, { CardContent, CardHeader, CardTitle } from "../ui/Card";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: string;
  changeType?: "increase" | "decrease";
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
}) => {
  return (
    <Card className="p-3 sm:p-4">
      <CardHeader className="flex items-center justify-between p-0 mb-2">
        <CardTitle
          as="h4"
          className="text-sm font-medium text-muted-foreground"
        >
          {title}
        </CardTitle>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={`text-xs mt-1 ${changeType === "increase" ? "text-green-600" : "text-red-600"}`}
          >
            {change} from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;

import React from "react";
import Card from "../../ui/Card.tsx";

export interface PlanStatItem {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface PlanStatsGridProps {
  items: PlanStatItem[];
  isLoading: boolean;
}

const PlanStatsGrid: React.FC<PlanStatsGridProps> = ({ items, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={`stat-skeleton-${index}`} className="p-4">
            <div className="h-4 w-24 bg-muted/60 rounded" />
            <div className="mt-3 h-7 w-16 bg-muted/60 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {item.label}
            </span>
            <span className="text-muted-foreground">{item.icon}</span>
          </div>
          <span className="text-2xl font-bold text-foreground">
            {item.value}
          </span>
        </Card>
      ))}
    </div>
  );
};

export default PlanStatsGrid;

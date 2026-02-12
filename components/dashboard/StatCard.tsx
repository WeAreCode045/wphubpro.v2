
import React from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, change, changeType }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle as="h4" className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-5 h-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs text-muted-foreground ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
            {change} from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;

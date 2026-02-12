
import React from 'react';

interface UsageGaugeProps {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

const UsageGauge: React.FC<UsageGaugeProps> = ({ label, used, limit, unit }) => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getStrokeColor = () => {
    if (percentage > 90) return 'stroke-destructive';
    if (percentage > 75) return 'stroke-orange-500';
    return 'stroke-primary';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            className="text-border"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
          />
          <circle
            className={`transform -rotate-90 origin-center transition-all duration-500 ease-out ${getStrokeColor()}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{used}</span>
            <span className="text-xs text-muted-foreground">of {limit}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

export default UsageGauge;

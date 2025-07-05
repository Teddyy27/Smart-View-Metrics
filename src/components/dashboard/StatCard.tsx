import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon,
  className
}) => {
  const isPositive = change && change > 0;
  
  return (
    <div className={cn("p-4 rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toFixed(2) : value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className="flex items-center mt-2 text-sm">
          {isPositive ? (
            <>
              <ArrowUp className="h-4 w-4 text-dashboard-green mr-1" />
              <span className="text-dashboard-green font-medium">{Math.abs(change)}%</span>
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4 text-dashboard-red mr-1" />
              <span className="text-dashboard-red font-medium">{Math.abs(change)}%</span>
            </>
          )}
          <span className="text-muted-foreground ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;

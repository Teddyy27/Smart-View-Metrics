
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ 
  title, 
  value, 
  change, 
  icon,
  className
}) => {
  const isPositive = change && change > 0;
  const isNeutral = change === 0;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {icon && (
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
        
        {change !== undefined && (
          <div className="flex items-center mt-4 text-sm">
            {isNeutral ? (
              <span className="text-muted-foreground font-medium">No change</span>
            ) : isPositive ? (
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
            <span className="text-muted-foreground ml-1">vs previous</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;

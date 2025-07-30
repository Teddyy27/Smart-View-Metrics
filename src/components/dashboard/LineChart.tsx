import React, { useEffect, useState } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface LineChartProps {
  title: string;
  data: DataPoint[];
  lines: Array<{
    key: string;
    color: string;
    name: string;
  }>;
  timeRanges?: string[];
  loading?: boolean;
  getChartData?: (activeRange: string) => DataPoint[];
}

const LineChart: React.FC<LineChartProps> = ({ 
  title,
  data,
  lines,
  timeRanges = ['1h', '24h'],
  loading = false,
  getChartData
}) => {
  const [activeRange, setActiveRange] = useState('1h');
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  
  // Helper to format x-axis labels
  const formatXAxis = (name: string) => {
    if (!name) return '';
    
    // Handle the specific format from API: "YYYY-MM-DD_HH-MM"
    if (name.includes('_') && name.includes('-')) {
      try {
        const [datePart, timePart] = name.split('_');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split('-');
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        
        if (activeRange === '1h') {
          // For 1-hour view, show time in HH:MM format
          return format(date, 'HH:mm');
        } else if (activeRange === '24h') {
          // For 24-hour view, show time in HH:MM format
          return format(date, 'HH:mm');
        }
        return format(date, 'HH:mm');
      } catch (error) {
        console.error('Error parsing timestamp:', name, error);
        return name;
      }
    }
    
    // Fallback for other timestamp formats
    let date: Date;
    if (!isNaN(Number(name)) && Number(name) > 1000000000) {
      // Likely a timestamp
      date = new Date(Number(name));
    } else if (!isNaN(Date.parse(name))) {
      date = new Date(name);
    } else {
      // Not a valid date, just return the label as is
      return name;
    }
    
    if (activeRange === '1h' || activeRange === '24h') {
      return format(date, 'HH:mm');
    }
    return name;
  };

  // Fetch and group data based on time range
  useEffect(() => {
    if (getChartData) {
      setChartData(getChartData(activeRange));
    } else {
      // Fallback: use all data if no getChartData function provided
      setChartData(data);
    }
  }, [activeRange, data, getChartData]);

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg">{title}</h3>
        <div className="flex space-x-2">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={activeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse-gentle text-muted-foreground">
              Loading data...
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={formatXAxis}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend iconType="circle" />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LineChart;

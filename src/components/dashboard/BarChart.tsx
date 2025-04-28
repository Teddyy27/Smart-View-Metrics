
import React, { useState } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Button } from '@/components/ui/button';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface BarChartProps {
  title: string;
  data: DataPoint[];
  bars: Array<{
    key: string;
    color: string;
    name: string;
  }>;
  categories?: string[];
}

const BarChart: React.FC<BarChartProps> = ({ 
  title,
  data,
  bars,
  categories = ['All', 'Category A', 'Category B', 'Category C']
}) => {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  
  return (
    <div className="chart-container">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-lg">{title}</h3>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
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
            {bars.map((bar) => (
              <Bar
                key={bar.key}
                dataKey={bar.key}
                name={bar.name}
                fill={bar.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;

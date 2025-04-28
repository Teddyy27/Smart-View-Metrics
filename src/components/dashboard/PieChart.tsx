
import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip
} from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  title: string;
  data: DataPoint[];
}

const PieChart: React.FC<PieChartProps> = ({ title, data }) => {
  return (
    <div className="chart-container">
      <h3 className="font-medium text-lg mb-4">{title}</h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}`, 'Value']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;

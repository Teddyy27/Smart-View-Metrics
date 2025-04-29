import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import PieChart from '@/components/dashboard/PieChart';
import DataTable from '@/components/dashboard/DataTable';
import generateMockData from '@/services/mergedMockDataWithRealtime';
import type { DashboardData } from '@/services/mergedMockDataWithRealtime';
import { Bolt, Coins, Gauge, Zap } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate data loading
    setLoading(true);
    setTimeout(() => {
      const mockData = generateMockData();
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);
  
  // Format timestamp for alerts table
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  // Format alert status with color
  const renderStatus = (status: string) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        status === 'Active' ? 'bg-dashboard-red/10 text-dashboard-red' : 'bg-dashboard-green/10 text-dashboard-green'
      }`}>
        {status}
      </span>
    );
  };
  
  // Format alert type with color
  const renderAlertType = (type: string) => {
    let color;
    switch (type) {
      case 'Critical':
        color = 'text-dashboard-red';
        break;
      case 'Warning':
        color = 'text-dashboard-yellow';
        break;
      default:
        color = 'text-dashboard-blue';
    }
    
    return <span className={`font-medium ${color}`}>{type}</span>;
  };
  
  // Alert table columns
  const alertColumns = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value: string) => renderAlertType(value)
    },
    {
      key: 'system',
      header: 'System',
      sortable: true,
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
    },
    {
      key: 'message',
      header: 'Message',
      sortable: false,
    },
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      render: (value: string) => formatTimestamp(value)
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value: string) => renderStatus(value)
    }
  ];
  
  if (loading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium animate-pulse-gentle">
            Loading dashboard data...
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your automation control center</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Energy Usage"
            value={data.stats.energyUsage.value}
            change={data.stats.energyUsage.change}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard 
            title="Cost Savings"
            value={data.stats.savings.value}
            change={data.stats.savings.change}
            icon={<Coins className="h-6 w-6" />}
          />
          <StatCard 
            title="Efficiency"
            value={data.stats.efficiency.value}
            change={data.stats.efficiency.change}
            icon={<Gauge className="h-6 w-6" />}
          />
          <StatCard 
            title="Automation Status"
            value={data.stats.automationStatus.value}
            change={data.stats.automationStatus.change}
            icon={<Zap className="h-6 w-6" />}
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <LineChart 
              title="Energy Consumption vs Prediction"
              data={data.energyData}
              lines={[
                { key: 'consumption', color: '#3b82f6', name: 'Actual Consumption' },
                { key: 'prediction', color: '#8b5cf6', name: 'AI Prediction' },
                { key: 'benchmark', color: '#10b981', name: 'Benchmark' }
              ]}
            />
          </div>
          <div>
            <PieChart
              title="Usage Distribution"
              data={data.usageData}
            />
          </div>
        </div>
        
        {/* Revenue and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <BarChart
              title="Revenue Analysis"
              data={data.revenueData}
              bars={[
                { key: 'revenue', color: '#3b82f6', name: 'Revenue' },
                { key: 'expenses', color: '#ef4444', name: 'Expenses' },
                { key: 'profit', color: '#10b981', name: 'Profit' }
              ]}
            />
          </div>
          <div className="h-full">
            <DataTable
              title="Recent Alerts"
              columns={alertColumns}
              data={data.alertsData}
              onRowClick={(record) => {
                console.log('Alert clicked:', record);
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

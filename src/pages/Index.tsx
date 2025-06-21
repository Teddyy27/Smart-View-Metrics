import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import DataTable from '@/components/dashboard/DataTable';
import { useDashboardData } from '@/services/mergedMockDataWithRealtime';
import { useUserData } from '@/hooks/useUserData';
import { Bolt, TrendingUp, Zap } from 'lucide-react';

const Dashboard = () => {
  const { data, loading } = useDashboardData();
  const { trackPageAccess } = useUserData();
  
  // Track page access when component mounts
  useEffect(() => {
    trackPageAccess('Dashboard');
  }, [trackPageAccess]);
  
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard 
            title="Energy Usage"
            value={data.stats.energyUsage.value}
            change={data.stats.energyUsage.change}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard 
            title="Peak Usage"
            value={data.stats.efficiency.value}
            change={data.stats.efficiency.change}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <StatCard 
            title="Automation Status"
            value={data.stats.automationStatus.value}
            change={data.stats.automationStatus.change}
            icon={<Zap className="h-6 w-6" />}
          />
        </div>
        
        {/* Charts and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <LineChart 
              title="Device Power Consumption"
              data={data.energyData}
              lines={[
                { key: 'acPower', color: '#3b82f6', name: 'AC Power' },
                { key: 'fanPower', color: '#10b981', name: 'Fan Power' },
                { key: 'lightPower', color: '#8b5cf6', name: 'Light Power' },
                { key: 'totalPower', color: '#f59e0b', name: 'Total Power' },
              ]}
            />
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong>Benchmarks:</strong> AC: 2.5kW | Fan: 0.5kW | Lighting: 0.3kW | Total: 3.3kW
            </div>
          </div>
          <div>
            <BarChart
              title="Device Usage (kWh)"
              data={[
                ...data.usageData.map(item => ({
                  name: item.name,
                  usage: Number((Number(item.value) / 1000).toFixed(3)) // Convert to kWh
                })),
                {
                  name: 'Fan',
                  usage: data.energyData && data.energyData.length > 0 
                    ? Number((data.energyData.reduce((sum, item) => sum + Number(item.fanPower), 0) / 1000).toFixed(3))
                    : 0
                }
              ].sort((a, b) => b.usage - a.usage)}
              bars={[
                {
                  key: 'usage',
                  color: '#3b82f6',
                  name: 'Usage (kWh)'
                }
              ]}
              categories={[]}
            />
          </div>
        </div>
        
        {/* Device Status Overview */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Device Status Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* AC Status */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">AC</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].acPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].acPower) / 1000).toFixed(3) : '0.000'} kW
                </p>
                <p className="text-sm text-blue-600">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].acPower) > 0 ? 'Running' : 'Idle'}
                </p>
              </div>
              
              {/* Fan Status */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-900">Fan</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].fanPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].fanPower) / 1000).toFixed(3) : '0.000'} kW
                </p>
                <p className="text-sm text-green-600">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].fanPower) > 0 ? 'Running' : 'Idle'}
                </p>
              </div>
              
              {/* Lighting Status */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-purple-900">Lighting</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].lightPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].lightPower) / 1000).toFixed(3) : '0.000'} kW
                </p>
                <p className="text-sm text-purple-600">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].lightPower) > 0 ? 'On' : 'Off'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

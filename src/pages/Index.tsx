import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import DataTable from '@/components/dashboard/DataTable';
import useSWR from 'swr';
import { useUserData } from '@/hooks/useUserData';
import { Bolt, TrendingUp, Zap } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Helper functions
function get10MinInterval(ts: string) {
  const [, time] = ts.split('_');
  if (!time) return '';
  const [h, m] = time.split('-');
  const min = Math.floor(Number(m) / 10) * 10;
  return `${h}:${min.toString().padStart(2, '0')}`;
}
function get4HrInterval(ts: string) {
  const [, time] = ts.split('_');
  if (!time) return '';
  const [h] = time.split('-');
  const hour = Math.floor(Number(h) / 4) * 4;
  return `${hour.toString().padStart(2, '0')}:00`;
}

const Dashboard = () => {
  const { data, error, isLoading: loading } = useSWR('/api/dashboard-data', fetcher, {
    dedupingInterval: 5 * 60 * 1000, // 5 minutes
    revalidateOnFocus: false,
  });
  const { trackPageAccess } = useUserData();
  // Remove view state
  
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
  
  // Prepare chart data based on activeRange from LineChart
  const getChartData = (activeRange: string) => {
    if (!data?.energyData) return [];
    const now = new Date();
    if (activeRange === '1h') {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const filtered = data.energyData.filter(item => {
        const [date, time] = item.name.split('_');
        const dt = new Date(`${date}T${time.replace('-', ':')}:00`);
        return dt >= oneHourAgo && dt <= now;
      });
      const grouped: Record<string, any[]> = {};
      filtered.forEach(item => {
        const interval = get10MinInterval(item.name);
        if (!grouped[interval]) grouped[interval] = [];
        grouped[interval].push(item);
      });
      return Object.entries(grouped).map(([interval, items]) => ({
        name: interval,
        acPower: items.reduce((sum, i) => sum + Number(i.acPower), 0) / items.length,
        fanPower: items.reduce((sum, i) => sum + Number(i.fanPower), 0) / items.length,
        lightPower: items.reduce((sum, i) => sum + Number(i.lightPower), 0) / items.length,
        refrigeratorPower: items.reduce((sum, i) => sum + Number(i.refrigeratorPower), 0) / items.length,
        totalPower: items.reduce((sum, i) => sum + Number(i.totalPower), 0) / items.length,
      }));
    } else if (activeRange === '24h') {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const filtered = data.energyData.filter(item => {
        const [date, time] = item.name.split('_');
        const dt = new Date(`${date}T${time.replace('-', ':')}:00`);
        return dt >= oneDayAgo && dt <= now;
      });
      const grouped: Record<string, any[]> = {};
      filtered.forEach(item => {
        const interval = get4HrInterval(item.name);
        if (!grouped[interval]) grouped[interval] = [];
        grouped[interval].push(item);
      });
      return Object.entries(grouped).map(([interval, items]) => ({
        name: interval,
        acPower: items.reduce((sum, i) => sum + Number(i.acPower), 0) / items.length,
        fanPower: items.reduce((sum, i) => sum + Number(i.fanPower), 0) / items.length,
        lightPower: items.reduce((sum, i) => sum + Number(i.lightPower), 0) / items.length,
        refrigeratorPower: items.reduce((sum, i) => sum + Number(i.refrigeratorPower), 0) / items.length,
        totalPower: items.reduce((sum, i) => sum + Number(i.totalPower), 0) / items.length,
      }));
    } else {
      // Default: return all data
      return data.energyData;
    }
  };
  
  if (loading || !data) {
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
                { key: 'acPower', color: '#3b82f6', name: 'AC' },
                { key: 'fanPower', color: '#10b981', name: 'Fan' },
                { key: 'lightPower', color: '#8b5cf6', name: 'Light' },
                { key: 'refrigeratorPower', color: '#06b6d4', name: 'Refrigerator' },
                { key: 'totalPower', color: '#f59e0b', name: 'Total Power' },
              ]}
              getChartData={getChartData}
            />
            <div className="mt-2 text-sm text-card-foreground bg-card p-3 rounded-lg">
              <strong>Benchmarks:</strong> AC: 3.5kW | Fan: 0.5kW | Lighting: 0.4kW | Refrigerator: 0.3kW | Total: 4.7kW
            </div>
          </div>
          <div>
            <BarChart
              title="Device Usage (kWh)"
              data={
                [
                  ...data.usageData.map(item => ({
                    name: item.name,
                    usage: Number((Number(item.value) / 1000).toFixed(2))
                  })),
                  {
                    name: 'Fan',
                    usage: data.energyData && data.energyData.length > 0 
                      ? Number((data.energyData.reduce((sum, item) => sum + Number(item.fanPower), 0) / 1000).toFixed(2))
                      : 0
                  },
                  {
                    name: 'Refrigerator',
                    usage: data.energyData && data.energyData.length > 0 
                      ? Number((data.energyData.reduce((sum, item) => sum + Number(item.refrigeratorPower), 0) / 1000).toFixed(2))
                      : 0
                  }
                ].sort((a, b) => b.usage - a.usage)
              }
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
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Device Status Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* AC Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">AC</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].acPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].acPower) / 1000).toFixed(2) : '0.00'} kW
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].acPower) > 0 ? 'Running' : 'Idle'}
                </p>
              </div>
              {/* Fan Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">Fan</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].fanPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].fanPower) / 1000).toFixed(2) : '0.00'} kW
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].fanPower) > 0 ? 'Running' : 'Idle'}
                </p>
              </div>
              {/* Lighting Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">Lighting</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].lightPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].lightPower) / 1000).toFixed(2) : '0.00'} kW
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].lightPower) > 0 ? 'On' : 'Off'}
                </p>
              </div>
              {/* Refrigerator Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">Refrigerator</h4>
                  <div className={`w-3 h-3 rounded-full ${data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].refrigeratorPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">
                  {data.energyData && data.energyData.length > 0 ? (Number(data.energyData[data.energyData.length - 1].refrigeratorPower) / 1000).toFixed(2) : '0.00'} kW
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.energyData && data.energyData.length > 0 && Number(data.energyData[data.energyData.length - 1].refrigeratorPower) > 0 ? 'Running' : 'Idle'}
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

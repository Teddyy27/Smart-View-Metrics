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

// Helper to get last 6 completed 10-min intervals
function getLast6TenMinIntervals(now = new Date()) {
  const intervals = [];
  let end = new Date(now);
  end.setSeconds(0, 0);
  end.setMinutes(Math.floor(end.getMinutes() / 10) * 10);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 10 * 60 * 1000);
    intervals.push(
      `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    );
  }
  return intervals;
}
// Helper to get last 6 completed 4-hour intervals
function getLast6FourHourIntervals(now = new Date()) {
  const intervals = [];
  let end = new Date(now);
  end.setMinutes(0, 0, 0);
  end.setHours(Math.floor(end.getHours() / 4) * 4);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 4 * 60 * 60 * 1000);
    intervals.push(`${d.getHours().toString().padStart(2, '0')}:00`);
  }
  return intervals;
}

const Dashboard = () => {
  const { data, isLoading: loading } = useSWR('/api/dashboard-data', fetcher, {
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
    if (!safeEnergyData || safeEnergyData.length === 0) return [];
    // Robustly find the latest timestamp in your data
    const latestItem = safeEnergyData.reduce((latest, item) => {
      const [date, time] = item.name.split('_');
      const dt = new Date(`${date}T${time.replace('-', ':')}:00`);
      if (!latest) return item;
      const [latestDate, latestTime] = latest.name.split('_');
      const latestDt = new Date(`${latestDate}T${latestTime.replace('-', ':')}:00`);
      return dt > latestDt ? item : latest;
    }, null);
    if (!latestItem) return [];
    const [date, time] = latestItem.name.split('_');
    const [h, m] = time.split('-');
    const latestDate = new Date(`${date}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`);
    if (activeRange === '1h') {
      const intervals = getLast6TenMinIntervals(latestDate);
      const grouped: Record<string, any[]> = {};
      intervals.forEach(label => { grouped[label] = []; });
      safeEnergyData.forEach(item => {
        const [date, time] = item.name.split('_');
        const [h, m] = time.split('-');
        const itemLabel = `${h.padStart(2, '0')}:${(Math.floor(Number(m) / 10) * 10).toString().padStart(2, '0')}`;
        if (grouped[itemLabel]) grouped[itemLabel].push(item);
      });
      return intervals.map(label => {
        const items = grouped[label];
        return {
          name: label,
          acPower: items.length ? items.reduce((sum, i) => sum + Number(i.acPower), 0) / items.length : 0,
          fanPower: items.length ? items.reduce((sum, i) => sum + Number(i.fanPower), 0) / items.length : 0,
          lightPower: items.length ? items.reduce((sum, i) => sum + Number(i.lightPower), 0) / items.length : 0,
          refrigeratorPower: items.length ? items.reduce((sum, i) => sum + Number(i.refrigeratorPower), 0) / items.length : 0,
          totalPower: items.length ? items.reduce((sum, i) => sum + Number(i.totalPower), 0) / items.length : 0,
        };
      });
    } else if (activeRange === '4h') {
      const intervals = getLast6FourHourIntervals(latestDate);
      const grouped: Record<string, any[]> = {};
      intervals.forEach(label => { grouped[label] = []; });
      safeEnergyData.forEach(item => {
        const [date, time] = item.name.split('_');
        const [h] = time.split('-');
        const itemLabel = `${(Math.floor(Number(h) / 4) * 4).toString().padStart(2, '0')}:00`;
        if (grouped[itemLabel]) grouped[itemLabel].push(item);
      });
      return intervals.map(label => {
        const items = grouped[label];
        return {
          name: label,
          acPower: items.length ? items.reduce((sum, i) => sum + Number(i.acPower), 0) / items.length : 0,
          fanPower: items.length ? items.reduce((sum, i) => sum + Number(i.fanPower), 0) / items.length : 0,
          lightPower: items.length ? items.reduce((sum, i) => sum + Number(i.lightPower), 0) / items.length : 0,
          refrigeratorPower: items.length ? items.reduce((sum, i) => sum + Number(i.refrigeratorPower), 0) / items.length : 0,
          totalPower: items.length ? items.reduce((sum, i) => sum + Number(i.totalPower), 0) / items.length : 0,
        };
      });
    } else {
      // Default: return all data
      return safeEnergyData;
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

  // Add fallback values for missing data
  const stats = data?.stats || {};
  const energyUsage = stats.energyUsage || { value: '0.00 kW', change: 0 };
  const efficiency = stats.efficiency || { value: '0.00 kW', change: 0 };
  const automationStatus = stats.automationStatus || { value: 'Auto', change: 0 };
  const energyData = data?.energyData || [];
  const usageData = data?.usageData || [];

  console.log('Dashboard data received:', {
    stats,
    energyDataLength: energyData.length,
    usageDataLength: usageData.length
  });

  // Test Firebase connection
  useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
        const response = await fetch('https://smart-home-5bf1a-default-rtdb.asia-southeast1.firebasedatabase.app/.json');
        console.log('Firebase connection test:', response.status, response.ok);
        if (response.ok) {
          const data = await response.json();
          console.log('Firebase data keys:', Object.keys(data || {}));
        }
      } catch (error) {
        console.error('Firebase connection test failed:', error);
      }
    };
    
    testFirebaseConnection();
  }, []);

  // Add error boundary to prevent React crashes
  if (!data || !stats) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium">
            Loading dashboard data...
          </div>
        </div>
      </Layout>
    );
  }

  // Ensure all required data exists to prevent React errors
  const safeEnergyData = Array.isArray(energyData) ? energyData : [];
  const safeUsageData = Array.isArray(usageData) ? usageData : [];

  try {
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
              value={energyUsage.value}
              change={energyUsage.change}
              icon={<Bolt className="h-6 w-6" />}
            />
            <StatCard 
              title="Peak Usage"
              value={efficiency.value}
              change={efficiency.change}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <StatCard 
              title="Automation Status"
              value={automationStatus.value}
              change={automationStatus.change}
              icon={<Zap className="h-6 w-6" />}
            />
          </div>
          
          {/* Charts and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <LineChart 
                title="Device Power Consumption"
                data={safeEnergyData}
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
                  ...safeUsageData.map(item => ({
                    name: item.name,
                      usage: Number((Number(item.value) / 1000).toFixed(2))
                  })),
                  {
                    name: 'Fan',
                    usage: safeEnergyData && safeEnergyData.length > 0 
                        ? Number((safeEnergyData.reduce((sum, item) => sum + Number(item.fanPower), 0) / 1000).toFixed(2))
                        : 0
                    },
                    {
                      name: 'Refrigerator',
                      usage: safeEnergyData && safeEnergyData.length > 0 
                        ? Number((safeEnergyData.reduce((sum, item) => sum + Number(item.refrigeratorPower), 0) / 1000).toFixed(2))
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
                    <div className={`w-3 h-3 rounded-full ${safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].acPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 ? (Number(safeEnergyData[safeEnergyData.length - 1].acPower) / 1000).toFixed(2) : '0.00'} kW
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].acPower) > 0 ? 'Running' : 'Idle'}
                  </p>
                </div>
                {/* Fan Status */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">Fan</h4>
                    <div className={`w-3 h-3 rounded-full ${safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].fanPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 ? (Number(safeEnergyData[safeEnergyData.length - 1].fanPower) / 1000).toFixed(2) : '0.00'} kW
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].fanPower) > 0 ? 'Running' : 'Idle'}
                  </p>
                </div>
                {/* Lighting Status */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">Lighting</h4>
                    <div className={`w-3 h-3 rounded-full ${safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].lightPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 ? (Number(safeEnergyData[safeEnergyData.length - 1].lightPower) / 1000).toFixed(2) : '0.00'} kW
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].lightPower) > 0 ? 'On' : 'Off'}
                  </p>
                </div>
                {/* Refrigerator Status */}
                <div className="bg-card rounded-lg p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">Refrigerator</h4>
                    <div className={`w-3 h-3 rounded-full ${safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].refrigeratorPower) > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 ? (Number(safeEnergyData[safeEnergyData.length - 1].refrigeratorPower) / 1000).toFixed(2) : '0.00'} kW
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {safeEnergyData && safeEnergyData.length > 0 && Number(safeEnergyData[safeEnergyData.length - 1].refrigeratorPower) > 0 ? 'Running' : 'Idle'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  } catch (error) {
    console.error('Dashboard render error:', error);
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium text-red-500">
            Error loading dashboard. Please refresh the page.
          </div>
        </div>
      </Layout>
    );
  }
};

export default Dashboard;

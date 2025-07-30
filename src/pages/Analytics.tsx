import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { useRealtimeDashboardData } from '@/services/mergedMockDataWithRealtime';
import { useUserData } from '@/hooks/useUserData';
import { Bolt, Zap, Gauge } from 'lucide-react';

const Analytics = () => {
  const { data, isLoading: loading } = useRealtimeDashboardData();
  const { trackPageAccess } = useUserData();

  // Track page access when component mounts
  useEffect(() => {
    trackPageAccess('Analytics');
  }, [trackPageAccess]);

  // Helper to format power in kW (convert watts to kilowatts) - 3 decimal points
  const toKW = (val: number) => (typeof val === 'number' ? (val / 1000).toFixed(3) : '0.000');
  // Helper to format total usage in kWh (convert watt-minutes to kilowatt-hours) - 3 decimal points
  const totalKWh = (arr: any[], key: string) => arr ? (arr.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0) / 60 / 1000).toFixed(3) : '0.000';
  
  // Helper to format total usage with multipliers and kWh unit
  const totalKWhWithMultiplier = (arr: any[], key: string, multiplier: number = 1) => {
    const baseValue = arr ? (arr.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0) / 60 / 1000) : 0;
    return `${(baseValue * multiplier).toFixed(3)} kWh`;
  };

  // Device summary table columns
  const deviceColumns = [
    { key: 'name', header: 'Device', sortable: true },
    { key: 'latest', header: 'Latest Value (kW)', sortable: true },
    { key: 'total', header: 'Total Usage (kWh)', sortable: true },
  ];

  // Prepare device summary data
  const deviceData = [
    {
      name: 'AC',
      latest: data?.energyData && data.energyData.length > 0 ? toKW(Number(data.energyData[data.energyData.length - 1].acPower)) : 'N/A',
      total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'acPower', 0.5) : '0.000 kWh',
    },
    {
      name: 'Lights',
      latest: data?.energyData && data.energyData.length > 0 ? toKW(Number(data.energyData[data.energyData.length - 1].lightPower)) : 'N/A',
      total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'lightPower', 1) : '0.000 kWh',
    },
    {
      name: 'Fan',
      latest: data?.energyData && data.energyData.length > 0 ? toKW(Number(data.energyData[data.energyData.length - 1].fanPower)) : 'N/A',
      total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'fanPower', 1) : '0.000 kWh',
    },
    {
      name: 'Refrigerator',
      latest: data?.energyData && data.energyData.length > 0 ? toKW(Number(data.energyData[data.energyData.length - 1].refrigeratorPower)) : 'N/A',
      total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'refrigeratorPower', 1) : '0.000 kWh',
    },
  ];

  // Debug: Log the latest data points to see what we're getting
  if (data?.energyData && data.energyData.length > 0) {
    const latestData = data.energyData[data.energyData.length - 1];
    console.log('Analytics - Latest data point:', {
      timestamp: latestData.name,
      acPower: latestData.acPower,
      fanPower: latestData.fanPower,
      lightPower: latestData.lightPower,
      refrigeratorPower: latestData.refrigeratorPower
    });
    
    // Also log the last 3 data points to see the trend
    const last3Points = data.energyData.slice(-3);
    console.log('Analytics - Last 3 data points:', last3Points.map(point => ({
      timestamp: point.name,
      acPower: point.acPower,
      fanPower: point.fanPower,
      lightPower: point.lightPower
    })));
  }

  // Format date and time for the table (from 'name' field)
  const parseDateTime = (name: string) => {
    // Full format: 2025-06-17_19-20
    if (/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(name)) {
      const [date, hm] = name.split('_');
      const [year, month, day] = date.split('-');
      const [h, m] = hm.split('-');
      return {
        date: `${day}/${month}/${year}`,
        time: `${h}:${m}`
      };
    }
    // Only time (e.g., 19-20 or 05-36)
    if (/^\d{2}-\d{2}$/.test(name)) {
      const [h, m] = name.split('-');
      // Use today's date
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      return {
        date: `${day}/${month}/${year}`,
        time: `${h}:${m}`
      };
    }
    // Fallback
    return { date: name, time: '' };
  };

  if (loading || !data) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium animate-pulse-gentle">
            Loading analytics data...
          </div>
        </div>
      </Layout>
    );
  }

  // Add fallback values for missing data
  const energyData = data?.energyData || [];
  const usageData = data?.usageData || [];

  console.log('Analytics data received:', {
    energyDataLength: energyData.length,
    usageDataLength: usageData.length,
    acTotal: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
    acTotalKWh: totalKWhWithMultiplier(energyData, 'acPower', 1),
    // Raw calculation breakdown (data is already in kW)
    acRawSum: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
    acDividedBy60: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0) / 60,
    acFinalKWh: (energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0) / 60).toFixed(3),
    // Check if data is already in kW (values should be small like 0.5, 1.2, etc.)
    acSampleValues: energyData.slice(0, 5).map(item => item.acPower),
    acMaxValue: Math.max(...energyData.map(item => item.acPower)),
    acMinValue: Math.min(...energyData.map(item => item.acPower)),
    firstFewDataPoints: energyData.slice(0, 3).map(item => ({
      name: item.name,
      acPower: item.acPower,
      lightPower: item.lightPower,
      fanPower: item.fanPower
    }))
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Real-time summary and trends from your devices</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total AC Usage"
            value={totalKWhWithMultiplier(data?.energyData || [], 'acPower', 0.5)}
            change={0}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard
            title="Total Lights Usage"
            value={totalKWhWithMultiplier(data?.energyData || [], 'lightPower', 1)}
            change={0}
            icon={<Zap className="h-6 w-6" />}
          />
          <StatCard
            title="Total Fan Usage"
            value={totalKWhWithMultiplier(data?.energyData || [], 'fanPower', 1)}
            change={0}
            icon={<Gauge className="h-6 w-6" />}
          />
          <StatCard
            title="Total Refrigerator Usage"
            value={totalKWhWithMultiplier(data?.energyData || [], 'refrigeratorPower', 1)}
            change={0}
            icon={<Gauge className="h-6 w-6 text-cyan-500" />}
          />
        </div>

        {/* Device Summary Table */}
        <div className="mb-6">
          <DataTable
            title="Device Summary"
            columns={deviceColumns}
            data={deviceData}
          />
        </div>

        {/* Minute-by-Minute Device Data Table */}
        <div className="mb-6">
          <DataTable
            title="Minute-by-Minute Device Data"
            columns={[
              { key: 'date', header: 'Date', sortable: true, render: (_: any, row: any) => parseDateTime(row.name).date },
              { key: 'time', header: 'Time', sortable: true, render: (_: any, row: any) => parseDateTime(row.name).time },
              { key: 'acPower', header: 'AC Power (kW)', sortable: true, render: (val: number) => toKW(val) },
              { key: 'fanPower', header: 'Fan Power (kW)', sortable: true, render: (val: number) => toKW(val) },
              { key: 'lightPower', header: 'Light Power (kW)', sortable: true, render: (val: number) => toKW(val) },
              { key: 'refrigeratorPower', header: 'Refrigerator Power (kW)', sortable: true, render: (val: number) => toKW(val) },
            ]}
            data={data?.energyData?.slice(-25).reverse() ?? []}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
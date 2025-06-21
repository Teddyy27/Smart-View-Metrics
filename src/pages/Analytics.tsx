import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { useDashboardData } from '@/services/mergedMockDataWithRealtime';
import { useUserData } from '@/hooks/useUserData';
import { Bolt, Zap, Gauge } from 'lucide-react';

const Analytics = () => {
  const { data, loading } = useDashboardData();
  const { trackPageAccess } = useUserData();

  // Track page access when component mounts
  useEffect(() => {
    trackPageAccess('Analytics');
  }, [trackPageAccess]);

  // Helper to format power in kW
  const toKW = (val: number) => (typeof val === 'number' ? (val / 1000).toFixed(3) : '0.000');
  // Helper to format total usage in kWh
  const totalKWh = (arr: any[], key: string) => arr ? (arr.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0) / 1000).toFixed(3) : '0.000';

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
      total: data?.energyData ? totalKWh(data.energyData, 'acPower') : 0,
    },
    {
      name: 'Lighting',
      latest: data?.energyData && data.energyData.length > 0 ? toKW(Number(data.energyData[data.energyData.length - 1].lightPower)) : 'N/A',
      total: data?.energyData ? totalKWh(data.energyData, 'lightPower') : 0,
    },
    {
      name: 'Fan',
      latest: data?.energyData && data.energyData.length > 0 ? toKW(Number(data.energyData[data.energyData.length - 1].fanPower)) : 'N/A',
      total: data?.energyData ? totalKWh(data.energyData, 'fanPower') : 0,
    },
  ];

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

  if (loading) {
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Real-time summary and trends from your devices</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total AC Usage"
            value={deviceData[0].total}
            change={0}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard
            title="Total Lighting Usage"
            value={deviceData[1].total}
            change={0}
            icon={<Zap className="h-6 w-6" />}
          />
          <StatCard
            title="Total Fan Usage"
            value={deviceData[2].total}
            change={0}
            icon={<Gauge className="h-6 w-6" />}
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
            ]}
            data={data?.energyData?.slice(-25).reverse() ?? []}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
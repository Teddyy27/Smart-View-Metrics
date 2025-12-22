import React, { useRef, useState, useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import PieChart from '@/components/dashboard/PieChart';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Zap, DollarSign, Calendar, Home } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface RoomStats {
  name: string;
  actualEnergyAtRate: number; // In Rupees
  predictedEnergyAtRate: number; // In Rupees
  actualEnergy: number; // KWh
  predictedEnergy: number; // KWh
}

interface ReportStats {
  totalBill: number;
  totalEnergy: number;
  nextMonthBill: number;
  nextMonthEnergy: number;
  rooms: RoomStats[];
}

const Report = () => {
  const reportRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const { devices, loading: devicesLoading } = useDevices();

  // Constants
  const ENERGY_RATE = 8.5; // Rupees per kWh

  // Calculations
  const stats: ReportStats = useMemo(() => {
    if (devices.length === 0) return {
      totalBill: 0,
      totalEnergy: 0,
      nextMonthBill: 0,
      nextMonthEnergy: 0,
      rooms: []
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();

    // Helper to check if a log is from current month
    const isCurrentMonth = (timestampStr: string) => {
      // Format: YYYY-MM-DD_HHmm
      if (!timestampStr) return false;
      const parts = timestampStr.split('_');
      if (parts.length < 1) return false;
      const dateParts = parts[0].split('-');
      if (dateParts.length < 3) return false;

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // 0-based

      return year === currentYear && month === currentMonth;
    };

    // Helper to check if a log is from last month (for trend analysis if needed, skipping for now)

    const roomData: Record<string, { totalWatts: number }> = {};

    devices.forEach(device => {
      const roomName = device.room || 'Unassigned';
      if (!roomData[roomName]) {
        roomData[roomName] = { totalWatts: 0 };
      }

      if (device.power_logs) {
        Object.entries(device.power_logs).forEach(([timestamp, power]) => {
          if (isCurrentMonth(timestamp)) {
            roomData[roomName].totalWatts += (Number(power) || 0);
          }
        });
      }
    });

    const rooms: RoomStats[] = Object.entries(roomData).map(([name, data]) => {
      // Convert Watts (sampled every minute) to kWh
      // Total Watt-Minutes / 60 = Total Watt-Hours
      // Total Watt-Hours / 1000 = kWh
      const actualKWh = (data.totalWatts / 60) / 1000;

      // Prediction Logic: 
      // Average Daily Usage = Actual / Current Day
      // Predicted = Actual + (Avg Daily * (Days in Month - Current Day))

      // If currentDay is 1 (start of month), prediction might be volatile. 
      // We can fallback to data from previous months if available, but for now simple extrapolation.

      // Avoid division by zero if it's very early on 1st day (use 1 as divisor minimum, or 0.5 for half day?)
      // Let's use currentDay (fractional if we had time, but Integer is fine). 
      // If we are at day 5, we have roughly 5 days of data.

      const avgDailyKWh = currentDay > 0 ? actualKWh / currentDay : 0;
      const remainingDays = daysInMonth - currentDay;
      const predictedKWh = actualKWh + (avgDailyKWh * remainingDays);

      return {
        name,
        actualEnergy: actualKWh,
        predictedEnergy: predictedKWh,
        actualEnergyAtRate: actualKWh * ENERGY_RATE,
        predictedEnergyAtRate: predictedKWh * ENERGY_RATE
      };
    });

    const totalEnergy = rooms.reduce((acc, r) => acc + r.predictedEnergy, 0);
    const totalBill = totalEnergy * ENERGY_RATE;

    // Simple forecast for next month (e.g., same as this month for now, or +5% variation)
    // Refined: Maybe season based? But simple is: 
    const nextMonthEnergy = totalEnergy;
    const nextMonthBill = totalBill;

    return {
      totalBill,
      totalEnergy,
      nextMonthBill,
      nextMonthEnergy,
      rooms: rooms.sort((a, b) => b.predictedEnergyAtRate - a.predictedEnergyAtRate)
    };
  }, [devices]);

  const loading = authLoading || devicesLoading;

  // Pie Chart Data (Bill Breakdown by Room)
  const pieChartData = stats.rooms.map((room, index) => ({
    name: room.name,
    value: parseFloat(room.predictedEnergyAtRate.toFixed(2)),
    color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'][index % 6]
  })).filter(item => item.value > 0);

  // PDF Export
  const handleExportPDF = () => {
    if (reportRef.current) {
      const opt = {
        margin: 10,
        filename: 'smartview_energy_report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(reportRef.current).save();
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvRows = [
      ['Room', 'Projected Energy (kWh)', 'Projected Cost (₹)'],
      ...stats.rooms.map(r => [
        r.name,
        r.predictedEnergy.toFixed(2),
        r.predictedEnergyAtRate.toFixed(2)
      ]),
      [],
      ['Total', stats.totalEnergy.toFixed(2), stats.totalBill.toFixed(2)]
    ];
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartview_energy_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium animate-pulse-gentle">
            Loading report data...
          </div>
        </div>
      </Layout>
    );
  }

  // Current Month Name
  const monthName = new Date().toLocaleString('default', { month: 'long' });
  const year = new Date().getFullYear();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8">
        {/* Export/Print Buttons */}
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors" onClick={handleExportPDF}>
            Export PDF
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors" onClick={handleExportCSV}>
            Export CSV
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors" onClick={handlePrint}>
            Print Report
          </button>
        </div>

        <div ref={reportRef} className="bg-white p-6 rounded-lg shadow-sm">
          {/* Header Section */}
          <div className="mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">SmartView Energy Report</h1>
            <p className="text-muted-foreground">
              Energy consumption analysis and predictions for {monthName} {year}
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Projected Monthly Bill</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{stats.totalBill.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated for {monthName} (Rate: ₹{ENERGY_RATE}/kWh)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Projected Energy Usage</CardTitle>
                <Zap className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalEnergy.toFixed(2)} kWh</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated for {monthName}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Highest Consuming Room</CardTitle>
                <Home className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 truncate">
                  {stats.rooms.length > 0 ? stats.rooms[0].name : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{stats.rooms.length > 0 ? stats.rooms[0].predictedEnergyAtRate.toFixed(0) : 0} estimated cost
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Bill Breakdown Pie Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Predicted Bill by Room</CardTitle>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 ? (
                  <PieChart
                    title=""
                    data={pieChartData}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground bg-gray-50 rounded-md">
                    No energy data available for this month
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Room Comparison Bar Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Room Energy Usage Project (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.rooms.length > 0 ? (
                  <BarChart
                    title=""
                    data={stats.rooms.map(r => ({
                      name: r.name,
                      usage: parseFloat(r.predictedEnergy.toFixed(2))
                    }))}
                    bars={[
                      {
                        key: 'usage',
                        color: '#3b82f6',
                        name: 'Predicted kWh'
                      }
                    ]}
                    categories={[]}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground bg-gray-50 rounded-md">
                    No energy data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics Table */}
          <Card className="shadow-md mb-6">
            <CardHeader>
              <CardTitle>Detailed Room Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Room</th>
                      <th className="px-4 py-3">Actual Usage (So Far)</th>
                      <th className="px-4 py-3">Predicted Usage (Month End)</th>
                      <th className="px-4 py-3 rounded-tr-lg">Predicted Bill (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.rooms.map((room, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{room.name}</td>
                        <td className="px-4 py-3">{room.actualEnergy.toFixed(2)} kWh</td>
                        <td className="px-4 py-3">{room.predictedEnergy.toFixed(2)} kWh</td>
                        <td className="px-4 py-3 text-blue-600 font-semibold">₹{room.predictedEnergyAtRate.toFixed(2)}</td>
                      </tr>
                    ))}
                    {stats.rooms.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold text-gray-900">
                    <tr>
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3">{stats.rooms.reduce((a, b) => a + b.actualEnergy, 0).toFixed(2)} kWh</td>
                      <td className="px-4 py-3">{stats.totalEnergy.toFixed(2)} kWh</td>
                      <td className="px-4 py-3 text-blue-700">₹{stats.totalBill.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Report;
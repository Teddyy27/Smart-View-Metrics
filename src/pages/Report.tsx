import React, { useRef, useState, useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import PieChart from '@/components/dashboard/PieChart';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Zap, Home } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { db } from '@/services/firebase';
import { ref, onValue, off } from 'firebase/database';

const Report = () => {
  const reportRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const { devices } = useDevices();

  const [predictedBill, setPredictedBill] = useState<number>(0);
  const [predictedEnergy, setPredictedEnergy] = useState<number>(0);
  const [nextMonthBill, setNextMonthBill] = useState<number>(0);
  const [nextMonthEnergy, setNextMonthEnergy] = useState<number>(0);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  // Constants
  const ENERGY_RATE = 8.5; // Rupees per kWh

  useEffect(() => {
    // Specific endpoints for Predictions/Forecasts
    const currentBillRef = ref(db, 'current_month_bill');
    const currentEnergyRef = ref(db, 'current_month_energy');
    const nextBillRef = ref(db, 'next_month_bill');
    const nextEnergyRef = ref(db, 'next_month_energy');

    const handleCurrentBill = (snap: any) => {
      const val = snap.val();
      setPredictedBill(Number(val?.value || val) || 0);
    };

    const handleCurrentEnergy = (snap: any) => {
      const val = snap.val();
      setPredictedEnergy(Number(val?.value || val) || 0);
    };

    const handleNextBill = (snap: any) => {
      const val = snap.val();
      setNextMonthBill(Number(val?.value || val) || 0);
    };

    const handleNextEnergy = (snap: any) => {
      const val = snap.val();
      setNextMonthEnergy(Number(val?.value || val) || 0);
    };

    const unsubCurrentBill = onValue(currentBillRef, handleCurrentBill);
    const unsubCurrentEnergy = onValue(currentEnergyRef, handleCurrentEnergy);
    const unsubNextBill = onValue(nextBillRef, handleNextBill);
    const unsubNextEnergy = onValue(nextEnergyRef, handleNextEnergy);

    setLoadingFirebase(false);

    return () => {
      off(currentBillRef, 'value', handleCurrentBill);
      off(currentEnergyRef, 'value', handleCurrentEnergy);
      off(nextBillRef, 'value', handleNextBill);
      off(nextEnergyRef, 'value', handleNextEnergy);
    };
  }, []);

  // Calculate ACTUAL Current Bill So Far from device logs
  const currentBillActual = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const isCurrentMonth = (timestampStr: string) => {
      if (!timestampStr) return false;
      const parts = timestampStr.split('_');
      if (parts.length < 1) return false;
      const dateParts = parts[0].split('-');
      if (dateParts.length < 3) return false;
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      return year === currentYear && month === currentMonth;
    };

    let totalWatts = 0;
    devices.forEach(d => {
      if (d.power_log) {
        Object.entries(d.power_log).forEach(([ts, val]) => {
          if (isCurrentMonth(ts)) {
            totalWatts += (Number(val) || 0);
          }
        });
      }
    });

    const totalKWh = (totalWatts / 60) / 1000;
    return totalKWh * ENERGY_RATE;
  }, [devices]);


  // Pie Chart - Distribution of Actual/Predicted share
  const pieChartData = useMemo(() => {
    const roomUsage: Record<string, number> = {};

    devices.forEach(device => {
      const roomName = device.room || 'Unassigned';
      if (!roomUsage[roomName]) roomUsage[roomName] = 0;

      if (device.power_log) {
        const totalWatts = Object.values(device.power_log).reduce((a, b) => a + (Number(b) || 0), 0);
        roomUsage[roomName] += totalWatts;
      }
    });

    const totalSystemWatts = Object.values(roomUsage).reduce((a, b) => a + b, 0);

    return Object.entries(roomUsage).map(([name, watts], index) => {
      // We show the PROPORTION of usage
      // Value can be the relative share of the Predicted Bill for visualization
      const share = totalSystemWatts > 0 ? watts / totalSystemWatts : 0;
      // Using predicted bill to give a forward looking cost breakdown
      const roomBill = predictedBill * share;

      return {
        name,
        value: parseFloat(roomBill.toFixed(2)),
        color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'][index % 6]
      };
    }).filter(item => item.value > 0);
  }, [devices, predictedBill]);


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

  // Print
  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loadingFirebase) {
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
  const nextMonthName = new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString('default', { month: 'long' });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8">
        {/* Export/Print Buttons */}
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors" onClick={handleExportPDF}>
            Export PDF
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
              Financial overview and predictions
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Bill (So Far)</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{currentBillActual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Actual usage for {monthName}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Month Forecast</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{predictedBill.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-normal">
                    {predictedEnergy.toFixed(0)} kWh
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Predicted Energy
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Next Month Forecast</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{nextMonthBill.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-normal">
                    {nextMonthEnergy.toFixed(0)} kWh
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Predicted Energy
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg. Daily Cost</CardTitle>
                <Zap className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 truncate">
                  ₹{(currentBillActual / (new Date().getDate() || 1)).toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on actual usage
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 items-start gap-8 mb-8">
            {/* Bill Breakdown Pie Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Room-wise Cost Distribution (Predicted)</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {pieChartData.length > 0 ? (
                  <div className="w-full max-w-md">
                    <PieChart
                      title=""
                      data={pieChartData}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground bg-gray-50 rounded-md w-full">
                    No device data available for breakdown
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Report;

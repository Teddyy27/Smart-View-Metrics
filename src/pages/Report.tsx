import React, { useRef, useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import LineChart from '@/components/dashboard/LineChart';
import { ref, onValue, off } from 'firebase/database';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface CurrentMonthBill {
  month: string;
  predicted_bill: number;
  predicted_energy_kwh: number;
}

interface NextMonthForecast {
  month: string;
  predicted_bill: number;
  predicted_energy_kwh: number;
  year: number;
}

interface PredictedData {
  current_month_bill: CurrentMonthBill;
  next_month_forecast: NextMonthForecast;
}

interface DailyEnergyData {
  name: string;
  actualTotal: number;
  predictedTotal: number;
  [key: string]: string | number;
}

const Report = () => {
  const reportRef = useRef(null);
  const [predictedData, setPredictedData] = useState<PredictedData>({
    current_month_bill: {
      month: '',
      predicted_bill: 0,
      predicted_energy_kwh: 0
    },
    next_month_forecast: {
      month: '',
      predicted_bill: 0,
      predicted_energy_kwh: 0,
      year: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyEnergyData, setDailyEnergyData] = useState<DailyEnergyData[]>([]);
  const { user, loading: authLoading } = useAuth();

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}`;
    } catch {
      return dateString;
    }
  };

  // Test Firebase connection
  useEffect(() => {
    console.log('Testing Firebase connection...');
    const testRef = ref(db, '.info/connected');
    const unsubscribeTest = onValue(testRef, (snapshot) => {
      const connected = snapshot.val();
      console.log('Firebase connected:', connected);
      if (!connected) {
        setError('Not connected to Firebase');
        setLoading(false);
      }
    });
    
    return () => off(testRef, 'value', unsubscribeTest);
  }, []);

    // Fetch energy data and calculate daily totals
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setError('Please log in to view reports');
      setLoading(false);
      return;
    }

    console.log('Fetching energy data from Firebase...');
    
    // Store all device data
    let allDeviceData: { [deviceType: string]: any } = {};
    let dataReceived = 0;
    const totalDevices = 4;

    // Process and aggregate energy data by day (using Analytics page logic)
    const processAllEnergyData = () => {
      if (dataReceived < totalDevices) return; // Wait for all data

      const dailyTotals: { 
        [key: string]: { 
          acTotal: number; 
          lightingTotal: number; 
          fanTotal: number; 
          refrigeratorTotal: number; 
          peak: number 
        } 
      } = {};
      
      // Process all device data together with Analytics page logic
      Object.entries(allDeviceData).forEach(([deviceType, data]) => {
        Object.entries(data).forEach(([timestamp, power]) => {
          const powerValue = Number(power) || 0;
          const date = timestamp.split('_')[0]; // Extract date from timestamp
          
          if (!dailyTotals[date]) {
            dailyTotals[date] = { acTotal: 0, lightingTotal: 0, fanTotal: 0, refrigeratorTotal: 0, peak: 0 };
          }
          
          // Apply Analytics page logic: sum all values, then divide by 60 and 1000
          if (deviceType === 'ac') {
            dailyTotals[date].acTotal += powerValue;
          } else if (deviceType === 'light') {
            dailyTotals[date].lightingTotal += powerValue;
          } else if (deviceType === 'fan') {
            dailyTotals[date].fanTotal += powerValue;
          } else if (deviceType === 'refrigerator') {
            dailyTotals[date].refrigeratorTotal += powerValue;
          }
          
          dailyTotals[date].peak = Math.max(dailyTotals[date].peak, powerValue);
        });
      });

      // Calculate predicted daily total based on current month prediction
      const calculatePredictedDaily = () => {
        const currentMonthPrediction = predictedData.current_month_bill.predicted_energy_kwh;
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        return currentMonthPrediction / daysInMonth;
      };

      const predictedDailyTotal = calculatePredictedDaily();

      // Convert to chart format using Analytics page logic
      const chartData = Object.entries(dailyTotals).map(([date, data]) => {
        // Apply Analytics page multipliers and conversion
        const acKWh = (data.acTotal / 60 / 1000) * 0.3; // AC multiplier 0.3
        const lightingKWh = (data.lightingTotal / 60 / 1000) * 1; // No multiplier
        const fanKWh = (data.fanTotal / 60 / 1000) * 1; // No multiplier
        const refrigeratorKWh = (data.refrigeratorTotal / 60 / 1000) * 0.6; // Refrigerator multiplier 0.6
        
        const actualTotal = acKWh + lightingKWh + fanKWh + refrigeratorKWh;
        
        return {
          name: date, // Keep original date format for sorting
          actualTotal: actualTotal,
          predictedTotal: predictedDailyTotal
        };
      });

      // Sort by date and get the last 5 days (oldest first for correct X-axis order)
      const sortedData = chartData.sort((a, b) => a.name.localeCompare(b.name));
      const last5Days = sortedData.slice(-5);
      
      // Add predictive values for missing days and format dates
      const enhancedData = last5Days.map((day, index) => {
        // Create more realistic predictive variation
        const basePrediction = predictedDailyTotal;
        
        // Add trend-based variation (weekend vs weekday patterns)
        const dayOfWeek = new Date(day.name).getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Weekend typically has higher energy usage
        const weekendFactor = isWeekend ? 1.15 : 1.0;
        
        // Add some random variation (±5%)
        const randomVariation = 1 + (Math.random() - 0.5) * 0.1;
        
        // Add trend based on actual data (if available)
        const trendFactor = day.actualTotal > 0 ? 
          Math.min(Math.max(day.actualTotal / basePrediction, 0.8), 1.2) : 1.0;
        
        const enhancedPrediction = basePrediction * weekendFactor * randomVariation * trendFactor;
        
        return {
          ...day,
          name: formatDateForDisplay(day.name), // Format date after sorting
          predictedTotal: enhancedPrediction
        };
      });
      
      setDailyEnergyData(enhancedData);
    };

    // Fetch energy data from various Firebase paths
    const acPowerRef = ref(db, 'ac_power_logs');
    const fanPowerRef = ref(db, 'power_logs');
    const lightPowerRef = ref(db, 'lights/power_logs');
    const refrigeratorPowerRef = ref(db, 'refrigerator/power_logs');

    const unsubscribeAC = onValue(acPowerRef, (snapshot) => {
      allDeviceData['ac'] = snapshot.val() || {};
      dataReceived++;
      processAllEnergyData();
    });

    const unsubscribeFan = onValue(fanPowerRef, (snapshot) => {
      allDeviceData['fan'] = snapshot.val() || {};
      dataReceived++;
      processAllEnergyData();
    });

    const unsubscribeLight = onValue(lightPowerRef, (snapshot) => {
      allDeviceData['light'] = snapshot.val() || {};
      dataReceived++;
      processAllEnergyData();
    });

    const unsubscribeRefrigerator = onValue(refrigeratorPowerRef, (snapshot) => {
      allDeviceData['refrigerator'] = snapshot.val() || {};
      dataReceived++;
      processAllEnergyData();
    });

    return () => {
      off(acPowerRef, 'value', unsubscribeAC);
      off(fanPowerRef, 'value', unsubscribeFan);
      off(lightPowerRef, 'value', unsubscribeLight);
      off(refrigeratorPowerRef, 'value', unsubscribeRefrigerator);
    };
  }, [user, authLoading]);

  // Fetch predicted data from Firebase
  useEffect(() => {
    if (authLoading) {
      console.log('Waiting for authentication...');
      return;
    }

    if (!user) {
      console.log('User not authenticated');
      setError('Please log in to view reports');
      setLoading(false);
      return;
    }

    console.log('User authenticated, setting up Firebase listeners...');
    
    const currentMonthBillRef = ref(db, 'current_month_bill');
    const nextMonthForecastRef = ref(db, 'next_month_forecast');

    console.log('Listening to current_month_bill...');
    const unsubscribeCurrent = onValue(currentMonthBillRef, (snapshot) => {
      const value = snapshot.val();
      console.log('Current month bill data:', value);
      setPredictedData(prev => ({
        ...prev,
        current_month_bill: value || {
          month: '',
          predicted_bill: 0,
          predicted_energy_kwh: 0
        }
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching current_month_bill:', error);
      setError(`Error fetching current month bill: ${error.message}`);
      setLoading(false);
    });

    console.log('Listening to next_month_forecast...');
    const unsubscribeNext = onValue(nextMonthForecastRef, (snapshot) => {
      const value = snapshot.val();
      console.log('Next month forecast data:', value);
      setPredictedData(prev => ({
        ...prev,
        next_month_forecast: value || {
          month: '',
          predicted_bill: 0,
          predicted_energy_kwh: 0,
          year: 0
        }
      }));
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Error fetching next_month_forecast:', error);
      setError(`Error fetching next month forecast: ${error.message}`);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up Firebase listeners...');
      off(currentMonthBillRef, 'value', unsubscribeCurrent);
      off(nextMonthForecastRef, 'value', unsubscribeNext);
    };
  }, [user, authLoading]);

  // PDF Export
  const handleExportPDF = () => {
    if (reportRef.current) {
      html2pdf().from(reportRef.current).save('report.pdf');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvRows = [
      ['Date', 'Actual Total (kWh)', 'Predicted Total (kWh)'],
      ...dailyEnergyData.map(d => [d.name, d.actualTotal.toFixed(2), d.predictedTotal.toFixed(2)]),
    ];
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_energy.csv';
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

  if (error) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium text-red-500">
            Error: {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Export/Print Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          <button className="bg-primary text-white px-3 py-1 rounded" onClick={handleExportPDF}>Export PDF</button>
          <button className="bg-primary text-white px-3 py-1 rounded" onClick={handleExportCSV}>Export CSV</button>
          <button className="bg-primary text-white px-3 py-1 rounded" onClick={handlePrint}>Print</button>
        </div>
        
        <div ref={reportRef}>
          {/* Predicted Bill */}
          <div className="bg-card rounded-lg p-4 mb-6 shadow">
            <h2 className="text-2xl font-bold mb-2">Predicted Bill</h2>
            <div className="text-4xl font-extrabold text-primary">₹{predictedData.current_month_bill.predicted_bill.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mt-1">{predictedData.current_month_bill.month}</p>
          </div>

          {/* Simple Energy Graph */}
          <div className="bg-card rounded-lg p-6 shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Daily Energy Usage</h3>
            {dailyEnergyData.length > 0 ? (
              <LineChart
                title="Daily Energy Usage (Last 5 Days)"
                data={dailyEnergyData}
                lines={[
                  { key: 'actualTotal', color: '#3b82f6', name: 'Actual Total (kWh)' },
                  { key: 'predictedTotal', color: '#10b981', name: 'Predicted Total (kWh)' }
                ]}
                timeRanges={[]}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No energy data available
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-4 shadow">
              <h3 className="text-base font-semibold">Predicted Energy (Current Month)</h3>
              <div className="text-xl font-bold">{predictedData.current_month_bill.predicted_energy_kwh.toFixed(2)} kWh</div>
              <p className="text-sm text-muted-foreground">{predictedData.current_month_bill.month}</p>
            </div>
            <div className="bg-card rounded-lg p-4 shadow">
              <h3 className="text-base font-semibold">Predicted Bill (Next Month)</h3>
              <div className="text-xl font-bold">₹{predictedData.next_month_forecast.predicted_bill.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">{predictedData.next_month_forecast.month} {predictedData.next_month_forecast.year}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Report; 
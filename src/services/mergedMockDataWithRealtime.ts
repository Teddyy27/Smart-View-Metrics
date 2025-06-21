// Types for our data structures
interface EnergyRecord {
  time: number;
  timestamp: string;
  name: string;
  useKW: number;
  genKW: number;
  solarKW: number;
  fridgeKW: number;
  microwaveKW: number;
  livingRoomKW: number;
  temperature: number;
  humidity: number;
  summary: string;
  windSpeed: number;
}

interface StatValue {
  value: string | number;
  change: number;
}

interface DashboardStats {
  energyUsage: StatValue;
  savings: StatValue;
  efficiency: StatValue;
  automationStatus: StatValue;
}

interface ChartDataPoint {
  name: string;
  consumption: number;
  prediction: number;
  benchmark: number;
  [key: string]: string | number;
}

interface UsageDataPoint {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface RevenueDataPoint {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  [key: string]: string | number;
}

interface AlertRecord {
  id: number;
  type: 'Critical' | 'Warning' | 'Info';
  system: string;
  location: string;
  message: string;
  timestamp: string;
  status: 'Active' | 'Resolved';
}

export interface DashboardData {
  stats: DashboardStats;
  energyData: ChartDataPoint[];
  usageData: UsageDataPoint[];
  revenueData: RevenueDataPoint[];
  alertsData: AlertRecord[];
}

// Generate mock data for our energy dashboard
export const generateMockData = (): DashboardData => {
  // Generate energy consumption data
  const generateEnergyData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const startTime = now.getTime() - (24 * 60 * 60 * 1000); // 24 hours ago

    for (let i = 0; i < 24; i++) {
      const time = new Date(startTime + (i * 60 * 60 * 1000));
      data.push({
        name: time.toLocaleTimeString([], { hour: '2-digit' }),
        consumption: Math.random() * 2 + 1, // 1-3 kW
        prediction: Math.random() * 2 + 1,
        benchmark: 2.5 // Average consumption
      });
    }
    return data;
  };

  // Generate usage distribution data
  const generateUsageData = (): UsageDataPoint[] => {
    return [
      { name: 'HVAC', value: 40, color: '#3b82f6' },
      { name: 'Lighting', value: 20, color: '#8b5cf6' },
      { name: 'Equipment', value: 25, color: '#10b981' },
      { name: 'Other', value: 15, color: '#ef4444' }
    ];
  };

  // Generate revenue analysis data
  const generateRevenueData = (): RevenueDataPoint[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => {
      const revenue = Math.random() * 5000 + 10000;
      const expenses = Math.random() * 3000 + 5000;
      return {
        name: month,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });
  };

  // Generate alerts data
  const generateAlertsData = (): AlertRecord[] => {
    const systems = ['HVAC', 'Lighting', 'Security', 'Energy'];
    const locations = ['Floor 1', 'Floor 2', 'Basement', 'Exterior'];
    const messages = [
      'High energy consumption detected',
      'System maintenance required',
      'Optimal performance achieved',
      'Potential system failure detected'
    ];

    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      type: Math.random() > 0.7 ? 'Critical' : Math.random() > 0.5 ? 'Warning' : 'Info',
      system: systems[Math.floor(Math.random() * systems.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      status: Math.random() > 0.3 ? 'Resolved' : 'Active'
    }));
  };

  // Calculate current metrics
  const calculateMetrics = (): DashboardStats => {
    return {
      energyUsage: {
        value: '2.4 kW',
        change: 5.2
      },
      savings: {
        value: '$1,234',
        change: 12.5
      },
      efficiency: {
        value: '94%',
        change: 2.1
      },
      automationStatus: {
        value: 'Optimal',
        change: 0
      }
    };
  };

  // Return the complete dashboard data
  return {
    stats: calculateMetrics(),
    energyData: generateEnergyData(),
    usageData: generateUsageData(),
    revenueData: generateRevenueData(),
    alertsData: generateAlertsData()
  };
};

export default generateMockData;

// --- Real-time Firebase hook for dashboard data ---
import { db } from './firebase';
import { ref, onValue, off } from 'firebase/database';
import { useEffect, useState } from 'react';

export function useDashboardData(): { data: DashboardData | null, loading: boolean } {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rootRef = ref(db, '/');
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const val = snapshot.val();
      // Debug logs
      console.log('Firebase Data:', val);
      console.log('AC Logs:', val?.ac_power_logs);
      console.log('Fan Logs:', val?.power_logs);
      console.log('Light Logs:', val?.lights?.power_logs);
      
      if (!val) {
        setData(null);
        setLoading(false);
        return;
      }
      // Energy data: merge timestamps from all three logs
      const acLogs = val.ac_power_logs || {};
      const fanLogs = val.power_logs || {};
      const lightLogs = val.lights && val.lights.power_logs ? val.lights.power_logs : {};
      // Collect all unique timestamps
      const allTimestamps = Array.from(new Set([
        ...Object.keys(acLogs),
        ...Object.keys(fanLogs),
        ...Object.keys(lightLogs)
      ])).sort();
      console.log('All Timestamps:', allTimestamps);
      
      const energyData = allTimestamps.map((ts) => {
        const acPower = typeof acLogs[ts] === 'number' ? acLogs[ts] : 0;
        const fanPower = fanLogs[ts] ? Number(fanLogs[ts]) : 0;
        const lightPower = typeof lightLogs[ts] === 'number' ? lightLogs[ts] : 0;
        const totalPower = acPower + fanPower + lightPower;
        
        return {
          name: ts,
          acPower,
          fanPower,
          lightPower,
          totalPower,
          acBenchmark: 2500, // 2.5kW typical AC usage
          fanBenchmark: 500,  // 0.5kW typical fan usage
          lightBenchmark: 300, // 0.3kW typical lighting usage
          consumption: 0, // required by ChartDataPoint, not used
          prediction: 0,  // required by ChartDataPoint, not used
          benchmark: 0    // required by ChartDataPoint, not used
        };
      });
      console.log('Energy Data for Chart:', energyData);
      console.log('Sample Energy Data Point:', energyData[0]);
      
      // Calculate today's peak usage
      const today = new Date();
      const todayPeak = Math.max(...energyData
        .filter(item => {
          try {
            const itemDate = new Date(item.name.split('_')[0]); // Extract date from timestamp
            return itemDate.toDateString() === today.toDateString();
          } catch {
            return false; // Skip items with invalid date format
          }
        })
        .map(item => item.totalPower)
      );
      
      // Usage data (AC and Lighting)
      const usageData = [
        { name: 'AC', value: acLogs ? Number(Object.values(acLogs).reduce((a: any, b: any) => a + b, 0)) : 0, color: '#3b82f6' },
        { name: 'Lighting', value: lightLogs ? Number(Object.values(lightLogs).reduce((a: any, b: any) => a + b, 0)) : 0, color: '#8b5cf6' },
        { name: 'Other', value: 0, color: '#ef4444' }
      ];
      // Revenue data (mock for now)
      const revenueData = [
        { name: 'May', revenue: 0, expenses: 0, profit: 0 }
      ];
      // Alerts data
      const alertsData = [];
      if (val.fan_state === false) {
        alertsData.push({
          id: 1,
          type: 'Warning',
          system: 'AC',
          location: 'Unknown',
          message: 'Fan is off',
          timestamp: new Date().toISOString(),
          status: 'Active'
        });
      }
      if (val.motion_detected === false) {
        alertsData.push({
          id: 2,
          type: 'Info',
          system: 'Lighting',
          location: 'Unknown',
          message: 'No motion detected',
          timestamp: new Date().toISOString(),
          status: 'Active'
        });
      }
      setData({ stats: {
        energyUsage: {
          value: energyData.length > 0 ? `${energyData[energyData.length - 1].totalPower} W` : 'N/A',
          change: 0
        },
        savings: {
          value: '$0',
          change: 0
        },
        efficiency: {
          value: todayPeak > 0 ? `${(todayPeak / 1000).toFixed(1)} kW` : 'N/A',
          change: 0
        },
        automationStatus: {
          value: val.manual_fan_control === false ? 'Auto' : 'Manual',
          change: 0
        }
      }, energyData, usageData, revenueData, alertsData });
      setLoading(false);
    });
    return () => off(rootRef, 'value', unsubscribe);
  }, []);

  return { data, loading };
} 
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
      { name: 'Lights', value: 20, color: '#8b5cf6' },
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
    const systems = ['HVAC', 'Lights', 'Security', 'Energy'];
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
// import { db } from './firebase';
// import { ref, onValue, off } from 'firebase/database';
import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

export function useDashboardData(): { data: DashboardData | null, loading: boolean } {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // const rootRef = ref(db, '/');
    // const unsubscribe = onValue(rootRef, (snapshot) => {
    //   // Real-time listener logic (DISABLED to reduce Firebase usage)
    // });
    // return () => off(rootRef, 'value', unsubscribe);

    // Fetch data from the API route
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard-data');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data: DashboardData = await response.json();
        setData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return { data, loading };
}

/**
 * React Query-powered real-time dashboard data hook
 */
export function useRealtimeDashboardData() {
  // Use React Query to fetch from the API route
  return useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard-data');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute cache
  });
} 
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
import { db } from './firebase';
import { ref, onValue, off } from 'firebase/database';
import { useEffect, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

// Process Firebase data into dashboard format
const processFirebaseData = (firebaseData: any): DashboardData => {
  // Extract energy data from Firebase
  const acLogs = firebaseData?.ac_power_logs || {};
  const fanLogs = firebaseData?.power_logs || {};
  const lightLogs = firebaseData?.lights?.power_log || {};
  const refrigeratorLogs = firebaseData?.refrigerator?.power_logs || {};

  const allTimestamps = Array.from(
    new Set([
      ...Object.keys(acLogs),
      ...Object.keys(fanLogs),
      ...Object.keys(lightLogs),
      ...Object.keys(refrigeratorLogs),
    ])
  ).sort();

  const energyData = allTimestamps.map((ts) => {
    const acPower = typeof acLogs[ts] === 'number' ? acLogs[ts] : 0;
    const fanPower = fanLogs[ts] ? Number(fanLogs[ts]) : 0;
    const lightPower = typeof lightLogs[ts] === 'number' ? lightLogs[ts] : 0;
    const refrigeratorPower = typeof refrigeratorLogs[ts] === 'number' ? refrigeratorLogs[ts] : 0;
    const totalPower = acPower + fanPower + lightPower + refrigeratorPower;

    return {
      name: ts,
      consumption: totalPower / 1000, // Convert to kW
      prediction: totalPower / 1000,
      benchmark: 2.5,
      acPower,
      fanPower,
      lightPower,
      refrigeratorPower,
      totalPower
    };
  });

  // Calculate stats
  const currentPower = energyData.length > 0 ? energyData[energyData.length - 1].totalPower : 0;
  const avgPower = energyData.length > 0 ? energyData.reduce((sum, item) => sum + item.totalPower, 0) / energyData.length : 0;

  return {
    stats: {
      energyUsage: {
        value: `${(currentPower / 1000).toFixed(2)} kW`,
        change: 0
      },
      savings: {
        value: '$0',
        change: 0
      },
      efficiency: {
        value: `${(avgPower / 1000).toFixed(2)} kW`,
        change: 0
      },
      automationStatus: {
        value: firebaseData?.manual_fan_control === false ? 'Auto' : 'Manual',
        change: 0
      }
    },
    energyData,
    usageData: [
      { name: 'AC', value: 40, color: '#3b82f6' },
      { name: 'Lights', value: 20, color: '#8b5cf6' },
      { name: 'Equipment', value: 25, color: '#10b981' },
      { name: 'Other', value: 15, color: '#ef4444' }
    ],
    revenueData: [
      { name: 'May', revenue: 0, expenses: 0, profit: 0 }
    ],
    alertsData: []
  };
};

export function useDashboardData(): { data: DashboardData | null, loading: boolean } {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let hasFirebaseData = false;
    let firebaseUnsubscribe: (() => void) | null = null;

    // Fallback function to fetch from API
    const fetchDataFromAPI = async () => {
      try {
        console.log('Fetching data from API route...');
        const response = await fetch('/api/dashboard-data');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const apiData: DashboardData = await response.json();
        console.log('API data received:', apiData);
        setData(apiData);
      } catch (error) {
        console.error('Error fetching dashboard data from API:', error);
        // Use mock data as final fallback
        const mockData = generateMockData();
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };

    // Try Firebase real-time listener
    try {
      console.log('Setting up Firebase real-time listener...');
      const rootRef = ref(db, '/');
      firebaseUnsubscribe = onValue(rootRef, (snapshot) => {
        try {
          const firebaseData = snapshot.val();
          console.log('Firebase data received:', firebaseData);

          if (firebaseData && (firebaseData.ac_power_logs || firebaseData.power_logs || firebaseData.lights)) {
            hasFirebaseData = true;
            // Process Firebase data and convert to dashboard format
            const processedData = processFirebaseData(firebaseData);
            console.log('Processed Firebase data:', processedData);
            setData(processedData);
            setLoading(false);
          } else {
            console.log('No valid Firebase data found, using API fallback');
            if (!hasFirebaseData) {
              fetchDataFromAPI();
            }
          }
        } catch (error) {
          console.error('Error processing Firebase data:', error);
          if (!hasFirebaseData) {
            fetchDataFromAPI();
          }
        }
      }, (error) => {
        console.error('Firebase listener error:', error);
        if (!hasFirebaseData) {
          fetchDataFromAPI();
        }
      });
    } catch (error) {
      console.error('Error setting up Firebase listener:', error);
      fetchDataFromAPI();
    }

    // Set a timeout to fallback to API if Firebase doesn't respond
    const timeout = setTimeout(() => {
      if (!hasFirebaseData) {
        console.log('Firebase timeout, falling back to API');
        fetchDataFromAPI();
      }
    }, 3000);

    return () => {
      if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
      }
      clearTimeout(timeout);
    };
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
      console.log('React Query: Fetching dashboard data...');
      try {
        const response = await fetch('/api/dashboard-data');
        if (!response.ok) {
          console.error('API response not ok:', response.status, response.statusText);
          throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('React Query: Data received:', data);
        return data;
      } catch (error) {
        console.error('React Query: Error fetching data:', error);
        // Return mock data as fallback
        const mockData = generateMockData();
        console.log('React Query: Using mock data as fallback');
        return mockData;
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
    gcTime: 60000, // Keep in cache for 1 minute
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
  });
} 
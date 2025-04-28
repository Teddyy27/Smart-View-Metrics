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
}

interface UsageDataPoint {
  name: string;
  value: number;
}

interface RevenueDataPoint {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
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

interface DashboardData {
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
      { name: 'HVAC', value: 40 },
      { name: 'Lighting', value: 20 },
      { name: 'Equipment', value: 25 },
      { name: 'Other', value: 15 }
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
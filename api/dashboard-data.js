// api/dashboard-data.js
export const config = { runtime: 'edge' };

let cache = {
  data: null,
  lastFetched: 0
};

export default async function handler(req) {
  const now = Date.now();

  // Cache for 5 minutes (300000 ms)
  if (cache.data && now - cache.lastFetched < 5 * 60 * 1000) {
    return new Response(JSON.stringify(cache.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // --- Fetch from Firebase REST API ---
    const firebaseUrl = 'https://smart-home-5bf1a-default-rtdb.asia-southeast1.firebasedatabase.app/.json';
    console.log('Fetching from Firebase:', firebaseUrl);
    
    const response = await fetch(firebaseUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Firebase response not ok:', response.status, response.statusText);
      throw new Error(`Firebase fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const val = await response.json();
    console.log('Firebase data received:', Object.keys(val || {}));

    // --- Process data to match dashboard structure ---
    const acLogs = val?.ac_power_logs || {};
    const fanLogs = val?.power_logs || {};
    const lightLogs = val?.lights?.power_logs || {};
    const refrigeratorLogs = val?.refrigerator?.power_logs || {};

    console.log('Device logs found:', {
      ac: Object.keys(acLogs).length,
      fan: Object.keys(fanLogs).length,
      light: Object.keys(lightLogs).length,
      refrigerator: Object.keys(refrigeratorLogs).length
    });

    const allTimestamps = Array.from(
      new Set([
        ...Object.keys(acLogs),
        ...Object.keys(fanLogs),
        ...Object.keys(lightLogs),
        ...Object.keys(refrigeratorLogs),
      ])
    ).sort();

    console.log('Total timestamps found:', allTimestamps.length);

    const energyData = allTimestamps.map((ts) => {
      const acPower = typeof acLogs[ts] === 'number' ? acLogs[ts] : 0;
      const fanPower = fanLogs[ts] ? Number(fanLogs[ts]) : 0;
      const lightPower = typeof lightLogs[ts] === 'number' ? lightLogs[ts] : 0;
      const refrigeratorPower = typeof refrigeratorLogs[ts] === 'number' ? refrigeratorLogs[ts] : 0;
      const totalPower = acPower + fanPower + lightPower + refrigeratorPower;
      return {
        name: ts,
        acPower,
        fanPower,
        lightPower,
        refrigeratorPower,
        totalPower,
        acBenchmark: 2500,
        fanBenchmark: 500,
        lightBenchmark: 300,
        refrigeratorBenchmark: 200,
        consumption: 0,
        prediction: 0,
        benchmark: 0,
      };
    });

    // Peak usage in last 24 hours
    const nowDate = new Date();
    const currentYear = nowDate.getFullYear();
    const currentMonth = nowDate.getMonth(); // 0-indexed

    // Improved: Filter energyData for current month (1-based month comparison)
    const energyDataThisMonth = energyData.filter(item => {
      const [dateStr] = item.name.split('_');
      const [year, month] = dateStr.split('-');
      return Number(year) === currentYear && parseInt(month, 10) === (currentMonth + 1);
    });

    console.log('Energy data for current month:', energyDataThisMonth.length);

    // If no data for the current month, use zeros
    const safeEnergyData = energyDataThisMonth.length > 0 ? energyDataThisMonth : [{
      name: new Date().toISOString().split('T')[0] + '_00-00',
      acPower: 0,
      fanPower: 0,
      lightPower: 0,
      refrigeratorPower: 0,
      totalPower: 0,
      acBenchmark: 0,
      fanBenchmark: 0,
      lightBenchmark: 0,
      refrigeratorBenchmark: 0,
      consumption: 0,
      prediction: 0,
      benchmark: 0,
    }];

    // Usage data (AC, Lights, Refrigerator) for current month only
    const usageData = [
      {
        name: 'Lights',
        value: 45,
        color: '#8b5cf6'
      },
      {
        name: 'AC',
        value: safeEnergyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
        color: '#3b82f6',
      },
      {
        name: 'Refrigerator',
        value: safeEnergyData.reduce((sum, row) => sum + (typeof row.refrigeratorPower === 'number' ? row.refrigeratorPower : 0), 0),
        color: '#06b6d4',
      },
      {
        name: 'Other',
        value: 0,
        color: '#ef4444',
      },
    ];

    // Revenue data (mock for now)
    const revenueData = [
      {
        name: 'May',
        revenue: 0,
        expenses: 0,
        profit: 0,
      },
    ];

    // Alerts data
    const alertsData = [];
    if (val?.fan_state === false) {
      alertsData.push({
        id: 1,
        type: 'Warning',
        system: 'AC',
        location: 'Unknown',
        message: 'Fan is off',
        timestamp: new Date().toISOString(),
        status: 'Active',
      });
    }
    if (val?.motion_detected === false) {
      alertsData.push({
        id: 2,
        type: 'Info',
        system: 'Lights',
        location: 'Unknown',
        message: 'No motion detected',
        timestamp: new Date().toISOString(),
        status: 'Active',
      });
    }

    // When building dashboardData, use safeEnergyData for energyData
    const dashboardData = {
      stats: {
        energyUsage: {
          value:
            safeEnergyData.length > 0
              ? `${(safeEnergyData[safeEnergyData.length - 1].totalPower / 1000).toFixed(2)} kW`
              : '0.00 kW',
          change: 0,
        },
        savings: {
          value: '$0',
          change: 0,
        },
        efficiency: {
          value: safeEnergyData.length > 0 ? `${(Math.max(...safeEnergyData.map(item => item.totalPower), 0) / 1000).toFixed(2)} kW` : '0.00 kW',
          change: 0,
        },
        automationStatus: {
          value: val?.manual_fan_control === false ? 'Auto' : 'Manual',
          change: 0,
        },
      },
      energyData: safeEnergyData,
      usageData,
      revenueData,
      alertsData,
    };

    console.log('Dashboard data prepared:', {
      energyDataLength: safeEnergyData.length,
      usageDataLength: usageData.length,
      stats: dashboardData.stats
    });

    cache = {
      data: dashboardData,
      lastFetched: now,
    };

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    // Return fallback data instead of error
    const fallbackData = {
      stats: {
        energyUsage: {
          value: '0.00 kW',
          change: 0,
        },
        savings: {
          value: '$0',
          change: 0,
        },
        efficiency: {
          value: '0.00 kW',
          change: 0,
        },
        automationStatus: {
          value: 'Auto',
          change: 0,
        },
      },
      energyData: [{
        name: new Date().toISOString().split('T')[0] + '_00-00',
        acPower: 0,
        fanPower: 0,
        lightPower: 0,
        refrigeratorPower: 0,
        totalPower: 0,
        acBenchmark: 0,
        fanBenchmark: 0,
        lightBenchmark: 0,
        refrigeratorBenchmark: 0,
        consumption: 0,
        prediction: 0,
        benchmark: 0,
      }],
      usageData: [
        { name: 'AC', value: 0, color: '#3b82f6' },
        { name: 'Lighting', value: 0, color: '#8b5cf6' },
        { name: 'Refrigerator', value: 0, color: '#06b6d4' },
        { name: 'Other', value: 0, color: '#ef4444' },
      ],
      revenueData: [{ name: 'May', revenue: 0, expenses: 0, profit: 0 }],
      alertsData: [],
    };

    return new Response(JSON.stringify(fallbackData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
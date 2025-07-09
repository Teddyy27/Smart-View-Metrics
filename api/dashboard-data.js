// api/dashboard-data.ts
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
    const response = await fetch(firebaseUrl);
    if (!response.ok) {
      throw new Error(`Firebase fetch failed: ${response.statusText}`);
    }
    const val = await response.json();

    // --- Process data to match dashboard structure ---
    const acLogs = val.ac_power_logs || {};
    const fanLogs = val.power_logs || {};
    const lightLogs = val.lights && val.lights.power_logs ? val.lights.power_logs : {};
    const refrigeratorLogs = val.refrigerator && val.refrigerator.power_logs ? val.refrigerator.power_logs : {};

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

    // Usage data (AC, Lighting, Refrigerator) for current month only
    const usageData = [
      {
        name: 'AC',
        value: safeEnergyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
        color: '#3b82f6',
      },
      {
        name: 'Lighting',
        value: safeEnergyData.reduce((sum, row) => sum + (typeof row.lightPower === 'number' ? row.lightPower : 0), 0),
        color: '#8b5cf6',
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
    if (val.fan_state === false) {
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
    if (val.motion_detected === false) {
      alertsData.push({
        id: 2,
        type: 'Info',
        system: 'Lighting',
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
              : 'N/A',
          change: 0,
        },
        savings: {
          value: '$0',
          change: 0,
        },
        efficiency: {
          value: safeEnergyData.length > 0 ? `${(Math.max(...safeEnergyData.map(item => item.totalPower), 0) / 1000).toFixed(2)} kW` : 'N/A',
          change: 0,
        },
        automationStatus: {
          value: val.manual_fan_control === false ? 'Auto' : 'Manual',
          change: 0,
        },
      },
      energyData: safeEnergyData,
      usageData,
      revenueData,
      alertsData,
    };

    cache = {
      data: dashboardData,
      lastFetched: now,
    };

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
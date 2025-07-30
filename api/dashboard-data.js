// api/dashboard-data.js
export const config = { runtime: 'edge' };

let cache = {
  data: null,
  lastFetched: 0
};

export default async function handler(req) {
  const now = Date.now();

  // Cache for 30 seconds (30000 ms) - reduced from 5 minutes
  if (cache.data && now - cache.lastFetched < 30 * 1000) {
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
      refrigerator: Object.keys(refrigeratorLogs).length,
      acSample: Object.keys(acLogs).slice(0, 5),
      fanSample: Object.keys(fanLogs).slice(0, 5),
      lightSample: Object.keys(lightLogs).slice(0, 5),
      refrigeratorSample: Object.keys(refrigeratorLogs).slice(0, 5),
      // Sample actual values
      acSampleValues: Object.keys(acLogs).slice(0, 3).map(ts => ({ timestamp: ts, value: acLogs[ts] })),
      fanSampleValues: Object.keys(fanLogs).slice(0, 3).map(ts => ({ timestamp: ts, value: fanLogs[ts] })),
      lightSampleValues: Object.keys(lightLogs).slice(0, 3).map(ts => ({ timestamp: ts, value: lightLogs[ts] }))
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
    
    // Check for duplicate timestamps
    const timestampCounts = {};
    [...Object.keys(acLogs), ...Object.keys(fanLogs), ...Object.keys(lightLogs), ...Object.keys(refrigeratorLogs)].forEach(ts => {
      timestampCounts[ts] = (timestampCounts[ts] || 0) + 1;
    });
    const duplicates = Object.entries(timestampCounts).filter(([ts, count]) => count > 1);
    console.log('Duplicate timestamps found:', duplicates.length, duplicates.slice(0, 5));

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

    // Debug: Show totals from the original energyData
    const acTotal = energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0);
    const acTotalKWh = (acTotal / 60 / 1000).toFixed(3);
    console.log('Original energyData totals:', {
      dataPoints: energyData.length,
      acTotal,
      acTotalKWh,
      acSampleValues: energyData.slice(0, 3).map(item => ({ name: item.name, acPower: item.acPower }))
    });

    // Filter data for recent time periods (last 24 hours for better 1h/24h views)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEnergyData = energyData.filter(item => {
      try {
        const [datePart, timePart] = item.name.split('_');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split('-');
        
        const itemDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        return itemDate >= oneDayAgo;
      } catch (error) {
        console.error('Error parsing timestamp for filtering:', item.name, error);
        return false;
      }
    });

    console.log('Recent energy data (last 24h):', recentEnergyData.length);

    // Use recent data if available, otherwise use current month data
    const finalEnergyData = recentEnergyData.length > 0 ? recentEnergyData : energyData;

    // Peak usage in last 24 hours
    const nowDate = new Date();
    const currentYear = nowDate.getFullYear();
    const currentMonth = nowDate.getMonth(); // 0-indexed

    // Use the filtered recent data for better 1h/24h views
    const safeEnergyData = finalEnergyData.length > 0 ? finalEnergyData : [{
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
        value: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
        color: '#3b82f6',
      },
      {
        name: 'Refrigerator',
        value: energyData.reduce((sum, row) => sum + (typeof row.refrigeratorPower === 'number' ? row.refrigeratorPower : 0), 0),
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
          value: safeEnergyData.length > 0 ? `${(safeEnergyData.reduce((sum, item) => sum + item.totalPower, 0) / safeEnergyData.length / 1000).toFixed(2)} kW` : '0.00 kW',
          change: 0,
        },
        automationStatus: {
          value: val?.manual_fan_control === false ? 'Auto' : 'Manual',
          change: 0,
        },
      },
      energyData: energyData, // Use original unfiltered data for totals
      recentEnergyData: safeEnergyData, // Use filtered data for charts
      usageData,
      revenueData,
      alertsData,
    };

    console.log('Dashboard data prepared:', {
      energyDataLength: safeEnergyData.length,
      fullEnergyDataLength: energyData.length,
      usageDataLength: usageData.length,
      stats: dashboardData.stats,
      acTotal: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
      acTotalKWh: (energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0) / 60 / 1000).toFixed(3)
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
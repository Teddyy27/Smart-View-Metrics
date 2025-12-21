import React, { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { useRealtimeDashboardData } from '@/services/mergedMockDataWithRealtime';
import { useUserData } from '@/hooks/useUserData';
import { useDevices } from '@/hooks/useDevices';
import { deviceService } from '@/services/deviceService';
import { Bolt, Zap, Gauge, Home } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const Analytics = () => {
  const { data, isLoading: loading } = useRealtimeDashboardData();
  const { trackPageAccess } = useUserData();
  const { devices } = useDevices();
  const [selectedRoom, setSelectedRoom] = useState<string>('All Rooms');

  // Track page access when component mounts
  useEffect(() => {
    trackPageAccess('Analytics');
  }, [trackPageAccess]);

  // Helper to format power in kW (convert watts to kilowatts) - 3 decimal points
  const toKW = (val: number) => (typeof val === 'number' ? (val / 1000).toFixed(3) : '0.000');
  // Helper to format total usage in kWh (convert watt-minutes to kilowatt-hours) - 3 decimal points
  const totalKWh = (arr: any[], key: string) => arr ? (arr.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0) / 60 / 1000).toFixed(3) : '0.000';
  
  // Helper to format total usage with multipliers and kWh unit
  const totalKWhWithMultiplier = (arr: any[], key: string, multiplier: number = 1) => {
    const baseValue = arr ? (arr.reduce((sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0), 0) / 60 / 1000) : 0;
    return `${(baseValue * multiplier).toFixed(3)} kWh`;
  };

  // Get all rooms (only rooms that have devices)
  const allRooms = useMemo(() => {
    const rooms = deviceService.getAllRooms();
    // Only show rooms that actually have devices
    return ['All Rooms', ...rooms];
  }, [devices]);

  // Filter devices by selected room
  const filteredDevices = useMemo(() => {
    if (selectedRoom === 'All Rooms') {
      return devices;
    }
    return devices.filter(device => device.room === selectedRoom);
  }, [devices, selectedRoom]);

  // Calculate room-based analytics
  const roomAnalytics = useMemo(() => {
    const roomStats: Record<string, {
      ac: { latest: string; total: string; count: number };
      lights: { latest: string; total: string; count: number };
      fan: { latest: string; total: string; count: number };
      refrigerator: { latest: string; total: string; count: number };
      totalDevices: number;
      onlineDevices: number;
      activeDevices: number;
    }> = {};

    // Initialize stats for each room
    deviceService.getAllRooms().forEach(room => {
      roomStats[room] = {
        ac: { latest: '0.000', total: '0.000 kWh', count: 0 },
        lights: { latest: '0.000', total: '0.000 kWh', count: 0 },
        fan: { latest: '0.000', total: '0.000 kWh', count: 0 },
        refrigerator: { latest: '0.000', total: '0.000 kWh', count: 0 },
        totalDevices: 0,
        onlineDevices: 0,
        activeDevices: 0
      };
    });

    // Calculate stats per room
    filteredDevices.forEach(device => {
      const room = device.room || 'Default Room';
      if (!roomStats[room]) {
        roomStats[room] = {
          ac: { latest: '0.000', total: '0.000 kWh', count: 0 },
          lights: { latest: '0.000', total: '0.000 kWh', count: 0 },
          fan: { latest: '0.000', total: '0.000 kWh', count: 0 },
          refrigerator: { latest: '0.000', total: '0.000 kWh', count: 0 },
          totalDevices: 0,
          onlineDevices: 0,
          activeDevices: 0
        };
      }

      roomStats[room].totalDevices++;
      if (device.status === 'online') roomStats[room].onlineDevices++;
      if (device.state) roomStats[room].activeDevices++;

      // Count devices by type in this room
      if (device.type === 'ac') {
        roomStats[room].ac.count++;
      } else if (device.type === 'light') {
        roomStats[room].lights.count++;
      } else if (device.type === 'fan') {
        roomStats[room].fan.count++;
      } else if (device.type === 'refrigerator') {
        roomStats[room].refrigerator.count++;
      }
    });

    // Calculate power usage per room (distribute total power proportionally)
    if (data?.energyData && data.energyData.length > 5) {
      const latestData = data.energyData[data.energyData.length - 6];
      const totalAC = Number(latestData.acPower) || 0;
      const totalLights = Number(latestData.lightPower) || 0;
      const totalFan = Number(latestData.fanPower) || 0;
      const totalRefrigerator = Number(latestData.refrigeratorPower) || 0;

      const totalACDevices = filteredDevices.filter(d => d.type === 'ac').length;
      const totalLightDevices = filteredDevices.filter(d => d.type === 'light').length;
      const totalFanDevices = filteredDevices.filter(d => d.type === 'fan').length;
      const totalRefrigeratorDevices = filteredDevices.filter(d => d.type === 'refrigerator').length;

      Object.keys(roomStats).forEach(room => {
        const roomDevices = devices.filter(d => d.room === room);
        const roomACDevices = roomDevices.filter(d => d.type === 'ac').length;
        const roomLightDevices = roomDevices.filter(d => d.type === 'light').length;
        const roomFanDevices = roomDevices.filter(d => d.type === 'fan').length;
        const roomRefrigeratorDevices = roomDevices.filter(d => d.type === 'refrigerator').length;

        // Distribute power proportionally
        if (totalACDevices > 0) {
          roomStats[room].ac.latest = toKW((totalAC / totalACDevices) * roomACDevices);
        }
        if (totalLightDevices > 0) {
          roomStats[room].lights.latest = toKW((totalLights / totalLightDevices) * roomLightDevices);
        }
        if (totalFanDevices > 0) {
          roomStats[room].fan.latest = toKW((totalFan / totalFanDevices) * roomFanDevices);
        }
        if (totalRefrigeratorDevices > 0) {
          roomStats[room].refrigerator.latest = toKW((totalRefrigerator / totalRefrigeratorDevices) * roomRefrigeratorDevices);
        }

        // Calculate total usage (simplified - distribute total usage proportionally)
        const totalEnergyData = data.energyData || [];
        if (totalACDevices > 0 && roomACDevices > 0) {
          const acTotal = totalKWhWithMultiplier(totalEnergyData, 'acPower', 0.5);
          const acValue = parseFloat(acTotal.replace(' kWh', ''));
          roomStats[room].ac.total = `${((acValue / totalACDevices) * roomACDevices).toFixed(3)} kWh`;
        }
        if (totalLightDevices > 0 && roomLightDevices > 0) {
          const lightTotal = totalKWhWithMultiplier(totalEnergyData, 'lightPower', 1);
          const lightValue = parseFloat(lightTotal.replace(' kWh', ''));
          roomStats[room].lights.total = `${((lightValue / totalLightDevices) * roomLightDevices).toFixed(3)} kWh`;
        }
        if (totalFanDevices > 0 && roomFanDevices > 0) {
          const fanTotal = totalKWhWithMultiplier(totalEnergyData, 'fanPower', 1);
          const fanValue = parseFloat(fanTotal.replace(' kWh', ''));
          roomStats[room].fan.total = `${((fanValue / totalFanDevices) * roomFanDevices).toFixed(3)} kWh`;
        }
        if (totalRefrigeratorDevices > 0 && roomRefrigeratorDevices > 0) {
          const refTotal = totalKWhWithMultiplier(totalEnergyData, 'refrigeratorPower', 1);
          const refValue = parseFloat(refTotal.replace(' kWh', ''));
          roomStats[room].refrigerator.total = `${((refValue / totalRefrigeratorDevices) * roomRefrigeratorDevices).toFixed(3)} kWh`;
        }
      });
    }

    return roomStats;
  }, [devices, filteredDevices, data, selectedRoom]);

  // Device summary table columns
  const deviceColumns = [
    { key: 'name', header: 'Device', sortable: true },
    { key: 'room', header: 'Room', sortable: true },
    { key: 'latest', header: 'Latest Value (kW)', sortable: true },
    { key: 'total', header: 'Total Usage (kWh)', sortable: true },
  ];

  // Prepare device summary data for selected room
  const deviceData = useMemo(() => {
    if (selectedRoom === 'All Rooms') {
      // Aggregate all rooms
      const allRoomStats = Object.values(roomAnalytics);
      return [
        {
          name: 'AC',
          room: 'All Rooms',
          latest: data?.energyData && data.energyData.length > 5 ? toKW(Number(data.energyData[data.energyData.length - 6].acPower)) : 'N/A',
          total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'acPower', 0.5) : '0.000 kWh',
        },
        {
          name: 'Lights',
          room: 'All Rooms',
          latest: data?.energyData && data.energyData.length > 5 ? toKW(Number(data.energyData[data.energyData.length - 6].lightPower)) : 'N/A',
          total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'lightPower', 1) : '0.000 kWh',
        },
        {
          name: 'Fan',
          room: 'All Rooms',
          latest: data?.energyData && data.energyData.length > 5 ? toKW(Number(data.energyData[data.energyData.length - 6].fanPower)) : 'N/A',
          total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'fanPower', 1) : '0.000 kWh',
        },
        {
          name: 'Refrigerator',
          room: 'All Rooms',
          latest: data?.energyData && data.energyData.length > 5 ? toKW(Number(data.energyData[data.energyData.length - 6].refrigeratorPower)) : 'N/A',
          total: data?.energyData ? totalKWhWithMultiplier(data.energyData, 'refrigeratorPower', 1) : '0.000 kWh',
        },
      ];
    } else {
      const stats = roomAnalytics[selectedRoom];
      if (!stats) return [];
      return [
        {
          name: 'AC',
          room: selectedRoom,
          latest: stats.ac.latest,
          total: stats.ac.total,
        },
        {
          name: 'Lights',
          room: selectedRoom,
          latest: stats.lights.latest,
          total: stats.lights.total,
        },
        {
          name: 'Fan',
          room: selectedRoom,
          latest: stats.fan.latest,
          total: stats.fan.total,
        },
        {
          name: 'Refrigerator',
          room: selectedRoom,
          latest: stats.refrigerator.latest,
          total: stats.refrigerator.total,
        },
      ];
    }
  }, [selectedRoom, roomAnalytics, data]);

  // Debug: Log the latest data points to see what we're getting
  if (data?.energyData && data.energyData.length > 5) {
    const delayedData = data.energyData[data.energyData.length - 6]; // 5 minutes ago
    console.log('Analytics - 5-minute delayed data point:', {
      timestamp: delayedData.name,
      acPower: delayedData.acPower,
      fanPower: delayedData.fanPower,
      lightPower: delayedData.lightPower,
      refrigeratorPower: delayedData.refrigeratorPower
    });
    
    // Also log the last 3 data points to see the trend
    const last3Points = data.energyData.slice(-3);
    console.log('Analytics - Last 3 data points:', last3Points.map(point => ({
      timestamp: point.name,
      acPower: point.acPower,
      fanPower: point.fanPower,
      lightPower: point.lightPower
    })));
  }

  // Format date and time for the table (from 'name' field)
  const parseDateTime = (name: string) => {
    // Full format: 2025-06-17_19-20
    if (/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/.test(name)) {
      const [date, hm] = name.split('_');
      const [year, month, day] = date.split('-');
      const [h, m] = hm.split('-');
      return {
        date: `${day}/${month}/${year}`,
        time: `${h}:${m}`
      };
    }
    // Only time (e.g., 19-20 or 05-36)
    if (/^\d{2}-\d{2}$/.test(name)) {
      const [h, m] = name.split('-');
      // Use today's date
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      return {
        date: `${day}/${month}/${year}`,
        time: `${h}:${m}`
      };
    }
    // Fallback
    return { date: name, time: '' };
  };

  if (loading || !data) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium animate-pulse-gentle">
            Loading analytics data...
          </div>
        </div>
      </Layout>
    );
  }

  // Add fallback values for missing data
  const energyData = data?.energyData || [];
  const usageData = data?.usageData || [];

  console.log('Analytics data received:', {
    energyDataLength: energyData.length,
    usageDataLength: usageData.length,
    acTotal: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
    acTotalKWh: totalKWhWithMultiplier(energyData, 'acPower', 1),
    // Raw calculation breakdown (data is already in kW)
    acRawSum: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0),
    acDividedBy60: energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0) / 60,
    acFinalKWh: (energyData.reduce((sum, row) => sum + (typeof row.acPower === 'number' ? row.acPower : 0), 0) / 60).toFixed(3),
    // Check if data is already in kW (values should be small like 0.5, 1.2, etc.)
    acSampleValues: energyData.slice(0, 5).map(item => item.acPower),
    acMaxValue: Math.max(...energyData.map(item => item.acPower)),
    acMinValue: Math.min(...energyData.map(item => item.acPower)),
    firstFewDataPoints: energyData.slice(0, 3).map(item => ({
      name: item.name,
      acPower: item.acPower,
      lightPower: item.lightPower,
      fanPower: item.fanPower
    }))
  });

  const currentRoomStats = selectedRoom === 'All Rooms' ? null : roomAnalytics[selectedRoom];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Real-time summary and trends from your devices</p>
        </div>

        {/* Room Selector */}
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label htmlFor="room-select" className="text-sm font-medium">Select Room:</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger id="room-select" className="w-[200px]">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {allRooms.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room} {room !== 'All Rooms' && `(${deviceService.getRoomStats(room).totalDevices} devices)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentRoomStats && (
                  <div className="ml-auto text-sm text-muted-foreground">
                    {currentRoomStats.totalDevices} devices | {currentRoomStats.onlineDevices} online | {currentRoomStats.activeDevices} active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title={selectedRoom === 'All Rooms' ? "Total AC Usage" : `AC Usage (${selectedRoom})`}
            value={selectedRoom === 'All Rooms' 
              ? totalKWhWithMultiplier(data?.energyData || [], 'acPower', 0.5)
              : (currentRoomStats?.ac.total || '0.000 kWh')}
            change={0}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard
            title={selectedRoom === 'All Rooms' ? "Total Lights Usage" : `Lights Usage (${selectedRoom})`}
            value={selectedRoom === 'All Rooms'
              ? totalKWhWithMultiplier(data?.energyData || [], 'lightPower', 1)
              : (currentRoomStats?.lights.total || '0.000 kWh')}
            change={0}
            icon={<Zap className="h-6 w-6" />}
          />
          <StatCard
            title={selectedRoom === 'All Rooms' ? "Total Fan Usage" : `Fan Usage (${selectedRoom})`}
            value={selectedRoom === 'All Rooms'
              ? totalKWhWithMultiplier(data?.energyData || [], 'fanPower', 1)
              : (currentRoomStats?.fan.total || '0.000 kWh')}
            change={0}
            icon={<Gauge className="h-6 w-6" />}
          />
          <StatCard
            title={selectedRoom === 'All Rooms' ? "Total Refrigerator Usage" : `Refrigerator Usage (${selectedRoom})`}
            value={selectedRoom === 'All Rooms'
              ? totalKWhWithMultiplier(data?.energyData || [], 'refrigeratorPower', 1)
              : (currentRoomStats?.refrigerator.total || '0.000 kWh')}
            change={0}
            icon={<Gauge className="h-6 w-6 text-cyan-500" />}
          />
        </div>

        {/* Device Summary Table */}
        <div className="mb-6">
          <DataTable
            title="Device Summary"
            columns={deviceColumns}
            data={deviceData}
          />
        </div>

        {/* Minute-by-Minute Device Data Table */}
        <div className="mb-6">
          <DataTable
            title="Minute-by-Minute Device Data (5-min delay)"
            columns={[
              { key: 'date', header: 'Date', sortable: true, render: (_: any, row: any) => parseDateTime(row.name).date },
              { key: 'time', header: 'Time', sortable: true, render: (_: any, row: any) => parseDateTime(row.name).time },
              { key: 'acPower', header: 'AC Power (kW)', sortable: true, render: (val: number) => toKW(val) },
              { key: 'fanPower', header: 'Fan Power (kW)', sortable: true, render: (val: number) => toKW(val) },
              { key: 'lightPower', header: 'Light Power (kW)', sortable: true, render: (val: number) => toKW(val) },
              { key: 'refrigeratorPower', header: 'Refrigerator Power (kW)', sortable: true, render: (val: number) => toKW(val) },
            ]}
            data={data?.energyData?.slice(-30, -5).reverse() ?? []}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
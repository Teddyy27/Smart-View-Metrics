import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import BarChart from '@/components/dashboard/BarChart';
import LineChart from '@/components/dashboard/LineChart';
import PieChart from '@/components/dashboard/PieChart';
import { Bolt, TrendingUp, Zap, Plus, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useDevices } from '@/hooks/useDevices';
import { deviceService } from '@/services/deviceService';
import { useToast } from '@/components/ui/use-toast';
import useSWR from 'swr';
import { useRealtimeDashboardData } from '@/services/mergedMockDataWithRealtime';
import { useUserData } from '@/hooks/useUserData';
import { ref, onValue, off } from 'firebase/database';
import { db } from '@/services/firebase';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Dashboard = () => {
  const { data, isLoading: loading, error } = useRealtimeDashboardData();
  const { trackPageAccess } = useUserData();
  const { devices, loading: devicesLoading } = useDevices();
  const [activeRange, setActiveRange] = useState('1h');
  /* const [devicePowerLogs, setDevicePowerLogs] = useState<Record<string, Record<string, number>>>({}); */
  const { toast } = useToast();

  // Debug logging
  useEffect(() => {
    console.log('Dashboard data state:', { data, loading, error });
    if (data) {
      console.log('Dashboard data received:', {
        hasStats: !!data.stats,
        hasEnergyData: !!data.energyData,
        energyDataLength: data.energyData?.length || 0,
        hasUsageData: !!data.usageData,
        usageDataLength: data.usageData?.length || 0
      });
    }
  }, [data, loading, error]);

  // Track page access when component mounts
  useEffect(() => {
    trackPageAccess('Dashboard');
  }, [trackPageAccess]);

  // Use recent energy data for charts (last 24 hours) and full data for totals
  const energyData = data?.recentEnergyData || data?.energyData || [];
  const fullEnergyData = data?.energyData || [];
  const usageData = data?.usageData || [];

  // Create delayed data (excluding most recent 5 minutes) for charts
  const delayedEnergyData = energyData.length > 5 ? energyData.slice(0, -5) : energyData;

  // Safe data extraction with defaults
  const stats = data?.stats || {};
  const energyUsage = stats.energyUsage || { value: '0.00 kW', change: 0 };
  const automationStatus = stats.automationStatus || { value: 'Auto', change: 0 };

  // Calculate device power consumption from power_logs
  // Now using the enriched power_logs from deviceService
  const calculateDevicePower = (device: { power_log?: Record<string, number> }) => {
    const logs = device.power_log ?? {};
    const entries = Object.entries(logs);

    if (entries.length === 0) {
      return { latest: 0, total: 0 };
    }

    // latest (by timestamp string)
    entries.sort(([a], [b]) => b.localeCompare(a));
    const latest = Number(entries[0][1]) || 0;

    // total kWh (1 log = 1 minute, watts)
    const totalWatts = entries.reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
    const totalKWh = totalWatts / 60000;

    return { latest, total: totalKWh };
  };


  // Get all rooms and their stats with power consumption
  const allRooms = deviceService.getAllRooms();
  const roomStats = useMemo(() => {
    return allRooms.map(room => {
      const stats = deviceService.getRoomStats(room);
      const roomDevices = deviceService.getDevicesByRoom(room);

      // Calculate total power consumption for this room
      let totalRoomPower = 0;
      let latestRoomPower = 0;
      roomDevices.forEach(device => {
        const powerData = calculateDevicePower(device);
        totalRoomPower += powerData.total;
        latestRoomPower += powerData.latest / 1000;
      });

      return {
        name: room,
        ...stats,
        devices: roomDevices,
        totalPower: totalRoomPower, // in kWh
        latestPower: latestRoomPower // in kW
      };
    });
  }, [allRooms]);

  // Calculate total statistics across all rooms
  const totalStats = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const activeDevices = devices.filter(d => d.state).length;
    const totalPower = roomStats.reduce((sum, room) => sum + room.totalPower, 0);
    const latestPower = roomStats.reduce((sum, room) => sum + room.latestPower, 0);

    return {
      totalDevices,
      onlineDevices,
      activeDevices,
      totalPower,
      latestPower
    };
  }, [devices, roomStats]);

  // Calculate peak usage from room power data
  const peakPower = useMemo(() => {
    if (roomStats.length === 0) return 0;
    return Math.max(...roomStats.map(room => room.latestPower));
  }, [roomStats]);

  const efficiency = {
    value: `${peakPower.toFixed(3)} kW`,
    change: 0
  };

  console.log('Dashboard data received:', {
    stats,
    energyDataLength: energyData.length,
    delayedEnergyDataLength: delayedEnergyData.length,
    usageDataLength: usageData.length,
    managedDevices: devices.length,
    totalRooms: allRooms.length
  });

  // Debug: Log room statistics
  console.log('Dashboard - Room Statistics:', roomStats.map(room => ({
    name: room.name,
    totalPower: room.totalPower,
    latestPower: room.latestPower,
    devices: room.devices.length
  })));

  // Handle device toggle
  const handleDeviceToggle = async (deviceId: string, newState: boolean) => {
    try {
      // This function needs to be implemented using deviceService
      // For now, we'll just log and show a toast
      console.log(`Toggling device ${deviceId} to ${newState}`);
      toast({
        title: "Device Updated",
        description: `Device state changed to ${newState ? 'ON' : 'OFF'}`,
      });
    } catch (error) {
      console.error('Error toggling device:', error);
      toast({
        title: "Error",
        description: "Failed to update device state",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-xl font-medium animate-pulse-gentle">
              Loading dashboard data...
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Fetching from Firebase and API...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium text-red-500">
            Error loading dashboard. Please refresh the page.
          </div>
        </div>
      </Layout>
    );
  }

  // Main dashboard render
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your automation control center</p>
          {/* Data Status Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${data ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-muted-foreground">
              {data ? `Data loaded: ${energyData.length} energy points, ${devices.length} devices` : 'No data available'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-2"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards - Room-based */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Power Usage"
            value={`${totalStats.totalPower.toFixed(3)} kWh`}
            change={0}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard
            title="Peak Usage"
            value={efficiency.value}
            change={0}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <StatCard
            title="Active Devices"
            value={totalStats.activeDevices.toString()}
            change={0}
            icon={<Zap className="h-6 w-6" />}
          />
          <StatCard
            title="Total Rooms"
            value={allRooms.length.toString()}
            change={0}
            icon={<Home className="h-6 w-6" />}
          />
        </div>

        {/* Charts - Room-based */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <BarChart
              title="Room Power Consumption Comparison"
              data={roomStats
                .sort((a, b) => b.totalPower - a.totalPower)
                .map(room => ({
                  name: room.name,
                  usage: room.totalPower
                }))}
              bars={[
                {
                  key: 'usage',
                  color: '#3b82f6',
                  name: 'Total Usage (kWh)'
                }
              ]}
              categories={[]}
            />
          </div>
          <div>
            <BarChart
              title="Room Latest Power (kW)"
              data={roomStats
                .sort((a, b) => b.latestPower - a.latestPower)
                .map(room => ({
                  name: room.name,
                  usage: room.latestPower
                }))}
              bars={[
                {
                  key: 'usage',
                  color: '#10b981',
                  name: 'Latest Power (kW)'
                }
              ]}
              categories={[]}
            />
          </div>
        </div>

        {/* Rooms Overview Section */}
        {allRooms.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    <CardTitle>Rooms Overview</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/automation'}
                  >
                    Manage Rooms
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roomStats.map(room => (
                    <div
                      key={room.name}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        // Navigate to automation page with room filter
                        window.location.href = '/automation';
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{room.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {room.totalDevices} device{room.totalDevices !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Home className="w-5 h-5 text-muted-foreground" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Online</span>
                          <span className="font-medium text-green-600">{room.onlineDevices}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Active</span>
                          <span className="font-medium text-blue-600">{room.activeDevices}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Offline</span>
                          <span className="font-medium text-gray-600">
                            {room.totalDevices - room.onlineDevices}
                          </span>
                        </div>
                      </div>

                      {/* Quick device type summary */}
                      {room.devices.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex flex-wrap gap-1">
                            {room.devices.slice(0, 3).map(device => (
                              <Badge
                                key={device.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {device.type}
                              </Badge>
                            ))}
                            {room.devices.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{room.devices.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Quick action button */}
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = '/automation';
                          }}
                        >
                          View Details
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Device Management Section */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Devices</CardTitle>
                <Button onClick={() => window.location.href = '/automation'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Devices
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading devices...</div>
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">No devices configured</div>
                  <Button onClick={() => window.location.href = '/automation'}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Device
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {devices.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{device.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">{device.type}</p>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">{device.room || 'Default Room'}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                            {device.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Last updated: {new Date(device.lastUpdated).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={device.state}
                        onCheckedChange={(checked) => handleDeviceToggle(device.id, checked)}
                        disabled={device.status === 'offline'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

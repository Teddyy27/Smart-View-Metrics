import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import StatCard from '@/components/dashboard/StatCard';
import LineChart from '@/components/dashboard/LineChart';
import BarChart from '@/components/dashboard/BarChart';
import DeviceStatus from '@/components/dashboard/DeviceStatus';
import { Bolt, TrendingUp, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useDevices } from '@/hooks/useDevices';
import { deviceService } from '@/services/deviceService';
import { toast } from '@/components/ui/use-toast';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Dashboard = () => {
  const { data, error, isLoading } = useSWR('/api/dashboard-data', fetcher, {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  const { devices, loading: devicesLoading } = useDevices();
  const [activeRange, setActiveRange] = useState('1h');

  // Safe data extraction with defaults
  const stats = data?.stats || {};
  const energyUsage = stats.energyUsage || { value: '0.00 kW', change: 0 };
  const efficiency = stats.efficiency || { value: '0.00 kW', change: 0 };
  const automationStatus = stats.automationStatus || { value: 'Auto', change: 0 };
  const energyData = data?.energyData || [];
  const usageData = data?.usageData || [];

  // Get latest device power values safely (divide by 10 for conversion)
  const getLatestDevicePower = (deviceKey: string) => {
    if (!energyData || energyData.length === 0) return 0;
    const latestData = energyData[energyData.length - 1];
    return Number(latestData[deviceKey] || 0) / 10; // Divide by 10 for conversion
  };

  const acPower = getLatestDevicePower('acPower');
  const fanPower = getLatestDevicePower('fanPower');
  const lightPower = getLatestDevicePower('lightPower');
  const refrigeratorPower = getLatestDevicePower('refrigeratorPower');

  console.log('Dashboard data received:', {
    stats,
    energyDataLength: energyData.length,
    usageDataLength: usageData.length,
    devicePowers: { acPower, fanPower, lightPower, refrigeratorPower },
    managedDevices: devices.length
  });

  // Simple chart data function
  const getChartData = (activeRange: string) => {
    if (!energyData || energyData.length === 0) return [];
    
    // Return last 20 data points for simplicity
    return energyData.slice(-20);
  };

  // Handle device toggle
  const handleDeviceToggle = async (deviceId: string, newState: boolean) => {
    try {
      await deviceService.toggleDevice(deviceId, newState);
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
  if (isLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <div className="text-xl font-medium animate-pulse-gentle">
            Loading dashboard data...
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
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard 
            title="Energy Usage"
            value={energyUsage.value}
            change={energyUsage.change}
            icon={<Bolt className="h-6 w-6" />}
          />
          <StatCard 
            title="Peak Usage"
            value={efficiency.value}
            change={efficiency.change}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <StatCard 
            title="Automation Status"
            value={automationStatus.value}
            change={automationStatus.change}
            icon={<Zap className="h-6 w-6" />}
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <LineChart 
              title="Device Power Consumption"
              data={energyData}
              lines={[
                { key: 'acPower', color: '#3b82f6', name: 'AC' },
                { key: 'fanPower', color: '#10b981', name: 'Fan' },
                { key: 'lightPower', color: '#8b5cf6', name: 'Light' },
                { key: 'refrigeratorPower', color: '#06b6d4', name: 'Refrigerator' },
                { key: 'totalPower', color: '#f59e0b', name: 'Total Power' },
              ]}
              getChartData={getChartData}
            />
            <div className="mt-2 text-sm text-card-foreground bg-card p-3 rounded-lg">
              <strong>Benchmarks:</strong> AC: 3.5kW | Fan: 0.5kW | Lighting: 0.4kW | Refrigerator: 0.3kW | Total: 4.7kW
            </div>
          </div>
          <div>
            <BarChart
              title="Device Usage (kWh)"
              data={usageData
                .filter((item, index, self) => 
                  index === self.findIndex(t => t.name === item.name)
                )
                .map(item => ({
                  name: item.name,
                  usage: Number((Number(item.value) / 1000).toFixed(2))
                }))}
              bars={[
                {
                  key: 'usage',
                  color: '#3b82f6',
                  name: 'Usage (kWh)'
                }
              ]}
              categories={[]}
            />
          </div>
        </div>

        {/* Device Management Section */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Device Management</CardTitle>
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
                        <p className="text-sm text-muted-foreground">{device.type}</p>
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
        
        {/* Device Status Overview */}
        <div className="mb-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Device Status Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* AC Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">AC</h4>
                  <div className={`w-3 h-3 rounded-full ${acPower > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">{(acPower / 1000).toFixed(2)} kW</p>
                <p className="text-sm text-muted-foreground">{acPower > 0 ? 'Running' : 'Idle'}</p>
              </div>
              {/* Fan Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">Fan</h4>
                  <div className={`w-3 h-3 rounded-full ${fanPower > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">{(fanPower / 1000).toFixed(2)} kW</p>
                <p className="text-sm text-muted-foreground">{fanPower > 0 ? 'Running' : 'Idle'}</p>
              </div>
              {/* Lighting Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">Lighting</h4>
                  <div className={`w-3 h-3 rounded-full ${lightPower > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">{(lightPower / 1000).toFixed(2)} kW</p>
                <p className="text-sm text-muted-foreground">{lightPower > 0 ? 'On' : 'Off'}</p>
              </div>
              {/* Refrigerator Status */}
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-card-foreground">Refrigerator</h4>
                  <div className={`w-3 h-3 rounded-full ${refrigeratorPower > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">{(refrigeratorPower / 1000).toFixed(2)} kW</p>
                <p className="text-sm text-muted-foreground">{refrigeratorPower > 0 ? 'Running' : 'Idle'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

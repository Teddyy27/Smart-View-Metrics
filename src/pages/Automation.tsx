import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Power, 
  Fan, 
  Lightbulb, 
  Droplets, 
  Snowflake, 
  WifiIcon, 
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { AddDeviceDialog } from '@/components/dashboard/AddDeviceDialog';
import { toast } from '@/components/ui/use-toast';

// Types for our devices
interface Device {
  id: string;
  name: string;
  type: 'light' | 'fan' | 'ac' | 'geyser';
  status: 'online' | 'offline';
  isOn: boolean;
  value?: number;
  lastUpdated: string;
}

const ROOM_NAME = "Living Room";

const Automation = () => {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: 'light-1',
      name: 'Main Light',
      type: 'light',
      status: 'online',
      isOn: true,
      value: 80,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'ac-1',
      name: 'AC Unit',
      type: 'ac',
      status: 'online',
      isOn: true,
      value: 24,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'fan-1',
      name: 'Ceiling Fan',
      type: 'fan',
      status: 'online',
      isOn: false,
      value: 0,
      lastUpdated: new Date().toISOString(),
    }
  ]);

  // Handle adding a new device
  const handleAddDevice = (newDevice: Omit<Device, 'id' | 'lastUpdated'>) => {
    const deviceId = `${newDevice.type}-${Date.now()}`;
    const device: Device = {
      ...newDevice,
      id: deviceId,
      lastUpdated: new Date().toISOString(),
    };

    setDevices([...devices, device]);
    toast({
      title: "Device Added",
      description: `${newDevice.name} has been added to ${ROOM_NAME}.`,
    });
  };

  // Handle removing a device
  const handleRemoveDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    setDevices(devices.filter(d => d.id !== deviceId));
    toast({
      title: "Device Removed",
      description: `${device.name} has been removed from ${ROOM_NAME}.`,
      variant: "destructive"
    });
  };

  // Handle device power toggle
  const toggleDevice = (deviceId: string) => {
    setDevices(devices.map(device => 
      device.id === deviceId 
        ? { ...device, isOn: !device.isOn, lastUpdated: new Date().toISOString() }
        : device
    ));
  };

  // Handle value change
  const updateDeviceValue = (deviceId: string, newValue: number) => {
    setDevices(devices.map(device =>
      device.id === deviceId
        ? { ...device, value: newValue, lastUpdated: new Date().toISOString() }
        : device
    ));
  };

  // Get icon for device type
  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'light':
        return <Lightbulb className="h-6 w-6" />;
      case 'ac':
        return <Snowflake className="h-6 w-6" />;
      case 'fan':
        return <Fan className="h-6 w-6" />;
      case 'geyser':
        return <Droplets className="h-6 w-6" />;
      default:
        return <Power className="h-6 w-6" />;
    }
  };

  // Get value label based on device type
  const getValueLabel = (device: Device) => {
    if (!device.value) return '';
    switch (device.type) {
      case 'ac':
      case 'geyser':
        return `${device.value}°C`;
      case 'fan':
      case 'light':
        return `${device.value}%`;
      default:
        return device.value.toString();
    }
  };

  // Format the last updated time
  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{ROOM_NAME} Automation</h1>
            <p className="text-muted-foreground">Manage your room devices</p>
          </div>
          <AddDeviceDialog onAddDevice={handleAddDevice} />
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
              <WifiIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.length}</div>
              <p className="text-xs text-muted-foreground">
                {devices.filter(d => d.status === 'online').length} online
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <Power className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devices.filter(d => d.isOn).length}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Normal</div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <Card key={device.id} className={device.status === 'offline' ? 'opacity-60' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1">
                  <CardTitle className="text-sm font-medium">{device.name}</CardTitle>
                  <CardDescription>{ROOM_NAME}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                    {device.status}
                  </Badge>
                  {getDeviceIcon(device.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Power</span>
                    <Switch
                      checked={device.isOn}
                      onCheckedChange={() => toggleDevice(device.id)}
                      disabled={device.status === 'offline'}
                    />
                  </div>

                  {device.value !== undefined && device.isOn && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">
                          {device.type === 'light' && 'Brightness'}
                          {device.type === 'ac' && 'Temperature'}
                          {device.type === 'fan' && 'Speed'}
                          {device.type === 'geyser' && 'Temperature'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getValueLabel(device)}
                        </span>
                      </div>
                      <Slider
                        value={[device.value]}
                        min={device.type === 'ac' ? 16 : device.type === 'geyser' ? 35 : 0}
                        max={device.type === 'ac' ? 30 : device.type === 'geyser' ? 60 : 100}
                        step={device.type === 'ac' || device.type === 'geyser' ? 1 : 5}
                        onValueChange={([value]) => updateDeviceValue(device.id, value)}
                        disabled={!device.isOn || device.status === 'offline'}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Last updated: {formatLastUpdated(device.lastUpdated)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => handleRemoveDevice(device.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Automation; 
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Power, 
  Fan, 
  Lightbulb, 
  Droplets, 
  Snowflake, 
  WifiIcon, 
  AlertTriangle,
  Trash2,
  Plus
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { db } from '@/services/firebase';
import { ref, set, onValue, off, get, ref as dbRef, set as dbSet } from 'firebase/database';
import { useDevices } from '@/hooks/useDevices';
import { deviceService, deviceTypes } from '@/services/deviceService';
import { DeviceSwitch, useDeviceState } from '@/components/ui/DeviceSwitch';

// Types for our devices
interface AutomationDevice {
  id: string;
  name: string;
  type: string;
  state: boolean;
  lastUpdated: number;
  status: 'online' | 'offline';
}

const ROOM_NAME = "Living Room";

const Automation = () => {
  const { devices, addDevice, removeDevice } = useDevices();
  const [automationDevices, setAutomationDevices] = useState<AutomationDevice[]>([]);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  // Remove togglePath from newDevice state
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: '',
  });

  // Convert devices from deviceService to AutomationDevice format
  useEffect(() => {
    const convertedDevices: AutomationDevice[] = devices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      state: device.state,
      lastUpdated: device.lastUpdated,
      status: device.status,
    }));
    setAutomationDevices(convertedDevices);
  }, [devices]);

  // Real-time listeners for each device's state
  useEffect(() => {
    // Listen to device state changes in Firebase for all current devices
    const listeners: Array<() => void> = [];
    automationDevices.forEach(device => {
      const stateRef = ref(db, `devices/${device.id}/state`);
      const listener = onValue(stateRef, (snap) => {
        setAutomationDevices(prev => prev.map(d =>
          d.id === device.id ? { ...d, state: !!snap.val() } : d
        ));
      });
      listeners.push(() => off(stateRef, 'value', listener));
    });
    // Cleanup listeners when devices change or component unmounts
    return () => {
      listeners.forEach(unsub => unsub());
    };
  // Depend on device IDs so listeners update if devices are added/removed
  }, [automationDevices.map(d => d.id).join(",")]);

  // Utility to toggle device state in Firebase
  const toggleDeviceState = (deviceId: string, newState: boolean) => {
    const deviceRef = ref(db, `devices/${deviceId}/state`);
    set(deviceRef, newState);
    logAutomationTrigger(deviceId, newState);
  };

  // Log automation triggers to Firebase
  const logAutomationTrigger = (deviceId: string, newState: boolean) => {
    const logRef = ref(db, `logs/automation`);
    set(ref(db, `logs/automation/${Date.now()}`), {
      deviceId,
      newState,
      timestamp: Date.now()
    });
  };

  // Handle adding a new device
  const handleAddDevice = async () => {
    if (!newDevice.name.trim() || !newDevice.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    const device = await addDevice(newDevice.name, newDevice.type, ''); // Pass empty string for togglePath
    setNewDevice({ name: '', type: '' });
    setIsAddDeviceOpen(false);
    toast({
      title: "Device Added",
      description: `${device.name} has been added to ${ROOM_NAME}.`
    });
  };

  // Handle removing a device
  const handleRemoveDevice = async (deviceId: string) => {
    const device = automationDevices.find(d => d.id === deviceId);
    if (!device) return;

    try {
    const success = await removeDevice(deviceId);
    if (success) {
      toast({
        title: "Device Removed",
        description: `${device.name} has been removed from ${ROOM_NAME}.`,
        variant: "destructive"
      });
    } else {
        toast({
          title: "Error",
          description: "Failed to remove device",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast({
        title: "Error",
        description: "Failed to remove device",
        variant: "destructive"
      });
    }
  };

  // Update toggleDevice to use the new method
  const toggleDevice = (deviceId: string) => {
    const device = automationDevices.find(d => d.id === deviceId);
    if (!device) return;
    // Use the deviceService toggleDevice method
    deviceService.toggleDevice(device.id, !device.state);
  };

  // Format the last updated time
  const formatLastUpdated = (timestamp: number | undefined) => {
    if (!timestamp || isNaN(timestamp)) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString();
  };

  // Minimal getDeviceIcon for device card icons
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light':
        return <Lightbulb className="h-6 w-6" />;
      case 'ac':
        return <Snowflake className="h-6 w-6" />;
      case 'fan':
        return <Fan className="h-6 w-6" />;
      case 'refrigerator':
        return <Droplets className="h-6 w-6" />;
      default:
        return <Power className="h-6 w-6" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{ROOM_NAME} Automation</h1>
            <p className="text-muted-foreground">Manage your room devices</p>
          </div>
          
          <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Add a new device to your automation system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="Enter device name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-type">Device Type</Label>
                  <Select value={newDevice.type} onValueChange={(value) => setNewDevice({ ...newDevice, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDeviceOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    toast({
                      title: "Device Creation Disabled",
                      description: "Device creation is completely disabled to prevent automatic device creation.",
                      variant: "destructive"
                    });
                  }}
                  disabled
                >
                  Device Creation Disabled
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
              <WifiIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automationDevices.length}</div>
              <p className="text-xs text-muted-foreground">
                {automationDevices.filter(d => d.status === 'online').length} online
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <Power className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automationDevices.filter(d => d.state).length}</div>
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
          {automationDevices.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Power className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices connected</h3>
              <p className="text-muted-foreground mb-4">Add your first device to get started with automation</p>
            </div>
          ) : (
            automationDevices.map(device => (
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
                        checked={device.state}
                        onCheckedChange={checked => toggleDeviceState(device.id, checked)}
                        disabled={device.status === 'offline'}
                      />
                    </div>
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
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Automation; 
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Power, 
  Fan, 
  Lightbulb, 
  Droplets, 
  Snowflake, 
  WifiIcon, 
  AlertTriangle,
  Trash2,
  Plus,
  Edit,
  Pencil
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
  room: string;
  state: boolean;
  lastUpdated: number;
  status: 'online' | 'offline';
}

// Default rooms
const DEFAULT_ROOMS = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Office',
  'Garage',
  'Outdoor'
];

const Automation = () => {
  const { devices, addDevice, removeDevice } = useDevices();
  const [automationDevices, setAutomationDevices] = useState<AutomationDevice[]>([]);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AutomationDevice | null>(null);
  const [editingRoom, setEditingRoom] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('Living Room');
  const [filteredDevices, setFilteredDevices] = useState<AutomationDevice[]>([]);
  // Remove togglePath from newDevice state
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: '',
    room: 'Living Room',
  });
  const [roomType, setRoomType] = useState<string>('Living Room');
  const [roomName, setRoomName] = useState<string>('');

  // Convert devices from deviceService to AutomationDevice format
  useEffect(() => {
    const convertedDevices: AutomationDevice[] = devices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      room: device.room || 'Default Room', // Handle legacy devices without room
      state: device.state,
      lastUpdated: device.lastUpdated,
      status: device.status,
    }));
    setAutomationDevices(convertedDevices);
  }, [devices]);

  // Get all unique rooms from devices (only rooms that have devices)
  const availableRooms = Array.from(new Set(automationDevices.map(d => d.room))).sort();
  // Only show rooms that actually have devices
  const allRooms = availableRooms;

  // Filter devices by selected room
  useEffect(() => {
    if (selectedRoom) {
      const filtered = automationDevices.filter(device => device.room === selectedRoom);
      setFilteredDevices(filtered);
    } else {
      // If no room selected, show all devices
      setFilteredDevices(automationDevices);
    }
  }, [automationDevices, selectedRoom]);

  // Auto-select first room if available and none selected
  useEffect(() => {
    if (!selectedRoom && availableRooms.length > 0) {
      setSelectedRoom(availableRooms[0]);
    }
  }, [availableRooms, selectedRoom]);

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
    const finalRoomName = getFinalRoomName();
    if (!newDevice.name.trim() || !newDevice.type || !roomType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    try {
      const device = await addDevice(newDevice.name, newDevice.type, finalRoomName, ''); // Pass final room name
      setNewDevice({ name: '', type: '', room: finalRoomName });
      setRoomType('Living Room');
      setRoomName('');
      setIsAddDeviceOpen(false);
      setSelectedRoom(finalRoomName); // Switch to the room where device was added
      toast({
        title: "Device Added",
        description: `${device.name} has been added to ${finalRoomName}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add device",
        variant: "destructive"
      });
    }
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
        description: `${device.name} has been removed from ${device.room}.`,
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

  // Handle editing a device
  const handleEditDevice = (device: AutomationDevice) => {
    setEditingDevice(device);
    setNewDevice({
      name: device.name,
      type: device.type,
      room: device.room
    });
    // Parse room type and name
    const roomParts = device.room.split(' ');
    if (roomParts.length > 1) {
      const type = roomParts[0];
      const name = roomParts.slice(1).join(' ');
      setRoomType(type);
      setRoomName(name);
    } else {
      setRoomType(device.room);
      setRoomName('');
    }
    setIsEditDeviceOpen(true);
  };

  // Handle saving device edits
  const handleSaveDeviceEdit = async () => {
    if (!editingDevice || !newDevice.name.trim() || !newDevice.type || !roomType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const finalRoomName = getFinalRoomName();
    try {
      const success = await deviceService.updateDevice(editingDevice.id, {
        name: newDevice.name,
        room: finalRoomName
      });

      if (success) {
        toast({
          title: "Device Updated",
          description: `${newDevice.name} has been updated successfully.`
        });
        setIsEditDeviceOpen(false);
        setEditingDevice(null);
        setNewDevice({ name: '', type: '', room: '' });
        setRoomType('Living Room');
        setRoomName('');
        if (finalRoomName !== selectedRoom) {
          setSelectedRoom(finalRoomName);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update device",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive"
      });
    }
  };

  // Handle editing room name
  const handleEditRoom = (roomName: string) => {
    setEditingRoom(roomName);
    // Parse room type and name
    const roomParts = roomName.split(' ');
    if (roomParts.length > 1) {
      const type = roomParts[0];
      const name = roomParts.slice(1).join(' ');
      setRoomType(type);
      setRoomName(name);
    } else {
      setRoomType(roomName);
      setRoomName('');
    }
    setIsEditRoomOpen(true);
  };

  // Handle saving room rename
  const handleSaveRoomRename = async () => {
    if (!editingRoom || !roomType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const finalRoomName = getFinalRoomName();
    if (finalRoomName === editingRoom) {
      toast({
        title: "No Changes",
        description: "Room name is the same.",
      });
      setIsEditRoomOpen(false);
      return;
    }

    try {
      const result = await deviceService.renameRoom(editingRoom, finalRoomName);
      if (result.success) {
        toast({
          title: "Room Renamed",
          description: `Room renamed from "${editingRoom}" to "${finalRoomName}". ${result.updatedCount} device(s) updated.`
        });
        setIsEditRoomOpen(false);
        setEditingRoom('');
        setRoomType('Living Room');
        setRoomName('');
        if (selectedRoom === editingRoom) {
          setSelectedRoom(finalRoomName);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to rename room",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename room",
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

  // Room types for selection
  const ROOM_TYPES = [
    { value: 'Living Room', label: 'Living Room' },
    { value: 'Bedroom', label: 'Bedroom' },
    { value: 'Kitchen', label: 'Kitchen' },
    { value: 'Bathroom', label: 'Bathroom' },
    { value: 'Office', label: 'Office' },
    { value: 'Garage', label: 'Garage' },
    { value: 'Outdoor', label: 'Outdoor' },
    { value: 'Dining Room', label: 'Dining Room' },
    { value: 'Hallway', label: 'Hallway' },
    { value: 'Basement', label: 'Basement' },
    { value: 'Attic', label: 'Attic' },
    { value: 'Other', label: 'Other' },
  ];

  // Generate final room name from type + name
  const getFinalRoomName = () => {
    if (!roomType) return '';
    if (roomName.trim()) {
      return `${roomType} ${roomName.trim()}`;
    }
    return roomType;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Room Automation</h1>
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
                  <Label htmlFor="room-type">Room Type</Label>
                  <Select value={roomType} onValueChange={(value) => {
                    setRoomType(value);
                    setRoomName(''); // Reset room name when type changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name (Optional)</Label>
                  <Input
                    id="room-name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={`e.g., "1", "Master", "Guest"`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {roomName.trim() 
                      ? `Room will be: "${roomType} ${roomName.trim()}"`
                      : `Room will be: "${roomType}" (leave empty for default)`
                    }
                  </p>
                </div>
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
                <Button onClick={handleAddDevice}>
                  Add Device
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Device Dialog */}
          <Dialog open={isEditDeviceOpen} onOpenChange={setIsEditDeviceOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Device</DialogTitle>
                <DialogDescription>
                  Update device name and room.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room-type">Room Type</Label>
                  <Select value={roomType} onValueChange={(value) => {
                    setRoomType(value);
                    setRoomName('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-room-name">Room Name (Optional)</Label>
                  <Input
                    id="edit-room-name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={`e.g., "1", "Master", "Guest"`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {roomName.trim() 
                      ? `Room will be: "${roomType} ${roomName.trim()}"`
                      : `Room will be: "${roomType}" (leave empty for default)`
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-device-name">Device Name</Label>
                  <Input
                    id="edit-device-name"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                    placeholder="Enter device name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-device-type">Device Type</Label>
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
                <Button variant="outline" onClick={() => {
                  setIsEditDeviceOpen(false);
                  setEditingDevice(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDeviceEdit}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Room Dialog */}
          <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Room</DialogTitle>
                <DialogDescription>
                  Rename "{editingRoom}" and update all devices in this room.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room-type-rename">Room Type</Label>
                  <Select value={roomType} onValueChange={(value) => {
                    setRoomType(value);
                    setRoomName('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-room-name-rename">Room Name (Optional)</Label>
                  <Input
                    id="edit-room-name-rename"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={`e.g., "1", "Master", "Guest"`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {roomName.trim() 
                      ? `Room will be: "${roomType} ${roomName.trim()}"`
                      : `Room will be: "${roomType}" (leave empty for default)`
                    }
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    This will rename the room for {automationDevices.filter(d => d.room === editingRoom).length} device(s).
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsEditRoomOpen(false);
                  setEditingRoom('');
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRoomRename}>
                  Rename Room
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Room Selector */}
        <div className="mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <Label htmlFor="room-select" className="text-sm font-medium">Select Room:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-[250px] justify-between"
                    >
                      {selectedRoom || "Select room..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search or type room name..." />
                      <CommandList>
                        <CommandEmpty>No rooms found. Create rooms by adding devices.</CommandEmpty>
                        <CommandGroup>
                          {allRooms.map((room) => {
                            const deviceCount = automationDevices.filter(d => d.room === room).length;
                            return (
                              <div key={room} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                <CommandItem
                                  value={room}
                                  onSelect={() => {
                                    setSelectedRoom(room);
                                  }}
                                  className="flex-1 cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedRoom === room ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {room} ({deviceCount} device{deviceCount !== 1 ? 's' : ''})
                                </CommandItem>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRoom(room);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedRoom 
                      ? `${filteredDevices.length} device${filteredDevices.length !== 1 ? 's' : ''} in ${selectedRoom}`
                      : `${automationDevices.length} total device${automationDevices.length !== 1 ? 's' : ''}`
                    }
                  </span>
                  {selectedRoom && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        // Parse selected room to extract type and name
                        const roomParts = selectedRoom.split(' ');
                        if (roomParts.length > 1) {
                          const type = roomParts[0];
                          const name = roomParts.slice(1).join(' ');
                          setRoomType(type);
                          setRoomName(name);
                        } else {
                          // Check if it matches a room type
                          const matchedType = ROOM_TYPES.find(rt => rt.value === selectedRoom);
                          if (matchedType) {
                            setRoomType(selectedRoom);
                            setRoomName('');
                          } else {
                            setRoomType('Other');
                            setRoomName(selectedRoom);
                          }
                        }
                        setNewDevice({ name: '', type: '', room: selectedRoom });
                        setIsAddDeviceOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Device
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Devices ({selectedRoom})</CardTitle>
              <WifiIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredDevices.length}</div>
              <p className="text-xs text-muted-foreground">
                {filteredDevices.filter(d => d.status === 'online').length} online
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              <Power className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredDevices.filter(d => d.state).length}</div>
              <p className="text-xs text-muted-foreground">
                Currently running in {selectedRoom}
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
          {filteredDevices.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Power className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices in {selectedRoom}</h3>
              <p className="text-muted-foreground mb-4">Add your first device to this room to get started with automation</p>
            </div>
          ) : (
            filteredDevices.map(device => (
              <Card key={device.id} className={device.status === 'offline' ? 'opacity-60' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex flex-col space-y-1">
                    <CardTitle className="text-sm font-medium">{device.name}</CardTitle>
                    <CardDescription>{device.room}</CardDescription>
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                          onClick={() => handleEditDevice(device)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
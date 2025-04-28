import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from 'lucide-react';

export interface Device {
  id: string;
  name: string;
  type: 'light' | 'fan' | 'ac' | 'geyser';
  status: 'online' | 'offline';
  isOn: boolean;
  value?: number;
  lastUpdated: string;
}

interface AddDeviceDialogProps {
  onAddDevice: (device: Omit<Device, 'id' | 'lastUpdated'>) => void;
}

const deviceTypes = [
  { value: 'light', label: 'Light' },
  { value: 'fan', label: 'Fan' },
  { value: 'ac', label: 'Air Conditioner' },
  { value: 'geyser', label: 'Geyser' },
];

const getDefaultValue = (type: Device['type']) => {
  switch (type) {
    case 'ac':
      return 24;
    case 'geyser':
      return 45;
    case 'fan':
    case 'light':
      return 100;
    default:
      return 0;
  }
};

export const AddDeviceDialog = ({ onAddDevice }: AddDeviceDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const [deviceName, setDeviceName] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<Device['type']>('light');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceName || !selectedType) {
      return;
    }

    const newDevice = {
      name: deviceName,
      type: selectedType,
      status: 'online',
      isOn: false,
      value: getDefaultValue(selectedType),
    };

    onAddDevice(newDevice);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDeviceName('');
    setSelectedType('light');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
          <DialogDescription>
            Add a new device to your smart home system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Device Name</Label>
            <Input
              id="name"
              placeholder="e.g., Living Room Light"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Device Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as Device['type'])}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a device type" />
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Add Device</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 
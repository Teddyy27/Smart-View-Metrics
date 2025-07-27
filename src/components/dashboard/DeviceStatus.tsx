import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Smartphone, Plus, Trash2 } from 'lucide-react';
import { useDevices } from '@/hooks/useDevices';
import { deviceTypes } from '@/services/deviceService';
import { useToast } from '@/components/ui/use-toast';

const DeviceStatus = () => {
  const { devices, removeDevice } = useDevices();
  const { toast } = useToast();

  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    try {
      const success = await removeDevice(deviceId);
      if (success) {
        toast({
          title: "Device Removed",
          description: `${deviceName} has been removed from your devices.`
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

  const onlineDevices = devices.filter(device => device.status === 'online');
  const offlineDevices = devices.filter(device => device.status === 'offline');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Device Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.length === 0 ? (
            <div className="text-center py-4">
              <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No devices connected</p>
              <p className="text-xs text-muted-foreground">Add devices in Settings</p>
            </div>
          ) : (
            <>
              {onlineDevices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-600">Online ({onlineDevices.length})</h4>
                  {onlineDevices.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {deviceTypes.find(t => t.value === device.type)?.label || device.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Online
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDevice(device.id, device.name)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {offlineDevices.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600">Offline ({offlineDevices.length})</h4>
                  {offlineDevices.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {deviceTypes.find(t => t.value === device.type)?.label || device.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Offline</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDevice(device.id, device.name)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceStatus; 
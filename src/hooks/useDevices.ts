import { useState, useEffect } from 'react';
import { deviceService, type Device } from '@/services/deviceService';

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = deviceService.subscribe((devices) => {
      setDevices(devices);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const addDevice = (name: string, type: string) => {
    return deviceService.addDevice(name, type);
  };

  const removeDevice = (deviceId: string) => {
    return deviceService.removeDevice(deviceId);
  };

  const updateDeviceStatus = (deviceId: string, status: 'online' | 'offline') => {
    return deviceService.updateDeviceStatus(deviceId, status);
  };

  const getDevice = (deviceId: string) => {
    return deviceService.getDevice(deviceId);
  };

  const getDevicesByType = (type: string) => {
    return deviceService.getDevicesByType(type);
  };

  return {
    devices,
    loading,
    addDevice,
    removeDevice,
    updateDeviceStatus,
    getDevice,
    getDevicesByType,
  };
}; 
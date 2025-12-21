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
    
    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []);

  const addDevice = async (name: string, type: string, room: string, togglePath?: string) => {
    return await deviceService.addDevice(name, type, room, togglePath);
  };

  const removeDevice = async (deviceId: string) => {
    return await deviceService.removeDevice(deviceId);
  };

  const updateDeviceStatus = async (deviceId: string, status: 'online' | 'offline') => {
    return await deviceService.updateDeviceStatus(deviceId, status);
  };

  const getDevice = (deviceId: string) => {
    return deviceService.getDevice(deviceId);
  };

  const getDevicesByType = (type: string) => {
    return deviceService.getDevicesByType(type);
  };

  const updateDeviceName = async (deviceId: string, newName: string) => {
    return await deviceService.updateDeviceName(deviceId, newName);
  };

  const updateDeviceRoom = async (deviceId: string, newRoom: string) => {
    return await deviceService.updateDeviceRoom(deviceId, newRoom);
  };

  const updateDevice = async (deviceId: string, updates: { name?: string; room?: string }) => {
    return await deviceService.updateDevice(deviceId, updates);
  };

  const renameRoom = async (oldRoomName: string, newRoomName: string) => {
    return await deviceService.renameRoom(oldRoomName, newRoomName);
  };

  return {
    devices,
    loading,
    addDevice,
    removeDevice,
    updateDeviceStatus,
    updateDeviceName,
    updateDeviceRoom,
    updateDevice,
    renameRoom,
    getDevice,
    getDevicesByType,
  };
}; 
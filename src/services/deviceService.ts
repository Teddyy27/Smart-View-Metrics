import { db } from './firebase';
import { ref, set, remove } from 'firebase/database';

export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  lastSync: string;
  state: boolean;
  value: number;
  power: number;
}

export const deviceTypes = [
  { value: 'ac', label: 'Air Conditioner' },
  { value: 'fan', label: 'Fan' },
  { value: 'light', label: 'Light' },
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'thermostat', label: 'Smart Thermostat' },
  { value: 'energy-meter', label: 'Energy Meter' },
  { value: 'security-camera', label: 'Security Camera' },
  { value: 'smart-plug', label: 'Smart Plug' },
];

const DEVICES_STORAGE_KEY = 'smart_home_devices';

class DeviceService {
  private devices: Device[] = [];
  private listeners: ((devices: Device[]) => void)[] = [];

  constructor() {
    this.loadDevices();
  }

  private loadDevices() {
    try {
      const savedDevices = localStorage.getItem(DEVICES_STORAGE_KEY);
      if (savedDevices) {
        this.devices = JSON.parse(savedDevices);
      }
    } catch (error) {
      console.error('Error loading devices from localStorage:', error);
      this.devices = [];
    }
  }

  private saveDevices() {
    try {
      localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(this.devices));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving devices to localStorage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.devices));
  }

  // Subscribe to device changes
  subscribe(listener: (devices: Device[]) => void) {
    this.listeners.push(listener);
    // Immediately call with current devices
    listener(this.devices);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get all devices
  getDevices(): Device[] {
    return [...this.devices];
  }

  // Add a new device
  async addDevice(name: string, type: string): Promise<Device> {
    const id = Date.now().toString();
    const device: Device = {
      id,
      name: name.trim(),
      type,
      status: 'online',
      lastSync: new Date().toISOString(),
      state: false,
      value: 0,
      power: 0
    };

    this.devices.push(device);
    this.saveDevices();
    // Sync to Firebase
    await set(ref(db, `devices/${device.id}`), device);
    return device;
  }

  // Remove a device
  async removeDevice(deviceId: string): Promise<boolean> {
    const initialLength = this.devices.length;
    this.devices = this.devices.filter(device => device.id !== deviceId);
    
    if (this.devices.length !== initialLength) {
      this.saveDevices();
      // Remove from Firebase
      await remove(ref(db, `devices/${deviceId}`));
      return true;
    }
    return false;
  }

  // Update device status
  updateDeviceStatus(deviceId: string, status: 'online' | 'offline'): boolean {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.status = status;
      device.lastSync = new Date().toISOString();
      this.saveDevices();
      return true;
    }
    return false;
  }

  // Get device by ID
  getDevice(deviceId: string): Device | undefined {
    return this.devices.find(device => device.id === deviceId);
  }

  // Get devices by type
  getDevicesByType(type: string): Device[] {
    return this.devices.filter(device => device.type === type);
  }

  // Clear all devices
  clearDevices() {
    this.devices = [];
    this.saveDevices();
  }
}

// Create singleton instance
export const deviceService = new DeviceService(); 
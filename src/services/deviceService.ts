import { db } from './firebase';
import { ref, set, remove, update, onValue, off, get } from 'firebase/database';

export interface Device {
  id: string;
  name: string;
  type: string;
  state: boolean;
  lastUpdated: number;
  status: 'online' | 'offline';
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

class DeviceService {
  private devices: Device[] = [];
  private listeners: ((devices: Device[]) => void)[] = [];
  private firebaseListener: (() => void) | null = null;
  private isBulkOperation: boolean = false;

  constructor() {
    this.initializeFirebaseListener();
  }

  private initializeFirebaseListener() {
    // Listen to the devices node in Firebase
    const devicesRef = ref(db, 'devices');
    this.firebaseListener = onValue(devicesRef, (snapshot) => {
      // Skip updates during bulk operations to prevent conflicts
      if (this.isBulkOperation) {
        console.log('Skipping Firebase listener update during bulk operation');
        return;
      }

      const data = snapshot.val();
      if (data) {
        // Convert Firebase object to array
        this.devices = Object.keys(data).map(id => ({
          id,
          ...data[id]
        }));
      } else {
        this.devices = [];
      }
      this.notifyListeners();
    });
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
  async addDevice(name: string, type: string, togglePath?: string): Promise<Device> {
    const id = Date.now().toString();
    const now = Date.now();
    const device: Device = {
      id,
      name: name.trim(),
      type,
      state: false,
      lastUpdated: now,
      status: 'online',
    };
    
    // Save to Firebase - this will trigger the listener and update local state
    await set(ref(db, `devices/${device.id}`), device);
    return device;
  }

  // Toggle device state
  async toggleDevice(id: string, newState: boolean): Promise<void> {
    const now = Date.now();
    await update(ref(db, `devices/${id}`), {
      state: newState,
      lastUpdated: now
    });
  }

  // Remove a device
  async removeDevice(deviceId: string): Promise<boolean> {
    try {
      console.log(`Attempting to remove device: ${deviceId}`);
      
      // First, check if the device exists
      const deviceRef = ref(db, `devices/${deviceId}`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        console.error(`Device ${deviceId} does not exist in Firebase`);
        return false;
      }
      
      console.log(`Device ${deviceId} found, proceeding with removal`);
      
      // Remove the device from Firebase
      await remove(deviceRef);
      
      console.log(`Device ${deviceId} successfully removed from Firebase`);
      return true;
      
    } catch (error) {
      console.error('Error removing device:', error);
      
      // Log more detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      return false;
    }
  }

  // Remove multiple devices (bulk operation)
  async removeMultipleDevices(deviceIds: string[]): Promise<{ success: boolean; results: any[] }> {
    console.log(`Starting bulk removal of ${deviceIds.length} devices`);
    
    // Set bulk operation flag to prevent listener conflicts
    this.isBulkOperation = true;
    
    const results = [];
    
    try {
      for (const deviceId of deviceIds) {
        const result = await this.removeDevice(deviceId);
        results.push({ deviceId, success: result });
      }
      
      // Wait a moment for Firebase to process all removals
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state manually
      this.devices = this.devices.filter(device => !deviceIds.includes(device.id));
      this.notifyListeners();
      
      const success = results.every(r => r.success);
      console.log(`Bulk removal completed. Success: ${success}`);
      
      return { success, results };
      
    } finally {
      // Re-enable Firebase listener
      this.isBulkOperation = false;
    }
  }

  // Remove all devices (nuclear option)
  async removeAllDevices(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log('🚨 NUCLEAR OPTION: Removing ALL devices');
      
      // Set bulk operation flag
      this.isBulkOperation = true;
      
      // Get all current devices
      const currentDevices = [...this.devices];
      const deviceIds = currentDevices.map(d => d.id);
      
      if (deviceIds.length === 0) {
        return {
          success: true,
          message: 'No devices to remove',
          count: 0
        };
      }
      
      console.log(`Removing ${deviceIds.length} devices:`, deviceIds);
      
      // Remove all devices from Firebase
      await remove(ref(db, 'devices'));
      
      // Wait for Firebase to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear local state
      this.devices = [];
      this.notifyListeners();
      
      console.log(`✅ Successfully removed all ${deviceIds.length} devices`);
      
      return {
        success: true,
        message: `Successfully removed all ${deviceIds.length} devices`,
        count: deviceIds.length
      };
      
    } catch (error) {
      console.error('❌ Failed to remove all devices:', error);
      return {
        success: false,
        message: `Failed to remove all devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        count: 0
      };
    } finally {
      // Re-enable Firebase listener
      this.isBulkOperation = false;
    }
  }

  // Update device status
  async updateDeviceStatus(deviceId: string, status: 'online' | 'offline'): Promise<boolean> {
    try {
      const now = Date.now();
      await update(ref(db, `devices/${deviceId}`), {
        status,
        lastUpdated: now
      });
      return true;
    } catch (error) {
      console.error('Error updating device status:', error);
      return false;
    }
  }

  // Get device by ID
  getDevice(deviceId: string): Device | undefined {
    return this.devices.find(device => device.id === deviceId);
  }

  // Get devices by type
  getDevicesByType(type: string): Device[] {
    return this.devices.filter(device => device.type === type);
  }

  // Clear all devices (legacy method - use removeAllDevices instead)
  async clearDevices(): Promise<void> {
    console.warn('clearDevices() is deprecated. Use removeAllDevices() instead.');
    await this.removeAllDevices();
  }

  // Cleanup method to remove Firebase listener
  cleanup() {
    if (this.firebaseListener) {
      const devicesRef = ref(db, 'devices');
      off(devicesRef, 'value', this.firebaseListener);
      this.firebaseListener = null;
    }
  }
}

// Create singleton instance
export const deviceService = new DeviceService(); 
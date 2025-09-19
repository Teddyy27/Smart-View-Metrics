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
  private isAutomaticCreationDisabled: boolean = false; // Enable automatic device creation

  constructor() {
    this.initializeFirebaseListener();
  }

  private initializeFirebaseListener() {
    console.log('🔍 Initializing Firebase device listener...');
    
    // Listen to the devices node in Firebase
    const devicesRef = ref(db, 'devices');
    this.firebaseListener = onValue(devicesRef, (snapshot) => {
      console.log('📡 Firebase device listener triggered');
      
      // Skip updates during bulk operations to prevent conflicts
      if (this.isBulkOperation) {
        console.log('Skipping Firebase listener update during bulk operation');
        return;
      }

      const data = snapshot.val();
      const previousDeviceCount = this.devices.length;
      
      if (data) {
        // Convert Firebase object to array
        const newDevices = Object.keys(data).map(id => ({
          id,
          ...data[id]
        }));
        
        const newDeviceCount = newDevices.length;
        
        if (newDeviceCount > previousDeviceCount) {
          console.warn(`⚠️ DEVICE COUNT INCREASED: ${previousDeviceCount} → ${newDeviceCount}`);
          console.warn('New devices detected:', newDevices.filter(d => !this.devices.find(od => od.id === d.id)));
        }
        
        this.devices = newDevices;
      } else {
        this.devices = [];
      }
      
      console.log(`📊 Current device count: ${this.devices.length}`);
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

  // Clean up duplicate devices
  async cleanupDuplicateDevices(): Promise<{ removed: number; duplicates: string[] }> {
    const duplicates: string[] = [];
    const seenNames = new Set<string>();
    const devicesToRemove: string[] = [];
    
    // Find duplicates by name
    this.devices.forEach(device => {
      const normalizedName = device.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        duplicates.push(device.name);
        devicesToRemove.push(device.id);
      } else {
        seenNames.add(normalizedName);
      }
    });
    
    // Remove duplicate devices
    if (devicesToRemove.length > 0) {
      console.log(`Removing ${devicesToRemove.length} duplicate devices:`, duplicates);
      await this.removeMultipleDevices(devicesToRemove);
    }
    
    return {
      removed: devicesToRemove.length,
      duplicates
    };
  }

  // Control automatic device creation
  setAutomaticCreationEnabled(enabled: boolean): void {
    this.isAutomaticCreationDisabled = !enabled;
    console.log(`🔧 Automatic device creation ${enabled ? 'enabled' : 'disabled'}`);
  }

  isAutomaticCreationEnabled(): boolean {
    return !this.isAutomaticCreationDisabled;
  }

  // Get all devices
  getDevices(): Device[] {
    return [...this.devices];
  }

  // Monitor device creation attempts
  private logDeviceCreationAttempt(caller: string, data: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      caller,
      data,
      stack: new Error().stack?.split('\n').slice(2, 6).join('\n') // Get call stack
    };
    
    console.group(`🔍 Device Creation Attempt from ${caller}`);
    console.log('Timestamp:', logData.timestamp);
    console.log('Caller:', caller);
    console.log('Data:', data);
    console.log('Call Stack:', logData.stack);
    console.groupEnd();
    
    // Save to Firebase for monitoring
    const logRef = ref(db, `logs/deviceCreationAttempts/${Date.now()}`);
    set(logRef, logData).catch(error => {
      console.error('Failed to log device creation attempt:', error);
    });
  }

  // Add a new device
  async addDevice(name: string, type: string, togglePath?: string): Promise<Device> {
    console.log(`Adding new device: ${name} (${type})`);
    
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const newDevice: Device = {
      id: deviceId,
      name,
      type,
      state: false,
      lastUpdated: now,
      status: 'online'
    };

    try {
      // Add device to Firebase
      await set(ref(db, `devices/${deviceId}`), newDevice);
      
      console.log(`✅ Device added successfully: ${name} (${deviceId})`);
      return newDevice;
    } catch (error) {
      console.error('Error adding device:', error);
      throw new Error(`Failed to add device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
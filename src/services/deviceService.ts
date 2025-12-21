import { db } from './firebase';
import { ref, set, remove, update, onValue, off, get } from 'firebase/database';

export interface Device {
  id: string;
  name: string;
  type: string;
  room: string; // Room name where device is located
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
    console.log('Initializing Firebase device listener...');
    
    // Listen to the devices node in Firebase
    const devicesRef = ref(db, 'devices');
    this.firebaseListener = onValue(devicesRef, (snapshot) => {
      console.log('Firebase device listener triggered');
      
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
            ...data[id],
            room: data[id].room || 'Default Room' // Handle legacy devices without room
          }));
        
        const newDeviceCount = newDevices.length;
        
        if (newDeviceCount > previousDeviceCount) {
          console.warn(`WARNING: DEVICE COUNT INCREASED: ${previousDeviceCount} -> ${newDeviceCount}`);
          console.warn('New devices detected:', newDevices.filter(d => !this.devices.find(od => od.id === d.id)));
        }
        
        this.devices = newDevices;
      } else {
        this.devices = [];
      }
      
      console.log(`Current device count: ${this.devices.length}`);
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
    console.log(`Automatic device creation ${enabled ? 'enabled' : 'disabled'}`);
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
    
    console.group(`Device Creation Attempt from ${caller}`);
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
  async addDevice(name: string, type: string, room: string, togglePath?: string): Promise<Device> {
    console.log(`Adding new device: ${name} (${type}) to room: ${room}`);
    
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const newDevice: Device = {
      id: deviceId,
      name,
      type,
      room: room || 'Default Room', // Default room if not provided
      state: false,
      lastUpdated: now,
      status: 'online'
    };

    try {
      // Add device to Firebase
      const deviceRef = ref(db, `devices/${deviceId}`);
      
      // First, create the device
      await set(deviceRef, newDevice);
      
      // Then, create power_logs sub-node as a separate object
      const powerLogsRef = ref(db, `devices/${deviceId}/power_logs`);
      await set(powerLogsRef, {});
      
      // Create toggle sub-node with nested structure
      const toggleRef = ref(db, `devices/${deviceId}/toggle`);
      await set(toggleRef, {
        state: false,
        lastToggle: now,
        toggleCount: 0
      });
      
      // Create toggle history sub-node
      const toggleHistoryRef = ref(db, `devices/${deviceId}/toggle/history`);
      await set(toggleHistoryRef, {});
      
      console.log(`Device added successfully: ${name} (${deviceId}) with power_logs and toggle sub-nodes`);
      return newDevice;
    } catch (error) {
      console.error('Error adding device:', error);
      throw new Error(`Failed to add device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Toggle device state
  async toggleDevice(id: string, newState: boolean): Promise<void> {
    try {
      const now = Date.now();
      const deviceRef = ref(db, `devices/${id}`);
      
      // Get current toggle data
      const deviceSnapshot = await get(deviceRef);
      const currentDevice = deviceSnapshot.val();
      const currentToggleCount = currentDevice?.toggle?.toggleCount || 0;
      const toggleHistory = currentDevice?.toggle?.history || {};
      
      // Update device state and toggle information
      await update(deviceRef, {
        state: newState,
        lastUpdated: now,
        'toggle/state': newState,
        'toggle/lastToggle': now,
        'toggle/toggleCount': currentToggleCount + 1,
        [`toggle/history/${now}`]: {
          state: newState,
          timestamp: now,
          action: newState ? 'ON' : 'OFF'
        }
      });
      
      // Keep only last 100 toggle events in history
      const historyKeys = Object.keys(toggleHistory).sort();
      if (historyKeys.length >= 100) {
        const oldestKey = historyKeys[0];
        await remove(ref(db, `devices/${id}/toggle/history/${oldestKey}`));
      }
      
      console.log(`Device ${id} toggled to ${newState ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error(`Error toggling device ${id}:`, error);
      throw error;
    }
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
      console.log('NUCLEAR OPTION: Removing ALL devices');
      
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
      
      console.log(`Successfully removed all ${deviceIds.length} devices`);
      
      return {
        success: true,
        message: `Successfully removed all ${deviceIds.length} devices`,
        count: deviceIds.length
      };
      
    } catch (error) {
      console.error('Failed to remove all devices:', error);
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

  // Update device name
  async updateDeviceName(deviceId: string, newName: string): Promise<boolean> {
    try {
      const now = Date.now();
      await update(ref(db, `devices/${deviceId}`), {
        name: newName,
        lastUpdated: now
      });
      return true;
    } catch (error) {
      console.error('Error updating device name:', error);
      return false;
    }
  }

  // Update device room
  async updateDeviceRoom(deviceId: string, newRoom: string): Promise<boolean> {
    try {
      const now = Date.now();
      await update(ref(db, `devices/${deviceId}`), {
        room: newRoom,
        lastUpdated: now
      });
      return true;
    } catch (error) {
      console.error('Error updating device room:', error);
      return false;
    }
  }

  // Update device (name and/or room)
  async updateDevice(deviceId: string, updates: { name?: string; room?: string }): Promise<boolean> {
    try {
      const now = Date.now();
      const updateData: any = {
        lastUpdated: now
      };
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.room !== undefined) {
        updateData.room = updates.room;
      }
      await update(ref(db, `devices/${deviceId}`), updateData);
      return true;
    } catch (error) {
      console.error('Error updating device:', error);
      return false;
    }
  }

  // Update room name for all devices in a room (rename room)
  async renameRoom(oldRoomName: string, newRoomName: string): Promise<{ success: boolean; updatedCount: number }> {
    try {
      const devicesInRoom = this.devices.filter(device => device.room === oldRoomName);
      if (devicesInRoom.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      const updatePromises = devicesInRoom.map(device => 
        this.updateDeviceRoom(device.id, newRoomName)
      );

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r === true).length;

      return {
        success: successCount === devicesInRoom.length,
        updatedCount: successCount
      };
    } catch (error) {
      console.error('Error renaming room:', error);
      return { success: false, updatedCount: 0 };
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

  // Log power consumption for a device
  async logPowerConsumption(deviceId: string, power: number): Promise<boolean> {
    try {
      const now = Date.now();
      const timestamp = `${new Date().toISOString().split('T')[0]}_${String(Math.floor(now / 60000) % 1440).padStart(4, '0')}`;
      
      const powerLogRef = ref(db, `devices/${deviceId}/power_logs/${timestamp}`);
      await set(powerLogRef, power);
      
      console.log(`Power logged for device ${deviceId}: ${power}W at ${timestamp}`);
      return true;
    } catch (error) {
      console.error(`Error logging power for device ${deviceId}:`, error);
      return false;
    }
  }

  // Get power logs for a device
  async getDevicePowerLogs(deviceId: string): Promise<Record<string, number>> {
    try {
      const powerLogsRef = ref(db, `devices/${deviceId}/power_logs`);
      const snapshot = await get(powerLogsRef);
      
      if (snapshot.exists()) {
        return snapshot.val() || {};
      }
      return {};
    } catch (error) {
      console.error(`Error getting power logs for device ${deviceId}:`, error);
      return {};
    }
  }

  // Get toggle history for a device
  async getDeviceToggleHistory(deviceId: string): Promise<any[]> {
    try {
      const toggleRef = ref(db, `devices/${deviceId}/toggle`);
      const snapshot = await get(toggleRef);
      
      if (snapshot.exists()) {
        const toggleData = snapshot.val();
        const history = toggleData?.history || {};
        
        // Convert history object to array and sort by timestamp
        return Object.keys(history)
          .map(key => ({
            timestamp: key,
            ...history[key]
          }))
          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
      }
      return [];
    } catch (error) {
      console.error(`Error getting toggle history for device ${deviceId}:`, error);
      return [];
    }
  }

  // Initialize power_logs and toggle nodes for existing devices that don't have them
  async initializeDeviceSubNodes(deviceId: string): Promise<boolean> {
    try {
      const deviceRef = ref(db, `devices/${deviceId}`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        console.error(`Device ${deviceId} does not exist`);
        return false;
      }

      const device = snapshot.val();
      const now = Date.now();
      let initialized = false;

      // Initialize power_logs if it doesn't exist
      if (!device.power_logs) {
        const powerLogsRef = ref(db, `devices/${deviceId}/power_logs`);
        await set(powerLogsRef, {});
        console.log(`Initialized power_logs for device ${deviceId}`);
        initialized = true;
      }

      // Initialize toggle if it doesn't exist
      if (!device.toggle) {
        const toggleRef = ref(db, `devices/${deviceId}/toggle`);
        await set(toggleRef, {
          state: device.state || false,
          lastToggle: device.lastUpdated || now,
          toggleCount: 0
        });
        
        // Initialize toggle history sub-node
        const toggleHistoryRef = ref(db, `devices/${deviceId}/toggle/history`);
        await set(toggleHistoryRef, {});
        
        console.log(`Initialized toggle for device ${deviceId}`);
        initialized = true;
      } else if (!device.toggle.history) {
        // If toggle exists but history doesn't, create it
        const toggleHistoryRef = ref(db, `devices/${deviceId}/toggle/history`);
        await set(toggleHistoryRef, {});
        console.log(`Initialized toggle/history for device ${deviceId}`);
        initialized = true;
      }

      if (initialized) {
        console.log(`Successfully initialized sub-nodes for device ${deviceId}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error initializing sub-nodes for device ${deviceId}:`, error);
      return false;
    }
  }

  // Initialize sub-nodes for all existing devices
  async initializeAllDeviceSubNodes(): Promise<{ success: boolean; initialized: number }> {
    try {
      const devices = this.devices;
      let initialized = 0;

      for (const device of devices) {
        const result = await this.initializeDeviceSubNodes(device.id);
        if (result) {
          initialized++;
        }
      }

      console.log(`Initialized sub-nodes for ${initialized}/${devices.length} devices`);
      return {
        success: true,
        initialized
      };
    } catch (error) {
      console.error('Error initializing all device sub-nodes:', error);
      return {
        success: false,
        initialized: 0
      };
    }
  }

  // Get devices by room
  getDevicesByRoom(room: string): Device[] {
    return this.devices.filter(device => device.room === room);
  }

  // Get all unique rooms
  getAllRooms(): string[] {
    const rooms = new Set(this.devices.map(device => device.room));
    return Array.from(rooms).sort();
  }

  // Get room statistics
  getRoomStats(room: string): { totalDevices: number; onlineDevices: number; activeDevices: number } {
    const roomDevices = this.getDevicesByRoom(room);
    return {
      totalDevices: roomDevices.length,
      onlineDevices: roomDevices.filter(d => d.status === 'online').length,
      activeDevices: roomDevices.filter(d => d.state).length
    };
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
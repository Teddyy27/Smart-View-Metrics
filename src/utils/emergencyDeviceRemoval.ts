import { db } from '@/services/firebase';
import { ref, remove, get } from 'firebase/database';

/**
 * Emergency device removal utility
 * This can be run directly to remove problematic devices
 */
export class EmergencyDeviceRemoval {
  /**
   * Remove a specific device by ID
   */
  static async removeDevice(deviceId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log(`🚨 Emergency removal of device: ${deviceId}`);
      
      // Check if device exists
      const deviceRef = ref(db, `devices/${deviceId}`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        return {
          success: false,
          message: `Device ${deviceId} does not exist in Firebase`
        };
      }
      
      const deviceData = snapshot.val();
      console.log(`Found device:`, deviceData);
      
      // Attempt removal
      await remove(deviceRef);
      
      // Verify removal
      const verifySnapshot = await get(deviceRef);
      if (verifySnapshot.exists()) {
        return {
          success: false,
          message: `Device ${deviceId} still exists after removal attempt`
        };
      }
      
      console.log(`✅ Device ${deviceId} successfully removed`);
      return {
        success: true,
        message: `Device ${deviceId} has been successfully removed`,
        details: { removedDevice: deviceData }
      };
      
    } catch (error) {
      console.error(`❌ Failed to remove device ${deviceId}:`, error);
      return {
        success: false,
        message: `Failed to remove device: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * List all devices with their IDs
   */
  static async listAllDevices(): Promise<any[]> {
    try {
      const devicesRef = ref(db, 'devices');
      const snapshot = await get(devicesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const devices = Object.keys(snapshot.val()).map(id => ({
        id,
        ...snapshot.val()[id]
      }));
      
      console.log('📋 All devices in Firebase:', devices);
      return devices;
      
    } catch (error) {
      console.error('❌ Failed to list devices:', error);
      return [];
    }
  }

  /**
   * Remove multiple devices by IDs
   */
  static async removeMultipleDevices(deviceIds: string[]): Promise<{ success: boolean; results: any[] }> {
    console.log(`🚨 Emergency removal of ${deviceIds.length} devices:`, deviceIds);
    
    const results = [];
    
    for (const deviceId of deviceIds) {
      const result = await this.removeDevice(deviceId);
      results.push({ deviceId, ...result });
    }
    
    const success = results.every(r => r.success);
    
    return {
      success,
      results
    };
  }

  /**
   * Remove all devices (nuclear option)
   */
  static async removeAllDevices(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log('🚨 NUCLEAR OPTION: Removing ALL devices');
      
      const devices = await this.listAllDevices();
      
      if (devices.length === 0) {
        return {
          success: true,
          message: 'No devices to remove',
          count: 0
        };
      }
      
      const deviceIds = devices.map(d => d.id);
      const result = await this.removeMultipleDevices(deviceIds);
      
      return {
        success: result.success,
        message: result.success ? 
          `Successfully removed ${devices.length} devices` : 
          `Failed to remove some devices`,
        count: devices.length
      };
      
    } catch (error) {
      console.error('❌ Failed to remove all devices:', error);
      return {
        success: false,
        message: `Failed to remove all devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        count: 0
      };
    }
  }
}

// Export convenience functions for direct use
export const removeDevice = EmergencyDeviceRemoval.removeDevice;
export const listAllDevices = EmergencyDeviceRemoval.listAllDevices;
export const removeAllDevices = EmergencyDeviceRemoval.removeAllDevices; 
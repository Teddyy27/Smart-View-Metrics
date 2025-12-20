import { db } from '@/services/firebase';
import { ref, remove, get } from 'firebase/database';
import { deviceService } from '@/services/deviceService';

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
      console.log(` Emergency removal of device: ${deviceId}`);
      
      // Use the improved device service method
      const success = await deviceService.removeDevice(deviceId);
      
      if (success) {
        console.log(` Device ${deviceId} successfully removed`);
        return {
          success: true,
          message: `Device ${deviceId} has been successfully removed`
        };
      } else {
        return {
          success: false,
          message: `Failed to remove device ${deviceId}`
        };
      }
      
    } catch (error) {
      console.error(` Failed to remove device ${deviceId}:`, error);
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
      const devices = deviceService.getDevices();
      console.log(' All devices in Firebase:', devices);
      return devices;
    } catch (error) {
      console.error(' Failed to list devices:', error);
      return [];
    }
  }

  /**
   * Remove multiple devices by IDs
   */
  static async removeMultipleDevices(deviceIds: string[]): Promise<{ success: boolean; results: any[] }> {
    console.log(` Emergency removal of ${deviceIds.length} devices:`, deviceIds);
    
    try {
      const result = await deviceService.removeMultipleDevices(deviceIds);
      return result;
    } catch (error) {
      console.error(' Failed to remove multiple devices:', error);
      return {
        success: false,
        results: deviceIds.map(id => ({ deviceId: id, success: false, error }))
      };
    }
  }

  /**
   * Remove all devices (nuclear option) - IMPROVED
   */
  static async removeAllDevices(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log(' NUCLEAR OPTION: Removing ALL devices');
      
      // Use the improved device service method
      const result = await deviceService.removeAllDevices();
      
      console.log('Nuclear removal result:', result);
      return result;
      
    } catch (error) {
      console.error(' Failed to remove all devices:', error);
      return {
        success: false,
        message: `Failed to remove all devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        count: 0
      };
    }
  }

  /**
   * Force remove all devices directly from Firebase (bypass device service)
   */
  static async forceRemoveAllDevices(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      console.log(' FORCE REMOVAL: Directly removing ALL devices from Firebase');
      
      // Get current devices first
      const devicesRef = ref(db, 'devices');
      const snapshot = await get(devicesRef);
      
      if (!snapshot.exists()) {
        return {
          success: true,
          message: 'No devices to remove',
          count: 0
        };
      }
      
      const deviceCount = Object.keys(snapshot.val()).length;
      console.log(`Found ${deviceCount} devices to remove`);
      
      // Force remove the entire devices node
      await remove(devicesRef);
      
      // Wait for Firebase to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify removal
      const verifySnapshot = await get(devicesRef);
      if (verifySnapshot.exists()) {
        return {
          success: false,
          message: 'Devices still exist after force removal',
          count: deviceCount
        };
      }
      
      console.log(` Force removal successful: ${deviceCount} devices removed`);
      return {
        success: true,
        message: `Force removed ${deviceCount} devices from Firebase`,
        count: deviceCount
      };
      
    } catch (error) {
      console.error(' Force removal failed:', error);
      return {
        success: false,
        message: `Force removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        count: 0
      };
    }
  }

  /**
   * Check if devices are reappearing and prevent it
   */
  static async preventDeviceReappearance(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Checking for device reappearance prevention...');
      
      // First, remove all devices
      const removalResult = await this.forceRemoveAllDevices();
      
      if (!removalResult.success) {
        return {
          success: false,
          message: 'Failed to remove devices initially'
        };
      }
      
      // Wait and check if devices reappear
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const devicesRef = ref(db, 'devices');
      const snapshot = await get(devicesRef);
      
      if (snapshot.exists()) {
        const reappearedCount = Object.keys(snapshot.val()).length;
        console.log(`WARNING: ${reappearedCount} devices reappeared`);
        
        // Try to remove again
        await remove(devicesRef);
        
        return {
          success: false,
          message: `${reappearedCount} devices reappeared after removal. Check for other sources adding devices.`
        };
      }
      
      return {
        success: true,
        message: 'Devices successfully removed and not reappearing'
      };
      
    } catch (error) {
      console.error(' Prevention check failed:', error);
      return {
        success: false,
        message: `Prevention check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export convenience functions for direct use
export const removeDevice = EmergencyDeviceRemoval.removeDevice;
export const listAllDevices = EmergencyDeviceRemoval.listAllDevices;
export const removeAllDevices = EmergencyDeviceRemoval.removeAllDevices;
export const forceRemoveAllDevices = EmergencyDeviceRemoval.forceRemoveAllDevices;
export const preventDeviceReappearance = EmergencyDeviceRemoval.preventDeviceReappearance; 
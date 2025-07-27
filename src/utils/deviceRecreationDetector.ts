import { db } from '@/services/firebase';
import { ref, get, set, remove, onValue, off } from 'firebase/database';

/**
 * Device Recreation Detector
 * This utility helps identify what's automatically re-adding devices after deletion
 */
export class DeviceRecreationDetector {
  private static isMonitoring = false;
  private static listeners: Array<() => void> = [];
  private static deletedDevices = new Set<string>();

  /**
   * Monitor for device recreation after deletion
   */
  static async monitorDeviceRecreation(duration: number = 30000): Promise<{
    success: boolean;
    recreations: Array<{
      deviceId: string;
      originalData: any;
      recreatedData: any;
      timeToRecreate: number;
      timestamp: number;
    }>;
    summary: {
      totalRecreations: number;
      averageRecreationTime: number;
      devicesRecreated: string[];
    };
  }> {
    console.log('🔍 Starting device recreation monitoring...');
    
    if (this.isMonitoring) {
      console.log('⚠️ Already monitoring, stopping previous session');
      this.stopMonitoring();
    }

    this.isMonitoring = true;
    this.deletedDevices.clear();
    const recreations: Array<{
      deviceId: string;
      originalData: any;
      recreatedData: any;
      timeToRecreate: number;
      timestamp: number;
    }> = [];

    return new Promise((resolve) => {
      const devicesRef = ref(db, 'devices');
      let initialDevices: Record<string, any> = {};
      let deletionStartTime: Record<string, number> = {};

      // Listen to device changes
      const listener = onValue(devicesRef, async (snapshot) => {
        if (!this.isMonitoring) return;

        const currentData = snapshot.val() || {};
        const currentDeviceIds = Object.keys(currentData);

        // First time - record initial state
        if (Object.keys(initialDevices).length === 0) {
          initialDevices = { ...currentData };
          console.log(`📊 Initial state: ${currentDeviceIds.length} devices`);
          return;
        }

        const initialDeviceIds = Object.keys(initialDevices);

        // Check for deletions
        for (const deviceId of initialDeviceIds) {
          if (!currentDeviceIds.includes(deviceId) && !this.deletedDevices.has(deviceId)) {
            console.log(`🗑️ Device deleted: ${deviceId}`);
            this.deletedDevices.add(deviceId);
            deletionStartTime[deviceId] = Date.now();
          }
        }

        // Check for recreations
        for (const deviceId of currentDeviceIds) {
          if (this.deletedDevices.has(deviceId) && deletionStartTime[deviceId]) {
            const timeToRecreate = Date.now() - deletionStartTime[deviceId];
            const originalData = initialDevices[deviceId];
            const recreatedData = currentData[deviceId];

            console.log(`⚠️ DEVICE RECREATED: ${deviceId} after ${timeToRecreate}ms`);
            console.log('Original:', originalData);
            console.log('Recreated:', recreatedData);

            recreations.push({
              deviceId,
              originalData,
              recreatedData,
              timeToRecreate,
              timestamp: Date.now()
            });

            // Remove from tracking since it's been recreated
            this.deletedDevices.delete(deviceId);
            delete deletionStartTime[deviceId];
          }
        }

        // Check for new devices (not recreations)
        for (const deviceId of currentDeviceIds) {
          if (!initialDeviceIds.includes(deviceId) && !this.deletedDevices.has(deviceId)) {
            console.log(`➕ NEW DEVICE ADDED: ${deviceId}`, currentData[deviceId]);
          }
        }
      });

      this.listeners.push(() => off(devicesRef, 'value', listener));

      // Stop monitoring after duration
      setTimeout(() => {
        this.stopMonitoring();
        
        const summary = {
          totalRecreations: recreations.length,
          averageRecreationTime: recreations.length > 0 
            ? recreations.reduce((sum, r) => sum + r.timeToRecreate, 0) / recreations.length 
            : 0,
          devicesRecreated: recreations.map(r => r.deviceId)
        };

        console.log('📊 Recreation monitoring summary:', summary);
        
        resolve({
          success: true,
          recreations,
          summary
        });
      }, duration);
    });
  }

  /**
   * Stop monitoring
   */
  static stopMonitoring(): void {
    console.log('🛑 Stopping device recreation monitoring');
    this.isMonitoring = false;
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
    this.deletedDevices.clear();
  }

  /**
   * Test device deletion and monitor for recreation
   */
  static async testDeviceDeletion(deviceId: string): Promise<{
    success: boolean;
    wasRecreated: boolean;
    recreationTime?: number;
    originalData?: any;
    recreatedData?: any;
  }> {
    console.log(`🧪 Testing deletion of device: ${deviceId}`);

    try {
      // Get original device data
      const deviceRef = ref(db, `devices/${deviceId}`);
      const originalSnapshot = await get(deviceRef);
      
      if (!originalSnapshot.exists()) {
        return { success: false, wasRecreated: false };
      }

      const originalData = originalSnapshot.val();
      console.log('Original device data:', originalData);

      // Start monitoring for recreation
      const monitoringPromise = this.monitorDeviceRecreation(10000); // 10 seconds
      
      // Delete the device
      await remove(deviceRef);
      console.log(`🗑️ Deleted device: ${deviceId}`);

      // Wait for monitoring results
      const monitoringResult = await monitoringPromise;
      
      // Check if this specific device was recreated
      const recreation = monitoringResult.recreations.find(r => r.deviceId === deviceId);
      
      if (recreation) {
        console.log(`⚠️ Device ${deviceId} was recreated after ${recreation.timeToRecreate}ms`);
        return {
          success: true,
          wasRecreated: true,
          recreationTime: recreation.timeToRecreate,
          originalData: recreation.originalData,
          recreatedData: recreation.recreatedData
        };
      } else {
        console.log(`✅ Device ${deviceId} was not recreated`);
        return {
          success: true,
          wasRecreated: false
        };
      }

    } catch (error) {
      console.error(`❌ Test deletion failed for ${deviceId}:`, error);
      return {
        success: false,
        wasRecreated: false
      };
    }
  }

  /**
   * Identify potential sources of device recreation
   */
  static async identifyRecreationSources(): Promise<{
    success: boolean;
    potentialSources: string[];
    recommendations: string[];
  }> {
    console.log('🔍 Identifying potential recreation sources...');

    const potentialSources: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if deviceService is running
      const deviceServiceRunning = await this.checkDeviceServiceStatus();
      if (deviceServiceRunning) {
        potentialSources.push('Device Service Firebase Listener');
        recommendations.push('Disable device service Firebase listener during deletion');
      }

      // Check for multiple browser tabs/windows
      const multipleTabs = await this.checkMultipleTabs();
      if (multipleTabs) {
        potentialSources.push('Multiple Browser Tabs/Windows');
        recommendations.push('Close other tabs/windows or use incognito mode');
      }

      // Check for localStorage fallback
      const localStorageFallback = await this.checkLocalStorageFallback();
      if (localStorageFallback) {
        potentialSources.push('localStorage Fallback Mechanism');
        recommendations.push('Remove localStorage fallback in device service');
      }

      // Check for automation triggers
      const automationTriggers = await this.checkAutomationTriggers();
      if (automationTriggers) {
        potentialSources.push('Automation System Triggers');
        recommendations.push('Disable automation system during deletion');
      }

      return {
        success: true,
        potentialSources,
        recommendations
      };

    } catch (error) {
      console.error('❌ Failed to identify recreation sources:', error);
      return {
        success: false,
        potentialSources: [],
        recommendations: ['Run comprehensive diagnostic to identify issue']
      };
    }
  }

  /**
   * Check if device service is actively listening
   */
  private static async checkDeviceServiceStatus(): Promise<boolean> {
    try {
      // This is a heuristic - we can't directly check if deviceService is listening
      // but we can check if there are active listeners by monitoring connection
      const connectedRef = ref(db, '.info/connected');
      const snapshot = await get(connectedRef);
      return snapshot.val() === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for multiple tabs/windows
   */
  private static async checkMultipleTabs(): Promise<boolean> {
    // This is a browser-specific check
    try {
      // Try to use localStorage to detect multiple tabs
      const tabId = Date.now().toString();
      localStorage.setItem('firebase-debug-tab', tabId);
      
      // Wait a bit and check if our tab ID is still there
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentTabId = localStorage.getItem('firebase-debug-tab');
      return currentTabId !== tabId;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for localStorage fallback
   */
  private static async checkLocalStorageFallback(): Promise<boolean> {
    try {
      // Check if there's any device data in localStorage
      const keys = Object.keys(localStorage);
      const deviceKeys = keys.filter(key => key.includes('device') || key.includes('Device'));
      return deviceKeys.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check for automation triggers
   */
  private static async checkAutomationTriggers(): Promise<boolean> {
    try {
      // Check if there are any automation logs or triggers
      const logsRef = ref(db, 'logs');
      const snapshot = await get(logsRef);
      return snapshot.exists();
    } catch (error) {
      return false;
    }
  }

  /**
   * Prevent device recreation by temporarily disabling sources
   */
  static async preventRecreation(deviceId: string): Promise<{
    success: boolean;
    message: string;
    steps: string[];
  }> {
    console.log(`🛡️ Attempting to prevent recreation of device: ${deviceId}`);

    const steps: string[] = [];
    
    try {
      // Step 1: Temporarily disable device service listener
      steps.push('1. Temporarily disable device service Firebase listener');
      
      // Step 2: Clear any localStorage fallback
      try {
        const keys = Object.keys(localStorage);
        const deviceKeys = keys.filter(key => key.includes('device') || key.includes('Device'));
        deviceKeys.forEach(key => localStorage.removeItem(key));
        steps.push(`2. Cleared ${deviceKeys.length} device-related localStorage items`);
      } catch (error) {
        steps.push('2. Failed to clear localStorage');
      }

      // Step 3: Remove device with monitoring
      const testResult = await this.testDeviceDeletion(deviceId);
      
      if (testResult.wasRecreated) {
        steps.push(`3. Device was still recreated after ${testResult.recreationTime}ms`);
        return {
          success: false,
          message: `Device recreation could not be prevented. Recreated after ${testResult.recreationTime}ms`,
          steps
        };
      } else {
        steps.push('3. Device deletion successful - no recreation detected');
        return {
          success: true,
          message: 'Device recreation prevented successfully',
          steps
        };
      }

    } catch (error) {
      steps.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: 'Failed to prevent device recreation',
        steps
      };
    }
  }
}

// Export convenience functions
export const monitorDeviceRecreation = DeviceRecreationDetector.monitorDeviceRecreation;
export const testDeviceDeletion = DeviceRecreationDetector.testDeviceDeletion;
export const identifyRecreationSources = DeviceRecreationDetector.identifyRecreationSources;
export const preventRecreation = DeviceRecreationDetector.preventRecreation;
export const stopRecreationMonitoring = DeviceRecreationDetector.stopMonitoring; 
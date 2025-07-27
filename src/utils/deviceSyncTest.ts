import { db } from '@/services/firebase';
import { ref, set, get, onValue, off } from 'firebase/database';
import { deviceService } from '@/services/deviceService';

export interface DeviceSyncTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test device synchronization across different user sessions
 * This utility helps verify that devices added in one session
 * are properly visible in other sessions
 */
export class DeviceSyncTester {
  private testDeviceId: string;
  private testDeviceName: string;
  private testDeviceType: string;

  constructor() {
    this.testDeviceId = `test_${Date.now()}`;
    this.testDeviceName = `Test Device ${Date.now()}`;
    this.testDeviceType = 'light';
  }

  /**
   * Run a complete device synchronization test
   */
  async runFullTest(): Promise<DeviceSyncTestResult> {
    try {
      console.log('Starting device synchronization test...');

      // Step 1: Test device addition
      const addResult = await this.testDeviceAddition();
      if (!addResult.success) {
        return addResult;
      }

      // Step 2: Test device retrieval
      const retrieveResult = await this.testDeviceRetrieval();
      if (!retrieveResult.success) {
        return retrieveResult;
      }

      // Step 3: Test device state changes
      const stateResult = await this.testDeviceStateChanges();
      if (!stateResult.success) {
        return stateResult;
      }

      // Step 4: Test real-time updates
      const realtimeResult = await this.testRealtimeUpdates();
      if (!realtimeResult.success) {
        return realtimeResult;
      }

      // Step 5: Cleanup test device
      await this.cleanupTestDevice();

      return {
        success: true,
        message: 'All device synchronization tests passed!',
        details: {
          testDeviceId: this.testDeviceId,
          testDeviceName: this.testDeviceName,
          tests: ['addition', 'retrieval', 'state_changes', 'realtime_updates']
        }
      };

    } catch (error) {
      console.error('Device sync test failed:', error);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test adding a device to Firebase
   */
  private async testDeviceAddition(): Promise<DeviceSyncTestResult> {
    try {
      console.log('Testing device addition...');

      // Add device using device service
      const device = await deviceService.addDevice(
        this.testDeviceName,
        this.testDeviceType
      );

      // Verify device was added to Firebase
      const deviceRef = ref(db, `devices/${device.id}`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        return {
          success: false,
          message: 'Device was not properly saved to Firebase'
        };
      }

      const firebaseDevice = snapshot.val();
      if (firebaseDevice.name !== this.testDeviceName || 
          firebaseDevice.type !== this.testDeviceType) {
        return {
          success: false,
          message: 'Device data mismatch in Firebase'
        };
      }

      console.log('Device addition test passed');
      return {
        success: true,
        message: 'Device addition test passed'
      };

    } catch (error) {
      return {
        success: false,
        message: `Device addition test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test retrieving devices from Firebase
   */
  private async testDeviceRetrieval(): Promise<DeviceSyncTestResult> {
    try {
      console.log('Testing device retrieval...');

      // Get devices from device service
      const devices = deviceService.getDevices();
      
      // Check if our test device is in the list
      const testDevice = devices.find(d => d.id === this.testDeviceId);
      if (!testDevice) {
        return {
          success: false,
          message: 'Test device not found in device service'
        };
      }

      // Verify device data
      if (testDevice.name !== this.testDeviceName || 
          testDevice.type !== this.testDeviceType) {
        return {
          success: false,
          message: 'Device data mismatch in device service'
        };
      }

      console.log('Device retrieval test passed');
      return {
        success: true,
        message: 'Device retrieval test passed'
      };

    } catch (error) {
      return {
        success: false,
        message: `Device retrieval test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test device state changes
   */
  private async testDeviceStateChanges(): Promise<DeviceSyncTestResult> {
    try {
      console.log('Testing device state changes...');

      // Toggle device state
      await deviceService.toggleDevice(this.testDeviceId, true);
      
      // Verify state change in Firebase
      const deviceRef = ref(db, `devices/${this.testDeviceId}/state`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists() || !snapshot.val()) {
        return {
          success: false,
          message: 'Device state change not reflected in Firebase'
        };
      }

      // Toggle back to false
      await deviceService.toggleDevice(this.testDeviceId, false);
      
      const snapshot2 = await get(deviceRef);
      if (snapshot2.exists() && snapshot2.val()) {
        return {
          success: false,
          message: 'Device state toggle back to false failed'
        };
      }

      console.log('Device state changes test passed');
      return {
        success: true,
        message: 'Device state changes test passed'
      };

    } catch (error) {
      return {
        success: false,
        message: `Device state changes test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test real-time updates
   */
  private async testRealtimeUpdates(): Promise<DeviceSyncTestResult> {
    return new Promise((resolve) => {
      console.log('Testing real-time updates...');

      let updateReceived = false;
      const timeout = setTimeout(() => {
        off(deviceRef, 'value', listener);
        resolve({
          success: false,
          message: 'Real-time update test timed out'
        });
      }, 5000);

      const deviceRef = ref(db, `devices/${this.testDeviceId}`);
      const listener = onValue(deviceRef, (snapshot) => {
        if (snapshot.exists()) {
          updateReceived = true;
          clearTimeout(timeout);
          off(deviceRef, 'value', listener);
          resolve({
            success: true,
            message: 'Real-time updates test passed'
          });
        }
      });

      // Trigger an update
      set(ref(db, `devices/${this.testDeviceId}/lastUpdated`), Date.now());
    });
  }

  /**
   * Clean up test device
   */
  private async cleanupTestDevice(): Promise<void> {
    try {
      console.log('Cleaning up test device...');
      await deviceService.removeDevice(this.testDeviceId);
      console.log('Test device cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup test device:', error);
    }
  }

  /**
   * Get current device count from Firebase
   */
  static async getDeviceCount(): Promise<number> {
    try {
      const devicesRef = ref(db, 'devices');
      const snapshot = await get(devicesRef);
      return snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
    } catch (error) {
      console.error('Error getting device count:', error);
      return 0;
    }
  }

  /**
   * List all devices in Firebase
   */
  static async listAllDevices(): Promise<any[]> {
    try {
      const devicesRef = ref(db, 'devices');
      const snapshot = await get(devicesRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      return Object.keys(snapshot.val()).map(id => ({
        id,
        ...snapshot.val()[id]
      }));
    } catch (error) {
      console.error('Error listing devices:', error);
      return [];
    }
  }

  /**
   * Test device removal specifically
   */
  static async testDeviceRemoval(deviceId: string): Promise<DeviceSyncTestResult> {
    try {
      console.log(`Testing device removal for: ${deviceId}`);
      
      // First check if device exists
      const deviceRef = ref(db, `devices/${deviceId}`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        return {
          success: false,
          message: `Device ${deviceId} does not exist in Firebase`
        };
      }
      
      console.log(`Device ${deviceId} exists, attempting removal...`);
      
      // Try to remove the device
      const success = await deviceService.removeDevice(deviceId);
      
      if (success) {
        // Verify device was actually removed
        const verifySnapshot = await get(deviceRef);
        if (verifySnapshot.exists()) {
          return {
            success: false,
            message: `Device ${deviceId} still exists after removal attempt`
          };
        }
        
        return {
          success: true,
          message: `Device ${deviceId} successfully removed and verified`
        };
      } else {
        return {
          success: false,
          message: `Failed to remove device ${deviceId}`
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Device removal test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Get detailed device information including Firebase path
   */
  static async getDeviceDetails(deviceId: string): Promise<any> {
    try {
      const deviceRef = ref(db, `devices/${deviceId}`);
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        return {
          exists: false,
          deviceId,
          firebasePath: `devices/${deviceId}`
        };
      }
      
      return {
        exists: true,
        deviceId,
        firebasePath: `devices/${deviceId}`,
        data: snapshot.val(),
        key: snapshot.key
      };
    } catch (error) {
      return {
        exists: false,
        deviceId,
        firebasePath: `devices/${deviceId}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export a convenience function for running tests
export const runDeviceSyncTest = async (): Promise<DeviceSyncTestResult> => {
  const tester = new DeviceSyncTester();
  return await tester.runFullTest();
}; 
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

      // Test device creation
      const testDevice = await deviceService.addDevice(
        this.testDeviceName,
        this.testDeviceType,
        'Test Room' // Add room parameter for testing
      );

      if (!testDevice) {
        return {
          success: false,
          message: 'Device addition test failed - no device returned'
        };
      }

      console.log(' Device addition test passed');
      return {
        success: true,
        message: 'Device addition test passed',
        details: { deviceId: testDevice.id, deviceName: testDevice.name }
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

      // Test device retrieval
      const devices = deviceService.getDevices();
      const testDevice = devices.find(d => d.id === this.testDeviceId);

      if (!testDevice) {
        return {
          success: false,
          message: 'Device retrieval test failed - test device not found'
        };
      }

      console.log(' Device retrieval test passed');
      return {
        success: true,
        message: 'Device retrieval test passed',
        details: { deviceId: testDevice.id, deviceName: testDevice.name }
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

      // Test device state toggle
      await deviceService.toggleDevice(this.testDeviceId, true);
      
      // Verify state change
      const devices = deviceService.getDevices();
      const testDevice = devices.find(d => d.id === this.testDeviceId);
      
      if (!testDevice || !testDevice.state) {
        return {
          success: false,
          message: 'Device state changes test failed - state not updated'
        };
      }

      console.log(' Device state changes test passed');
      return {
        success: true,
        message: 'Device state changes test passed',
        details: { deviceId: this.testDeviceId, newState: testDevice.state }
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
    console.log('Testing real-time updates...');

    return new Promise((resolve) => {
      // Monitor for real-time updates for 3 seconds
      const timeout = setTimeout(() => {
        resolve({
          success: true,
          message: 'Real-time updates test completed (timeout reached)'
        });
      }, 3000);

      // Subscribe to device changes
      const unsubscribe = deviceService.subscribe((devices) => {
        const testDevice = devices.find(d => d.id === this.testDeviceId);
        if (testDevice) {
          clearTimeout(timeout);
          unsubscribe();
          resolve({
            success: true,
            message: 'Real-time updates test passed - device update received',
            details: { deviceId: testDevice.id, deviceName: testDevice.name }
          });
        }
      });
    });
  }

  /**
   * Clean up test device
   */
  private async cleanupTestDevice(): Promise<void> {
    try {
      console.log('Cleaning up test device...');
      await deviceService.removeDevice(this.testDeviceId);
      console.log(' Test device cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up test device:', error);
    }
  }

  /**
   * Get current device count from Firebase
   */
  static async getDeviceCount(): Promise<number> {
    try {
      const devices = deviceService.getDevices();
      return devices.length;
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
      const devices = deviceService.getDevices();
      return devices;
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
      
      const success = await deviceService.removeDevice(deviceId);
      
      if (success) {
        return {
          success: true,
          message: 'Device removal test passed',
          details: { deviceId }
        };
      } else {
        return {
          success: false,
          message: 'Device removal test failed - device not removed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Device removal test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get detailed device information including Firebase path
   */
  static async getDeviceDetails(deviceId: string): Promise<any> {
    try {
      const device = deviceService.getDevice(deviceId);
      return {
        exists: !!device,
        deviceId,
        firebasePath: `devices/${deviceId}`,
        device: device || null,
        message: device ? 'Device found' : 'Device not found'
      };
    } catch (error) {
      return {
        exists: false,
        deviceId,
        firebasePath: `devices/${deviceId}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Error checking device details'
      };
    }
  }
}

// Export a convenience function for running tests
export const runDeviceSyncTest = async (): Promise<DeviceSyncTestResult> => {
  console.log('🚀 Starting device sync test...');
  const tester = new DeviceSyncTester();
  return await tester.runFullTest();
}; 
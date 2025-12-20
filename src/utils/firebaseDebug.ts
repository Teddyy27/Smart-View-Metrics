import { db } from '@/services/firebase';
import { ref, get, set, remove, onValue, off, push, child } from 'firebase/database';

/**
 * Comprehensive Firebase debugging utility
 * This helps identify issues with Firebase operations
 */
export class FirebaseDebugger {
  /**
   * Test basic Firebase connectivity and permissions
   */
  static async testConnection(): Promise<{ success: boolean; details: any }> {
    try {
      console.log(' Testing Firebase connection...');
      
      // Test read permission
      const testRef = ref(db, 'test-connection');
      await set(testRef, { timestamp: Date.now(), test: true });
      
      // Test read back
      const snapshot = await get(testRef);
      if (!snapshot.exists()) {
        throw new Error('Write succeeded but read failed');
      }
      
      // Test delete permission
      await remove(testRef);
      
      // Verify deletion
      const verifySnapshot = await get(testRef);
      if (verifySnapshot.exists()) {
        throw new Error('Delete operation failed - data still exists');
      }
      
      console.log(' Firebase connection test passed');
      return {
        success: true,
        details: {
          read: true,
          write: true,
          delete: true,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.error(' Firebase connection test failed:', error);
      return {
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Test specific device path permissions
   */
  static async testDevicePathPermissions(deviceId: string): Promise<{ success: boolean; details: any }> {
    try {
      console.log(` Testing device path permissions for: ${deviceId}`);
      
      const deviceRef = ref(db, `devices/${deviceId}`);
      
      // Test read
      const snapshot = await get(deviceRef);
      const canRead = snapshot.exists();
      
      // Test write (if device exists, update it; if not, create test)
      const testData = { 
        test: true, 
        timestamp: Date.now(),
        originalData: canRead ? snapshot.val() : null
      };
      
      await set(deviceRef, testData);
      
      // Test read back
      const writeSnapshot = await get(deviceRef);
      const canWrite = writeSnapshot.exists();
      
      // Test delete
      await remove(deviceRef);
      
      // Verify deletion
      const deleteSnapshot = await get(deviceRef);
      const canDelete = !deleteSnapshot.exists();
      
      // Restore original data if it existed
      if (canRead && testData.originalData) {
        await set(deviceRef, testData.originalData);
      }
      
      console.log(` Device path permissions test completed for ${deviceId}`);
      return {
        success: canRead && canWrite && canDelete,
        details: {
          deviceId,
          canRead,
          canWrite,
          canDelete,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.error(` Device path permissions test failed for ${deviceId}:`, error);
      return {
        success: false,
        details: {
          deviceId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Monitor Firebase connection status in real-time
   */
  static monitorConnection(): { stop: () => void; status: string } {
    let status = 'unknown';
    
    const connectedRef = ref(db, '.info/connected');
    const listener = onValue(connectedRef, (snapshot) => {
      status = snapshot.val() ? 'connected' : 'disconnected';
      console.log(`🌐 Firebase connection status: ${status}`);
    });
    
    return {
      stop: () => off(connectedRef, 'value', listener),
      get status() { return status; }
    };
  }

  /**
   * Get detailed information about all devices in Firebase
   */
  static async getDeviceDetails(): Promise<{ success: boolean; devices: any[]; details: any }> {
    try {
      console.log(' Getting detailed device information...');
      
      const devicesRef = ref(db, 'devices');
      const snapshot = await get(devicesRef);
      
      if (!snapshot.exists()) {
        return {
          success: true,
          devices: [],
          details: { count: 0, timestamp: Date.now() }
        };
      }
      
      const data = snapshot.val();
      const devices = Object.keys(data).map(id => ({
        id,
        ...data[id],
        path: `devices/${id}`,
        lastModified: data[id].lastUpdated || 'unknown'
      }));
      
      console.log(` Found ${devices.length} devices in Firebase`);
      return {
        success: true,
        devices,
        details: {
          count: devices.length,
          timestamp: Date.now(),
          deviceIds: devices.map(d => d.id)
        }
      };
      
    } catch (error) {
      console.error(' Failed to get device details:', error);
      return {
        success: false,
        devices: [],
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Test if there are any other processes adding devices
   */
  static async monitorDeviceChanges(duration: number = 10000): Promise<{ success: boolean; changes: any[] }> {
    return new Promise((resolve) => {
      console.log(` Monitoring device changes for ${duration}ms...`);
      
      const devicesRef = ref(db, 'devices');
      const changes: any[] = [];
      
      const listener = onValue(devicesRef, (snapshot) => {
        const timestamp = Date.now();
        const data = snapshot.val();
        const deviceCount = data ? Object.keys(data).length : 0;
        
        changes.push({
          timestamp,
          deviceCount,
          hasData: !!data,
          deviceIds: data ? Object.keys(data) : []
        });
        
        console.log(` Device count at ${new Date(timestamp).toLocaleTimeString()}: ${deviceCount}`);
      });
      
      // Stop monitoring after duration
      setTimeout(() => {
        off(devicesRef, 'value', listener);
        console.log(` Device monitoring completed. ${changes.length} changes detected.`);
        resolve({
          success: true,
          changes
        });
      }, duration);
    });
  }

  /**
   * Test Firebase rules by attempting various operations
   */
  static async testFirebaseRules(): Promise<{ success: boolean; results: any }> {
    try {
      console.log(' Testing Firebase security rules...');
      
      const results = {
        read: false,
        write: false,
        delete: false,
        admin: false,
        timestamp: Date.now()
      };
      
      // Test read access
      try {
        const testRef = ref(db, 'rules-test');
        await get(testRef);
        results.read = true;
      } catch (error) {
        console.log(' Read access denied');
      }
      
      // Test write access
      try {
        const testRef = ref(db, 'rules-test');
        await set(testRef, { test: true, timestamp: Date.now() });
        results.write = true;
      } catch (error) {
        console.log(' Write access denied');
      }
      
      // Test delete access
      try {
        const testRef = ref(db, 'rules-test');
        await remove(testRef);
        results.delete = true;
      } catch (error) {
        console.log(' Delete access denied');
      }
      
      // Test admin access (try to access .info)
      try {
        const infoRef = ref(db, '.info');
        await get(infoRef);
        results.admin = true;
      } catch (error) {
        console.log(' Admin access denied (expected)');
      }
      
      console.log(' Firebase rules test completed');
      return {
        success: results.read && results.write && results.delete,
        results
      };
      
    } catch (error) {
      console.error(' Firebase rules test failed:', error);
      return {
        success: false,
        results: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Comprehensive diagnostic that runs all tests
   */
  static async runFullDiagnostic(): Promise<{ success: boolean; results: any }> {
    console.log('🚀 Starting comprehensive Firebase diagnostic...');
    
    const results = {
      connection: null,
      rules: null,
      devices: null,
      monitoring: null,
      timestamp: Date.now()
    };
    
    try {
      // Test connection
      results.connection = await this.testConnection();
      
      // Test rules
      results.rules = await this.testFirebaseRules();
      
      // Get device details
      results.devices = await this.getDeviceDetails();
      
      // Monitor for changes (5 seconds)
      results.monitoring = await this.monitorDeviceChanges(5000);
      
      const overallSuccess = results.connection?.success && 
                           results.rules?.success && 
                           results.devices?.success;
      
      console.log(' Full diagnostic completed');
      return {
        success: overallSuccess,
        results
      };
      
    } catch (error) {
      console.error(' Full diagnostic failed:', error);
      return {
        success: false,
        results: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }
      };
    }
  }
}

// Export convenience functions
export const testConnection = FirebaseDebugger.testConnection;
export const testDevicePathPermissions = FirebaseDebugger.testDevicePathPermissions;
export const monitorConnection = FirebaseDebugger.monitorConnection;
export const getDeviceDetails = FirebaseDebugger.getDeviceDetails;
export const monitorDeviceChanges = FirebaseDebugger.monitorDeviceChanges;
export const testFirebaseRules = FirebaseDebugger.testFirebaseRules;
export const runFullDiagnostic = FirebaseDebugger.runFullDiagnostic; 
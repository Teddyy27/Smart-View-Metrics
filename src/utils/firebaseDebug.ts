import { db } from '@/services/firebase';
import { ref, get, set, remove, onValue, off } from 'firebase/database';

export interface FirebaseDebugInfo {
  connected: boolean;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  testPath: string;
  error?: string;
}

/**
 * Debug Firebase connection and permissions
 */
export class FirebaseDebugger {
  private static testPath = 'debug_test';

  /**
   * Test Firebase connection and basic permissions
   */
  static async testConnection(): Promise<FirebaseDebugInfo> {
    const result: FirebaseDebugInfo = {
      connected: false,
      permissions: {
        read: false,
        write: false,
        delete: false
      },
      testPath: this.testPath
    };

    try {
      console.log('Testing Firebase connection...');

      // Test 1: Basic connection by reading a known path
      const rootRef = ref(db, '.info/connected');
      const connectionSnapshot = await get(rootRef);
      result.connected = connectionSnapshot.val() === true;

      console.log('Firebase connection test:', result.connected);

      // Test 2: Read permission
      try {
        const readRef = ref(db, this.testPath);
        await get(readRef);
        result.permissions.read = true;
        console.log('Read permission: OK');
      } catch (error) {
        console.log('Read permission: FAILED', error);
        result.error = `Read failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Test 3: Write permission
      try {
        const writeRef = ref(db, `${this.testPath}/write_test`);
        await set(writeRef, { timestamp: Date.now(), test: true });
        result.permissions.write = true;
        console.log('Write permission: OK');
      } catch (error) {
        console.log('Write permission: FAILED', error);
        result.error = `Write failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Test 4: Delete permission
      try {
        const deleteRef = ref(db, `${this.testPath}/write_test`);
        await remove(deleteRef);
        result.permissions.delete = true;
        console.log('Delete permission: OK');
      } catch (error) {
        console.log('Delete permission: FAILED', error);
        result.error = `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Cleanup test data
      try {
        await remove(ref(db, this.testPath));
      } catch (error) {
        console.log('Cleanup failed (non-critical):', error);
      }

    } catch (error) {
      console.error('Firebase debug test failed:', error);
      result.error = `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  }

  /**
   * Test specific device path permissions
   */
  static async testDevicePathPermissions(deviceId: string): Promise<any> {
    const devicePath = `devices/${deviceId}`;
    const result = {
      deviceId,
      devicePath,
      read: false,
      write: false,
      delete: false,
      exists: false,
      error: null as string | null
    };

    try {
      console.log(`Testing permissions for device path: ${devicePath}`);

      // Test read
      try {
        const deviceRef = ref(db, devicePath);
        const snapshot = await get(deviceRef);
        result.read = true;
        result.exists = snapshot.exists();
        console.log(`Device read: OK, exists: ${result.exists}`);
      } catch (error) {
        console.log(`Device read: FAILED`, error);
        result.error = `Read failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Test write (only if device exists)
      if (result.exists) {
        try {
          const deviceRef = ref(db, `${devicePath}/test_write`);
          await set(deviceRef, { test: true, timestamp: Date.now() });
          result.write = true;
          console.log('Device write: OK');
          
          // Clean up test write
          await remove(deviceRef);
        } catch (error) {
          console.log('Device write: FAILED', error);
          result.error = `Write failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      // Test delete (only if device exists)
      if (result.exists) {
        try {
          // Create a temporary test node
          const testRef = ref(db, `${devicePath}/test_delete`);
          await set(testRef, { test: true });
          
          // Try to delete it
          await remove(testRef);
          result.delete = true;
          console.log('Device delete: OK');
        } catch (error) {
          console.log('Device delete: FAILED', error);
          result.error = `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

    } catch (error) {
      console.error('Device path permission test failed:', error);
      result.error = `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  }

  /**
   * Get Firebase database rules (if accessible)
   */
  static async getDatabaseRules(): Promise<any> {
    try {
      const rulesRef = ref(db, '.info/rules');
      const snapshot = await get(rulesRef);
      return {
        accessible: true,
        rules: snapshot.val()
      };
    } catch (error) {
      return {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Monitor real-time connection status
   */
  static monitorConnection(callback: (connected: boolean) => void): () => void {
    const connectionRef = ref(db, '.info/connected');
    const listener = onValue(connectionRef, (snapshot) => {
      const connected = snapshot.val();
      callback(connected);
    });
    
    return () => off(connectionRef, 'value', listener);
  }
} 
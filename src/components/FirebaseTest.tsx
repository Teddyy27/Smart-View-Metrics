import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { runFullDiagnostic } from '@/utils/firebaseDebug';
import { runDeviceSyncTest } from '@/utils/deviceSyncTest';
import { deviceService } from '@/services/deviceService';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

export const FirebaseTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const results: TestResult[] = [];

    try {
      // Test 1: Firebase Connection
      console.log('Running Firebase connection test...');
      const connectionTest = await runFullDiagnostic();
      results.push({
        name: 'Firebase Connection',
        success: connectionTest.success,
        message: connectionTest.success ? 'Connected successfully' : 'Connection failed',
        details: connectionTest.results
      });

      // Test 2: Device Service
      console.log('Testing device service...');
      try {
        const devices = deviceService.getDevices();
        results.push({
          name: 'Device Service',
          success: true,
          message: `Device service working - ${devices.length} devices found`,
          details: { deviceCount: devices.length }
        });
      } catch (error) {
        results.push({
          name: 'Device Service',
          success: false,
          message: `Device service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error }
        });
      }

      // Test 3: Device Sync Test
      console.log('Running device sync test...');
      const syncTest = await runDeviceSyncTest();
      results.push({
        name: 'Device Sync Test',
        success: syncTest.success,
        message: syncTest.message,
        details: syncTest.details
      });

      // Test 4: Add Test Device
      console.log('Testing device addition...');
      try {
        const testDevice = await deviceService.addDevice('Test Device', 'light');
        results.push({
          name: 'Device Addition',
          success: true,
          message: `Test device added: ${testDevice.name}`,
          details: { deviceId: testDevice.id, deviceName: testDevice.name }
        });

        // Clean up test device
        setTimeout(async () => {
          try {
            await deviceService.removeDevice(testDevice.id);
            console.log('Test device cleaned up');
          } catch (error) {
            console.error('Error cleaning up test device:', error);
          }
        }, 5000);

      } catch (error) {
        results.push({
          name: 'Device Addition',
          success: false,
          message: `Device addition failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error }
        });
      }

    } catch (error) {
      results.push({
        name: 'Test Suite',
        success: false,
        message: `Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Firebase Integration Test</CardTitle>
        <CardDescription>
          Test Firebase connection and data flow to identify integration issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Tests...' : 'Run Firebase Tests'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.message}
                  </p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        View Details
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">What This Test Checks:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Firebase connection and authentication</li>
            <li>• Database read/write permissions</li>
            <li>• Device service functionality</li>
            <li>• Real-time data synchronization</li>
            <li>• Device creation and removal</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

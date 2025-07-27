import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Smartphone,
  Bell,
  Zap,
  RefreshCw,
  Trash2,
  Plus,
  Save,
  Check,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { updateProfile } from 'firebase/auth';
import { deviceTypes } from '@/services/deviceService';
import { useDevices } from '@/hooks/useDevices';
import { db } from '@/services/firebase';
import { ref, set } from 'firebase/database';
import { runDeviceSyncTest, DeviceSyncTester } from '@/utils/deviceSyncTest';
import { FirebaseDebugger } from '@/utils/firebaseDebug';
import { EmergencyDeviceRemoval } from '@/utils/emergencyDeviceRemoval';

interface NotificationSetting {
  type: string;
  enabled: boolean;
}

const settingsNavItems = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'energy', label: 'Energy Alerts', icon: Zap },
  { id: 'sync', label: 'Data Sync', icon: RefreshCw },
];

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const { devices, addDevice, removeDevice } = useDevices();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || ''
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Device Management State
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  // Add togglePath to newDevice state
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: '',
    togglePath: '',
  });

  // Update profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Notification Settings State
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { type: 'Device Alerts', enabled: true },
    { type: 'Energy Reports', enabled: false }
  ]);

  // Energy Alert Settings
  const [energyAlerts, setEnergyAlerts] = useState({
    threshold: 75,
    dailyReport: true,
    peakUsageAlert: true,
    anomalyDetection: true
  });

  // Sync Settings
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 5,
    lastSync: new Date().toISOString()
  });

  // Test state
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [manualDeviceId, setManualDeviceId] = useState('');

  const handleDeviceRemove = async (deviceId: string) => {
    try {
      const success = await removeDevice(deviceId);
      if (success) {
        toast({
          title: "Device Removed",
          description: "The device has been removed successfully."
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove device",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast({
        title: "Error",
        description: "Failed to remove device",
        variant: "destructive"
      });
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.name.trim() || !newDevice.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    const device = await addDevice(newDevice.name, newDevice.type, newDevice.togglePath);
    setNewDevice({ name: '', type: '', togglePath: '' });
    setIsAddDeviceOpen(false);
    toast({
      title: "Device Added",
      description: `${device.name} has been added successfully.`
    });
  };

  // Utility to toggle device state in Firebase
  const toggleDeviceState = (deviceId: string, newState: boolean) => {
    const deviceRef = ref(db, `devices/${deviceId}/state`);
    set(deviceRef, newState);
    logAutomationTrigger(deviceId, newState);
  };
  // Log automation triggers to Firebase
  const logAutomationTrigger = (deviceId: string, newState: boolean) => {
    set(ref(db, `logs/automation/${Date.now()}`), {
      deviceId,
      newState,
      timestamp: Date.now()
    });
  };

  const handleNotificationToggle = (type: string) => {
    setNotifications(notifications.map(notification =>
      notification.type === type
        ? { ...notification, enabled: !notification.enabled }
        : notification
    ));
  };

  const handleDeviceSyncTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    
    try {
      const result = await runDeviceSyncTest();
      setTestResult(result.success ? 
        `✅ ${result.message}` : 
        `❌ ${result.message}`
      );
      
      if (result.success) {
        toast({
          title: "Test Passed",
          description: "Device synchronization is working correctly across sessions.",
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Test Error",
        description: "An error occurred during the test.",
        variant: "destructive"
      });
    } finally {
      setTestRunning(false);
    }
  };

  const handleGetDeviceInfo = async () => {
    try {
      const deviceCount = await DeviceSyncTester.getDeviceCount();
      const allDevices = await DeviceSyncTester.listAllDevices();
      
      toast({
        title: "Device Information",
        description: `Total devices: ${deviceCount}. Check console for details.`,
      });
      
      console.log('All devices in Firebase:', allDevices);
      
      // Also log detailed info for each device
      for (const device of allDevices) {
        const details = await DeviceSyncTester.getDeviceDetails(device.id);
        console.log(`Device details for ${device.id}:`, details);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get device information",
        variant: "destructive"
      });
    }
  };

  const handleTestDeviceRemoval = async () => {
    try {
      // Get the first device to test removal
      const allDevices = await DeviceSyncTester.listAllDevices();
      
      if (allDevices.length === 0) {
        toast({
          title: "No Devices",
          description: "No devices available to test removal",
          variant: "destructive"
        });
        return;
      }
      
      const testDevice = allDevices[0];
      console.log(`Testing removal of device: ${testDevice.id} (${testDevice.name})`);
      
      const result = await DeviceSyncTester.testDeviceRemoval(testDevice.id);
      
      if (result.success) {
        toast({
          title: "Removal Test Passed",
          description: result.message,
        });
      } else {
        toast({
          title: "Removal Test Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      console.log('Device removal test result:', result);
      
    } catch (error) {
      toast({
        title: "Test Error",
        description: "Failed to test device removal",
        variant: "destructive"
      });
    }
  };

  const handleFirebaseDebug = async () => {
    try {
      console.log('Running Firebase debug tests...');
      
      // Test basic connection and permissions
      const connectionResult = await FirebaseDebugger.testConnection();
      console.log('Firebase connection test result:', connectionResult);
      
      // Test device path permissions if we have devices
      const allDevices = await DeviceSyncTester.listAllDevices();
      if (allDevices.length > 0) {
        const testDevice = allDevices[0];
        const devicePermissions = await FirebaseDebugger.testDevicePathPermissions(testDevice.id);
        console.log('Device path permissions test result:', devicePermissions);
      }
      
      // Get database rules
      const rules = await FirebaseDebugger.getDatabaseRules();
      console.log('Database rules:', rules);
      
      toast({
        title: "Firebase Debug Complete",
        description: "Check console for detailed debug information",
      });
      
    } catch (error) {
      console.error('Firebase debug failed:', error);
      toast({
        title: "Debug Error",
        description: "Failed to run Firebase debug tests",
        variant: "destructive"
      });
    }
  };

  const handleManualDeviceRemoval = async () => {
    if (!manualDeviceId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a device ID",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`Manually removing device: ${manualDeviceId}`);
      
      // Use emergency removal utility
      const result = await EmergencyDeviceRemoval.removeDevice(manualDeviceId);
      
      if (result.success) {
        toast({
          title: "Device Removed",
          description: result.message,
        });
        setManualDeviceId('');
      } else {
        toast({
          title: "Removal Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      console.log('Emergency removal result:', result);
      
    } catch (error) {
      console.error('Emergency device removal failed:', error);
      toast({
        title: "Error",
        description: "Failed to remove device",
        variant: "destructive"
      });
    }
  };

  const handleEmergencyRemoveAll = async () => {
    if (!confirm('⚠️ WARNING: This will remove ALL devices from Firebase. Are you sure?')) {
      return;
    }

    try {
      console.log('🚨 Emergency removal of all devices');
      
      const result = await EmergencyDeviceRemoval.removeAllDevices();
      
      if (result.success) {
        toast({
          title: "All Devices Removed",
          description: result.message,
        });
      } else {
        toast({
          title: "Removal Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      console.log('Emergency remove all result:', result);
      
    } catch (error) {
      console.error('Emergency remove all failed:', error);
      toast({
        title: "Error",
        description: "Failed to remove all devices",
        variant: "destructive"
      });
    }
  };

  const handleForceRemoveAll = async () => {
    if (!confirm('🚨 FORCE REMOVAL: This will bypass the device service and directly remove ALL devices from Firebase. Are you absolutely sure?')) {
      return;
    }

    try {
      console.log('🚨 Force removal of all devices');
      
      const result = await EmergencyDeviceRemoval.forceRemoveAllDevices();
      
      if (result.success) {
        toast({
          title: "Force Removal Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Force Removal Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      console.log('Force remove all result:', result);
      
    } catch (error) {
      console.error('Force remove all failed:', error);
      toast({
        title: "Error",
        description: "Failed to force remove all devices",
        variant: "destructive"
      });
    }
  };

  const handlePreventReappearance = async () => {
    if (!confirm('🔍 This will remove all devices and check if they reappear. Continue?')) {
      return;
    }

    try {
      console.log('🔍 Preventing device reappearance');
      
      const result = await EmergencyDeviceRemoval.preventDeviceReappearance();
      
      if (result.success) {
        toast({
          title: "Prevention Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Devices Reappearing",
          description: result.message,
          variant: "destructive"
        });
      }
      
      console.log('Prevention result:', result);
      
    } catch (error) {
      console.error('Prevention failed:', error);
      toast({
        title: "Error",
        description: "Failed to prevent device reappearance",
        variant: "destructive"
      });
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "No user logged in",
        variant: "destructive"
      });
      return;
    }

    if (!profileForm.displayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsProfileSaving(true);
    try {
      // Update Firebase user profile
      await updateProfile(user, {
        displayName: profileForm.displayName.trim()
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your settings have been updated successfully.",
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>Manage your account information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={profileForm.displayName}
                    onChange={(e) => handleProfileChange('displayName', e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={profileForm.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleProfileSave}
                  disabled={isProfileSaving}
                  className="flex items-center gap-2"
                >
                  {isProfileSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'devices':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Device Management</CardTitle>
              <CardDescription>Manage your connected devices and their settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {devices.length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No devices connected</h3>
                    <p className="text-muted-foreground mb-4">Add your first device to get started</p>
                  </div>
                ) : (
                  devices.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{device.name}</h3>
                        <p className="text-sm text-muted-foreground">{deviceTypes.find(t => t.value === device.type)?.label || device.type}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleDeviceRemove(device.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                
                <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Device
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Device</DialogTitle>
                      <DialogDescription>
                        Add a new device to your smart home system.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="device-name">Device Name</Label>
                        <Input
                          id="device-name"
                          value={newDevice.name}
                          onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                          placeholder="Enter device name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="device-type">Device Type</Label>
                        <Select value={newDevice.type} onValueChange={(value) => setNewDevice({ ...newDevice, type: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                          <SelectContent>
                            {deviceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="toggle-path">Toggle Path</Label>
                        <Input
                          id="toggle-path"
                          value={newDevice.togglePath}
                          onChange={e => setNewDevice({ ...newDevice, togglePath: e.target.value })}
                          placeholder="/devices/{deviceId}/toggle (default)"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDeviceOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddDevice}>
                        Add Device
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        );

      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {notifications.map(notification => (
                  <div key={notification.type} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${notification.type}-toggle`}>{notification.type}</Label>
                      <p className="text-sm text-muted-foreground">
                        {notification.type === 'Device Alerts' 
                          ? 'Get notified when devices go offline or have issues'
                          : 'Receive daily energy consumption reports'
                        }
                      </p>
                    </div>
                    <Switch
                      id={`${notification.type}-toggle`}
                      checked={notification.enabled}
                      onCheckedChange={() => handleNotificationToggle(notification.type)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'energy':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption Alerts</CardTitle>
              <CardDescription>Configure your energy monitoring preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Usage Threshold Alert ({energyAlerts.threshold}%)</Label>
                <Slider
                  value={[energyAlerts.threshold]}
                  onValueChange={([value]) => setEnergyAlerts({ ...energyAlerts, threshold: value })}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily-report">Daily Energy Report</Label>
                  <Switch
                    id="daily-report"
                    checked={energyAlerts.dailyReport}
                    onCheckedChange={(checked) => setEnergyAlerts({ ...energyAlerts, dailyReport: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="peak-usage">Peak Usage Alerts</Label>
                  <Switch
                    id="peak-usage"
                    checked={energyAlerts.peakUsageAlert}
                    onCheckedChange={(checked) => setEnergyAlerts({ ...energyAlerts, peakUsageAlert: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="anomaly-detection">Anomaly Detection</Label>
                  <Switch
                    id="anomaly-detection"
                    checked={energyAlerts.anomalyDetection}
                    onCheckedChange={(checked) => setEnergyAlerts({ ...energyAlerts, anomalyDetection: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'sync':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Data Synchronization</CardTitle>
              <CardDescription>Configure how your data is synchronized and test device sync</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Sync</Label>
                  <p className="text-sm text-muted-foreground">Automatically sync data with cloud</p>
                </div>
                <Switch
                  checked={syncSettings.autoSync}
                  onCheckedChange={(checked) => setSyncSettings({ ...syncSettings, autoSync: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sync Interval (minutes)</Label>
                <Input
                  type="number"
                  value={syncSettings.syncInterval}
                  onChange={(e) => setSyncSettings({ ...syncSettings, syncInterval: parseInt(e.target.value) })}
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Last synced: {new Date(syncSettings.lastSync).toLocaleString()}
                </p>
              </div>
              <Button variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
              
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Device Synchronization Test</h4>
                <div className="space-y-3">
                  <Button 
                    onClick={handleDeviceSyncTest} 
                    disabled={testRunning}
                    variant="outline"
                    className="w-full"
                  >
                    {testRunning ? 'Running Test...' : 'Test Device Sync'}
                  </Button>
                  
                  <Button 
                    onClick={handleGetDeviceInfo} 
                    variant="outline"
                    className="w-full"
                  >
                    Get Device Information
                  </Button>
                  
                  <Button 
                    onClick={handleTestDeviceRemoval} 
                    variant="outline"
                    className="w-full"
                  >
                    Test Device Removal
                  </Button>
                  
                  <Button 
                    onClick={handleFirebaseDebug} 
                    variant="outline"
                    className="w-full"
                  >
                    Firebase Debug
                  </Button>
                  
                  <div className="space-y-2">
                    <Label htmlFor="manual-device-id">Emergency Device Removal</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manual-device-id"
                        value={manualDeviceId}
                        onChange={(e) => setManualDeviceId(e.target.value)}
                        placeholder="Enter device ID (e.g., 1753475599563)"
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleManualDeviceRemoval}
                        variant="destructive"
                        size="sm"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleEmergencyRemoveAll} 
                    variant="destructive"
                    className="w-full"
                  >
                    🚨 Remove ALL Devices (Nuclear Option)
                  </Button>
                  
                  <Button 
                    onClick={handleForceRemoveAll} 
                    variant="destructive"
                    className="w-full"
                  >
                    💥 Force Remove ALL Devices (Bypass Service)
                  </Button>
                  
                  <Button 
                    onClick={handlePreventReappearance} 
                    variant="outline"
                    className="w-full"
                  >
                    🔍 Check & Prevent Device Reappearance
                  </Button>
                  
                  {testResult && (
                    <div className={`p-3 rounded-lg text-sm ${
                      testResult.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {testResult}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex h-screen">
        {/* Settings Sidebar */}
        <div className="w-64 border-r bg-background">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <nav className="space-y-1">
              {settingsNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                    <ChevronRight className={cn(
                      "w-4 h-4 ml-auto transition-transform",
                      activeTab === item.id ? "rotate-90" : ""
                    )} />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{settingsNavItems.find(item => item.id === activeTab)?.label}</h1>
              <p className="text-muted-foreground">Manage your settings and preferences</p>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage; 
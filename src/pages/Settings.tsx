import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  User,
  Smartphone,
  Bell,
  Zap,
  RefreshCw,
  Webhook,
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

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  lastSync: string;
}

interface NotificationSetting {
  type: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

const settingsNavItems = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'energy', label: 'Energy Alerts', icon: Zap },
  { id: 'sync', label: 'Data Sync', icon: RefreshCw },
  { id: 'api', label: 'API Access', icon: Webhook },
];

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Device Management State
  const [devices, setDevices] = useState<Device[]>([
    {
      id: '1',
      name: 'Smart Thermostat',
      type: 'Temperature Control',
      status: 'online',
      lastSync: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Energy Meter',
      type: 'Power Monitor',
      status: 'online',
      lastSync: new Date().toISOString()
    }
  ]);

  // Notification Settings State
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { type: 'Device Alerts', email: true, push: true, sms: false },
    { type: 'Energy Reports', email: true, push: false, sms: false },
    { type: 'System Updates', email: true, push: true, sms: false }
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

  // API Integration Settings
  const [apiSettings, setApiSettings] = useState({
    apiKey: '********-****-****-****-************',
    webhookUrl: '',
    enableWebhook: false
  });

  const handleDeviceRemove = (deviceId: string) => {
    setDevices(devices.filter(device => device.id !== deviceId));
    toast({
      title: "Device Removed",
      description: "The device has been removed successfully."
    });
  };

  const handleNotificationToggle = (type: string, channel: 'email' | 'push' | 'sms') => {
    setNotifications(notifications.map(notification =>
      notification.type === type
        ? { ...notification, [channel]: !notification[channel] }
        : notification
    ));
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
                  <Input id="displayName" defaultValue={user?.displayName || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={user?.email || ''} />
                </div>
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
                {devices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{device.name}</h3>
                      <p className="text-sm text-muted-foreground">{device.type}</p>
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
                ))}
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Device
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {notifications.map(notification => (
                  <div key={notification.type} className="space-y-4">
                    <h3 className="font-medium">{notification.type}</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${notification.type}-email`}>Email</Label>
                        <Switch
                          id={`${notification.type}-email`}
                          checked={notification.email}
                          onCheckedChange={() => handleNotificationToggle(notification.type, 'email')}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${notification.type}-push`}>Push</Label>
                        <Switch
                          id={`${notification.type}-push`}
                          checked={notification.push}
                          onCheckedChange={() => handleNotificationToggle(notification.type, 'push')}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${notification.type}-sms`}>SMS</Label>
                        <Switch
                          id={`${notification.type}-sms`}
                          checked={notification.sms}
                          onCheckedChange={() => handleNotificationToggle(notification.type, 'sms')}
                        />
                      </div>
                    </div>
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
              <CardDescription>Configure how your data is synchronized</CardDescription>
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
            </CardContent>
          </Card>
        );

      case 'api':
        return (
          <Card>
            <CardHeader>
              <CardTitle>API Access & Integrations</CardTitle>
              <CardDescription>Manage your API keys and external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input id="api-key" value={apiSettings.apiKey} readOnly />
                  <Button variant="outline">Regenerate</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={apiSettings.webhookUrl}
                  onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Webhook</Label>
                  <p className="text-sm text-muted-foreground">Send real-time updates to your endpoint</p>
                </div>
                <Switch
                  checked={apiSettings.enableWebhook}
                  onCheckedChange={(checked) => setApiSettings({ ...apiSettings, enableWebhook: checked })}
                />
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold">{settingsNavItems.find(item => item.id === activeTab)?.label}</h1>
                <p className="text-muted-foreground">Manage your settings and preferences</p>
              </div>
              <Button onClick={handleSaveSettings}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage; 
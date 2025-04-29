import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Bell, 
  Settings, 
  Activity, 
  Shield, 
  Mail, 
  Phone, 
  Building,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/services/firebase';
import { signOut, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  darkMode: boolean;
  dashboardLayout: 'default' | 'compact' | 'detailed';
}

interface UserActivity {
  id: number;
  action: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

interface UserAccess {
  role: string;
  permissions: string[];
  systems: string[];
}

const UserPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: true,
    dashboardLayout: 'default'
  });

  const [activities] = useState<UserActivity[]>([
    { id: 1, action: 'Logged in', timestamp: new Date().toISOString(), status: 'success' },
    { id: 2, action: 'Updated profile', timestamp: new Date().toISOString(), status: 'success' },
    { id: 3, action: 'Changed password', timestamp: new Date().toISOString(), status: 'warning' },
    { id: 4, action: 'Verified email', timestamp: new Date().toISOString(), status: 'success' }
  ]);

  const [access] = useState<UserAccess>({
    role: 'System Administrator',
    permissions: [
      'View all dashboards',
      'Manage users',
      'Configure systems',
      'Access audit logs'
    ],
    systems: [
      'Energy Management',
      'Security Systems',
      'Building Automation',
      'Maintenance Tracking'
    ]
  });

  const handleProfileUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (name !== user.displayName) {
        await updateProfile(user, {
          displayName: name
        });
      }

      if (email !== user.email) {
        await updateEmail(user, email);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!user || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await updatePassword(user, newPassword);
      
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePreferenceToggle = (field: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="access">
              <Shield className="w-4 h-4 mr-2" />
              Access
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePasswordUpdate}
                    disabled={loading || !newPassword || !confirmPassword}
                  >
                    Update Password
                  </Button>
                  <Button 
                    onClick={handleProfileUpdate}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => handlePreferenceToggle('emailNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications for real-time alerts
                    </p>
                  </div>
                  <Switch
                    checked={preferences.pushNotifications}
                    onCheckedChange={(checked) => handlePreferenceToggle('pushNotifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable dark mode for better visibility
                    </p>
                  </div>
                  <Switch
                    checked={preferences.darkMode}
                    onCheckedChange={(checked) => handlePreferenceToggle('darkMode', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <Card>
              <CardHeader>
                <CardTitle>Access Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Current Role</h3>
                  <p className="text-muted-foreground">{access.role}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Permissions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {access.permissions.map((permission, index) => (
                      <Badge key={index} variant="secondary">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">System Access</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {access.systems.map((system, index) => (
                      <Badge key={index} variant="outline">
                        {system}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default UserPage; 
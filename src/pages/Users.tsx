import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  UserRound, 
  Users as UsersIcon, 
  Clock, 
  Activity,
  Shield,
  Settings,
  Eye,
  Zap,
  Crown,
  Edit,
  Monitor
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { getDatabase, ref as dbRef, onValue } from 'firebase/database';
import { 
  getUserActivities, 
  ensureActivityDataExists,
  getUserDashboardPermissions,
  generateSampleDashboardPermissions
} from '@/services/userActivityService';

const UsersPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: userData, loading: userDataLoading, trackPageAccess } = useUserData();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [dashboardPermissions, setDashboardPermissions] = useState<any[]>([]);

  useEffect(() => {
    const db = getDatabase();
    const usersRef = dbRef(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setUsers(Object.values(val));
      } else {
        setUsers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Track page access when component mounts
  useEffect(() => {
    if (user) {
      trackPageAccess('Users');
    }
  }, [user, trackPageAccess]);

  // Fetch recent activities and dashboard permissions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ensure sample data exists if database is empty
        if (user) {
          await ensureActivityDataExists(user);
        }

        const [activities, permissions] = await Promise.all([
          getUserActivities(undefined, 50), // Get more activities to filter from
          getUserDashboardPermissions()
        ]);
        
        // Filter to show only one activity per user (most recent)
        const uniqueUserActivities = activities.reduce((acc: any[], activity: any) => {
          const existingUserIndex = acc.findIndex(item => item.userId === activity.userId);
          
          if (existingUserIndex === -1) {
            // New user, add their activity
            acc.push(activity);
          } else {
            // User already exists, replace with more recent activity if this one is newer
            if (activity.timestamp > acc[existingUserIndex].timestamp) {
              acc[existingUserIndex] = activity;
            }
          }
          
          return acc;
        }, []);

        // Sort by timestamp (most recent first) and take top 5
        const sortedUniqueActivities = uniqueUserActivities
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);

        setRecentActivities(sortedUniqueActivities);
        setDashboardPermissions(permissions);

        // Generate sample dashboard permissions if none exist
        if (permissions.length === 0 && user) {
          await generateSampleDashboardPermissions(user);
          const newPermissions = await getUserDashboardPermissions();
          setDashboardPermissions(newPermissions);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  };

  const getDashboardPermissionBadgeColor = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin':
        return 'bg-purple-500';
      case 'editor':
        return 'bg-blue-500';
      case 'viewer':
        return 'bg-green-500';
      case 'readonly':
        return 'bg-yellow-500';
      case 'restricted':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDashboardPermissionLabel = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin':
        return 'Administrator';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      case 'readonly':
        return 'Read Only';
      case 'restricted':
        return 'Restricted';
      default:
        return 'Unknown';
    }
  };

  const getDashboardPermissionIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'editor':
        return <Edit className="w-4 h-4" />;
      case 'viewer':
        return <Monitor className="w-4 h-4" />;
      case 'readonly':
        return <Eye className="w-4 h-4" />;
      case 'restricted':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserRound className="w-4 h-4" />;
    }
  };

  const getDashboardPermissionDescription = (permission: any) => {
    const descriptions = [];
    
    if (permission.canManageUsers) descriptions.push('Manage Users');
    if (permission.canManageDevices) descriptions.push('Manage Devices');
    if (permission.canViewAnalytics) descriptions.push('View Analytics');
    if (permission.canManageAutomation) descriptions.push('Manage Automation');
    if (permission.canAccessSettings) descriptions.push('Access Settings');
    
    return descriptions.length > 0 ? descriptions.join(', ') : 'Limited Access';
  };

  const filteredUsers = users.filter(user =>
    (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Function to refresh activity data with unique user filtering
  const refreshActivityData = async () => {
    try {
      const activities = await getUserActivities(undefined, 50);
      
      // Filter to show only one activity per user (most recent)
      const uniqueUserActivities = activities.reduce((acc: any[], activity: any) => {
        const existingUserIndex = acc.findIndex(item => item.userId === activity.userId);
        
        if (existingUserIndex === -1) {
          // New user, add their activity
          acc.push(activity);
        } else {
          // User already exists, replace with more recent activity if this one is newer
          if (activity.timestamp > acc[existingUserIndex].timestamp) {
            acc[existingUserIndex] = activity;
          }
        }
        
        return acc;
      }, []);

      // Sort by timestamp (most recent first) and take top 5
      const sortedUniqueActivities = uniqueUserActivities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);

      setRecentActivities(sortedUniqueActivities);
      toast({
        title: "Data refreshed",
        description: "Activity data has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl font-medium animate-pulse-gentle">
              Loading users data...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <UsersIcon className="mr-2 h-6 w-6" />
              Dashboard Users
            </h1>
            <p className="text-muted-foreground">
              Users who have access to your SmartView dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshActivityData}
            >
              <Activity className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
            <CardDescription>People with access to your SmartView dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground flex flex-col items-center gap-2">
                  <p>No users found</p>
                  <span className="text-xs">Invite users by sharing the dashboard link or by enabling user registration in settings.</span>
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.uid} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{user.displayName || user.email}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-blue-500">User</Badge>
                          <Badge variant="outline" className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent User Activity
              </CardTitle>
              <CardDescription>Latest activity from each user (one per user)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                    <span className="text-xs">Activity will appear here as users interact with the dashboard</span>
                  </div>
                ) : (
                  recentActivities.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.userName || activity.userEmail)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.userName || activity.userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.location}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Dashboard Access Permissions
              </CardTitle>
              <CardDescription>User access levels for the SmartView dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardPermissions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No dashboard permissions set</p>
                    <span className="text-xs">Dashboard permissions will appear here as they are configured</span>
                  </div>
                ) : (
                  dashboardPermissions.slice(0, 8).map((permission, index) => (
                    <div key={permission.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(permission.userName || permission.userEmail)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {permission.userName || permission.userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getDashboardPermissionDescription(permission)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Granted: {formatDate(permission.grantedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDashboardPermissionIcon(permission.dashboardAccess)}
                        <Badge className={getDashboardPermissionBadgeColor(permission.dashboardAccess)}>
                          {getDashboardPermissionLabel(permission.dashboardAccess)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;

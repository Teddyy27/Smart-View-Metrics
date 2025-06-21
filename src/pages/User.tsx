import React, { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  LogOut,
  Shield,
  Clock,
  Activity,
  Building,
  Key,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useUserData } from '@/hooks/useUserData';

const UserPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data, loading: dataLoading, trackPageAccess } = useUserData();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Track page access when component mounts
  useEffect(() => {
    if (user) {
      trackPageAccess('User Profile');
    }
  }, [user, trackPageAccess]);

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

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl font-medium animate-pulse-gentle">
              Loading authentication...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

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

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'administrator':
        return 'bg-red-500';
      case 'editor':
        return 'bg-blue-500';
      case 'viewer':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Calculate user statistics with fallbacks
  const totalLogins = data.loginHistory?.length || 0;
  const lastLogin = data.loginHistory?.[0]?.loginTime || Date.now();
  const totalActivities = data.activities?.length || 0;
  const uniqueDashboards = new Set(data.dashboardAccess?.map(access => access.dashboardName) || []).size;
  const totalUsers = data.allUsers?.length || 1; // At least 1 (current user)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* User Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback className="text-lg">
                  {getInitials(user.displayName || user.email?.split('@')[0] || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{user.displayName || user.email?.split('@')[0]}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">
                    <Key className="w-3 h-3 mr-1" />
                    Active User
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    Last login: {formatDate(lastLogin)}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Logins</p>
                  <p className="text-2xl font-bold">{totalLogins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Activities</p>
                  <p className="text-2xl font-bold">{totalActivities}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Dashboards</p>
                  <p className="text-2xl font-bold">{uniqueDashboards}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </CardTitle>
              <CardDescription>Your latest dashboard interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!data.activities || data.activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activities yet</p>
                    <p className="text-sm text-muted-foreground">Your activities will appear here as you use the dashboard</p>
                  </div>
                ) : (
                  data.activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{activity.action}</h3>
                        <p className="text-sm text-muted-foreground">{activity.location}</p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground mt-1">{activity.details}</p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground ml-4">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Login History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Login History
              </CardTitle>
              <CardDescription>Your recent login sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!data.loginHistory || data.loginHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No login history yet</p>
                    <p className="text-sm text-muted-foreground">Your login sessions will appear here</p>
                  </div>
                ) : (
                  data.loginHistory.slice(0, 10).map((login) => (
                    <div key={login.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">Login Session</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(login.loginTime)}
                        </p>
                        {login.sessionDuration && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Duration: {formatDuration(login.sessionDuration)}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-4">
                        {login.logoutTime ? 'Completed' : 'Active'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Access History */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dashboard Access History
              </CardTitle>
              <CardDescription>Pages and dashboards you've accessed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!data.dashboardAccess || data.dashboardAccess.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No dashboard access yet</p>
                    <p className="text-sm text-muted-foreground">Your dashboard visits will appear here</p>
                  </div>
                ) : (
                  data.dashboardAccess.slice(0, 10).map((access) => (
                    <div key={access.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <h3 className="font-medium">{access.dashboardName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Last accessed: {formatDate(access.lastAccessed)}
                          </p>
                        </div>
                        <Badge className={getRoleBadgeColor(access.role)}>
                          {access.role}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{access.accessCount}</p>
                        <p className="text-xs text-muted-foreground">visits</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Dashboard Users */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Dashboard Users
              </CardTitle>
              <CardDescription>Users who have accessed the dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!data.allUsers || data.allUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No other users found</p>
                    <p className="text-sm text-muted-foreground">You're the first user of this dashboard</p>
                  </div>
                ) : (
                  data.allUsers.map((dashboardUser) => (
                    <div key={dashboardUser.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(dashboardUser.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{dashboardUser.userName}</h3>
                          <p className="text-sm text-muted-foreground">{dashboardUser.userEmail}</p>
                          <p className="text-xs text-muted-foreground">
                            Dashboards: {dashboardUser.dashboards.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{dashboardUser.totalLogins}</p>
                        <p className="text-xs text-muted-foreground">logins</p>
                        <p className="text-xs text-muted-foreground">
                          Last: {formatDate(dashboardUser.lastActivity)}
                        </p>
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

export default UserPage; 
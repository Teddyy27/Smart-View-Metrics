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
  Building
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserData } from '@/hooks/useUserData';

const UsersPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, loading, trackPageAccess } = useUserData();

  // Track page access when component mounts
  useEffect(() => {
    trackPageAccess('Users Management');
  }, [trackPageAccess]);

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

  const filteredUsers = data.allUsers.filter(dashboardUser => 
    dashboardUser.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    dashboardUser.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Users who have accessed the smart home dashboard
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <Button>
              <UserRound className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription>People with access to your smart home dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No users found</p>
              ) : (
                filteredUsers.map((dashboardUser) => (
                  <div key={dashboardUser.userId} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(dashboardUser.userName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{dashboardUser.userName}</h3>
                        <p className="text-sm text-muted-foreground">{dashboardUser.userEmail}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className="bg-blue-500">
                            User
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(dashboardUser.lastActivity)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium">Dashboards: </span>
                        <span>{dashboardUser.dashboards.join(', ')}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium">Logins: </span>
                        <span>{dashboardUser.totalLogins}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="destructive">Remove</Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent User Activity
              </CardTitle>
              <CardDescription>Latest dashboard interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{activity.userName}</h3>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(activity.timestamp)}</p>
                  </div>
                ))}
                {data.activities.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Dashboard Access Summary
              </CardTitle>
              <CardDescription>Users with access to each dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Dashboard</h3>
                    <p className="text-sm text-muted-foreground">Main dashboard access</p>
                  </div>
                  <Badge>{data.allUsers.filter(u => u.dashboards.includes('Dashboard')).length} Users</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Analytics</h3>
                    <p className="text-sm text-muted-foreground">Analytics and reports</p>
                  </div>
                  <Badge>{data.allUsers.filter(u => u.dashboards.includes('Analytics')).length} Users</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">User Profile</h3>
                    <p className="text-sm text-muted-foreground">User management</p>
                  </div>
                  <Badge>{data.allUsers.filter(u => u.dashboards.includes('User Profile')).length} Users</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;

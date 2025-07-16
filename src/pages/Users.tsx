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
import { getDatabase, ref as dbRef, onValue } from 'firebase/database';

const UsersPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredUsers = users.filter(user =>
    (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <div>
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
            <CardDescription>People with access to your smart home dashboard</CardDescription>
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
                {/* This section will need to be updated to fetch activities from the database */}
                {/* For now, it will show a placeholder or be removed if not directly applicable */}
                <p className="text-center py-4 text-muted-foreground">Recent activity data not available from Realtime Database.</p>
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
                  <Badge>{users.filter(u => u.dashboards && u.dashboards.includes('Dashboard')).length} Users</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Analytics</h3>
                    <p className="text-sm text-muted-foreground">Analytics and reports</p>
                  </div>
                  <Badge>{users.filter(u => u.dashboards && u.dashboards.includes('Analytics')).length} Users</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">User Profile</h3>
                    <p className="text-sm text-muted-foreground">User management</p>
                  </div>
                  <Badge>{users.filter(u => u.dashboards && u.dashboards.includes('User Profile')).length} Users</Badge>
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

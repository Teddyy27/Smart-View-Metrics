
import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  UserRound, 
  Users as UsersIcon, 
  Search, 
  Clock, 
  Activity,
  Building
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
  lastActive: Date;
  dashboards: string[];
}

const UsersPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for family and friends using the dashboard
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'Administrator',
      lastActive: new Date(),
      dashboards: ['Energy Management', 'Security Systems', 'Building Automation']
    },
    {
      id: '2',
      name: 'Emily Johnson',
      email: 'emily@example.com',
      role: 'Editor',
      photoUrl: 'https://i.pravatar.cc/150?u=emily',
      lastActive: new Date(Date.now() - 3600000),
      dashboards: ['Energy Management', 'Building Automation']
    },
    {
      id: '3',
      name: 'Michael Brown',
      email: 'michael@example.com',
      role: 'Viewer',
      lastActive: new Date(Date.now() - 86400000),
      dashboards: ['Energy Management']
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      role: 'Editor',
      photoUrl: 'https://i.pravatar.cc/150?u=sarah',
      lastActive: new Date(Date.now() - 172800000),
      dashboards: ['Building Automation', 'Security Systems']
    },
    {
      id: '5',
      name: 'David Martinez',
      email: 'david@example.com',
      role: 'Viewer',
      lastActive: new Date(Date.now() - 259200000),
      dashboards: ['Energy Management']
    }
  ]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
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
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Family and friends with access to the dashboard
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoUrl} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                          <Badge variant="outline" className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(user.lastActive)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium">Dashboards: </span>
                        <span>{user.dashboards.join(', ')}</span>
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
                User Activity
              </CardTitle>
              <CardDescription>Recent dashboard interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Emily Johnson</h3>
                    <p className="text-sm text-muted-foreground">Adjusted thermostat settings</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(new Date(Date.now() - 1800000))}</p>
                </div>
                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">John Smith</h3>
                    <p className="text-sm text-muted-foreground">Viewed energy dashboard</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(new Date(Date.now() - 3600000))}</p>
                </div>
                <div className="flex items-start justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Sarah Wilson</h3>
                    <p className="text-sm text-muted-foreground">Generated energy report</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(new Date(Date.now() - 5400000))}</p>
                </div>
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
                    <h3 className="font-medium">Energy Management</h3>
                    <p className="text-sm text-muted-foreground">Power usage and optimization</p>
                  </div>
                  <Badge>4 Users</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Security Systems</h3>
                    <p className="text-sm text-muted-foreground">Cameras and sensors</p>
                  </div>
                  <Badge>2 Users</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Building Automation</h3>
                    <p className="text-sm text-muted-foreground">Smart controls and schedules</p>
                  </div>
                  <Badge>3 Users</Badge>
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

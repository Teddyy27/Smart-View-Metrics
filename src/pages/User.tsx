import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  LogOut,
  Shield,
  Clock,
  Activity,
  Building,
  Key
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface UserActivity {
  id: string;
  action: string;
  timestamp: Date;
  location: string;
}

interface DashboardAccess {
  id: string;
  name: string;
  role: string;
  lastAccessed: Date;
}

const UserPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Mock data for user activities and dashboard access
  const [recentActivities] = useState<UserActivity[]>([
    {
      id: '1',
      action: 'Accessed Energy Dashboard',
      timestamp: new Date(),
      location: 'Main Building'
    },
    {
      id: '2',
      action: 'Modified Device Settings',
      timestamp: new Date(Date.now() - 3600000),
      location: 'Floor 2'
    },
    {
      id: '3',
      action: 'Generated Energy Report',
      timestamp: new Date(Date.now() - 7200000),
      location: 'System Wide'
    }
  ]);

  const [dashboardAccess] = useState<DashboardAccess[]>([
    {
      id: '1',
      name: 'Energy Management',
      role: 'Administrator',
      lastAccessed: new Date()
    },
    {
      id: '2',
      name: 'Building Controls',
      role: 'Editor',
      lastAccessed: new Date(Date.now() - 86400000)
    },
    {
      id: '3',
      name: 'Security Systems',
      role: 'Viewer',
      lastAccessed: new Date(Date.now() - 172800000)
    }
  ]);

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
            <p className="text-muted-foreground">Loading...</p>
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
                    Last login: {formatDate(new Date(user.metadata.lastSignInTime))}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dashboard Access */}
         
        </div>
      </div>
    </Layout>
  );
};

export default UserPage; 
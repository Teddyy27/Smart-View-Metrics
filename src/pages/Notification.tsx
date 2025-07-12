import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell, Eye } from 'lucide-react';

const Notification = () => (
  <Layout>
    <div className="max-w-7xl mx-auto py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Notification</h1>
        <p className="text-muted-foreground">System notifications and alerts</p>
        <p className="text-xs text-muted-foreground mt-1">Last checked: {new Date().toLocaleString()}</p>
      </div>
      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">All devices are under control</div>
            <p className="text-xs text-muted-foreground mt-1">No issues detected</p>
          </CardContent>
        </Card>
      </div>
      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Motion Detection</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">No motion detected</div>
            <p className="text-xs text-muted-foreground mt-1">Security system active</p>
          </CardContent>
        </Card>
      </div>
      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dashboard Updates</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Real-time updates only</div>
            <p className="text-xs text-muted-foreground mt-1">System updates are shown on dashboard</p>
          </CardContent>
        </Card>
      </div>
    </div>
  </Layout>
);

export default Notification; 

import React from 'react';
import { 
  Home, 
  BarChart2, 
  Users, 
  Settings, 
  Bell, 
  FileText, 
  PieChart,
  Database,
  Zap,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

interface SidebarItem {
  name: string;
  icon: React.ElementType;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
    { name: 'Users', icon: Users, path: '/users' },
    { name: 'Reports', icon: FileText, path: '/reports' },
    { name: 'Automation', icon: Zap, path: '/automation' },
    { name: 'Data Sources', icon: Database, path: '/data-sources' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <aside 
      className={cn(
        "h-screen bg-background border-r transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center p-4 h-16 border-b">
        {!collapsed && (
          <div className="font-bold text-xl text-foreground flex items-center">
            <Zap className="mr-2 h-6 w-6 text-primary" />
            <span>SmartView</span>
          </div>
        )}
        {collapsed && (
          <Zap className="h-6 w-6 text-primary mx-auto" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.name}>
                <a 
                  href={item.path}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                    collapsed && "justify-center"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", collapsed ? "mx-0" : "mr-3")} />
                  {!collapsed && <span>{item.name}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full flex items-center justify-center gap-2"
          onClick={() => window.location.href = '/login'}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;

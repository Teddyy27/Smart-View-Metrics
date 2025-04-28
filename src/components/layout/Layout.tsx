
import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  
  // Check for user preference on initial load
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true' || 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    setIsDarkTheme(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          toggleSidebar={toggleSidebar} 
          toggleTheme={toggleTheme}
          isDarkTheme={isDarkTheme}
        />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

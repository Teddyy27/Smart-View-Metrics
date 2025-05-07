import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  
  // Set light theme as default on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    // Only apply dark theme if explicitly set to true
    if (savedTheme === 'true') {
      setIsDarkTheme(true);
      document.documentElement.classList.add('dark');
    } else {
      // Ensure light theme by default
      setIsDarkTheme(false);
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
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

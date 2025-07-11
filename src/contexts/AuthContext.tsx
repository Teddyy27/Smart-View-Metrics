import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/services/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { trackUserLogin, trackUserLogout } from '@/services/userActivityService';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Track login (but don't block UI if it fails)
          try {
            await trackUserLogin(user);
          } catch (error) {
            console.error('Error tracking login:', error);
          }
          // Show notification toast on login
          const { dismiss } = toast({
            title: 'System Status',
            description: 'All devices are under control',
          });
          setTimeout(() => dismiss(), 10000);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setUser(user);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Track logout when component unmounts or user changes
  useEffect(() => {
    return () => {
      if (user) {
        try {
          trackUserLogout(user);
        } catch (error) {
          console.error('Error tracking logout:', error);
        }
      }
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}; 
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserLoginHistory, 
  getUserActivities, 
  getDashboardAccessHistory,
  getAllDashboardUsers,
  trackDashboardAccess,
  trackUserActivity,
  LoginHistory,
  UserActivity,
  DashboardAccess
} from '@/services/userActivityService';

export interface UserData {
  loginHistory: LoginHistory[];
  activities: UserActivity[];
  dashboardAccess: DashboardAccess[];
  allUsers: {
    userId: string;
    userEmail: string;
    userName: string;
    lastLogin: number;
    totalLogins: number;
    lastActivity: number;
    dashboards: string[];
  }[];
}

export const useUserData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    loginHistory: [],
    activities: [],
    dashboardAccess: [],
    allUsers: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all user data in parallel with error handling
        const [loginHistory, activities, dashboardAccess, allUsers] = await Promise.allSettled([
          getUserLoginHistory(user.uid),
          getUserActivities(user.uid, 20), // Get last 20 activities
          getDashboardAccessHistory(user.uid),
          getAllDashboardUsers()
        ]);

        setData({
          loginHistory: loginHistory.status === 'fulfilled' ? loginHistory.value : [],
          activities: activities.status === 'fulfilled' ? activities.value : [],
          dashboardAccess: dashboardAccess.status === 'fulfilled' ? dashboardAccess.value : [],
          allUsers: allUsers.status === 'fulfilled' ? allUsers.value : []
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Don't set loading to false on error, just continue with empty data
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const trackPageAccess = async (pageName: string) => {
    if (user) {
      try {
        await trackDashboardAccess(user, pageName, 'User');
        await trackUserActivity(user, `Accessed ${pageName}`, pageName, `User accessed ${pageName} page`);
      } catch (error) {
        console.error('Error tracking page access:', error);
        // Don't throw error, just log it
      }
    }
  };

  return {
    data,
    loading,
    trackPageAccess
  };
}; 
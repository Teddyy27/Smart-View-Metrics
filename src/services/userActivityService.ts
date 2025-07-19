import { db } from './firebase';
import { ref, push, set, get, query, orderByChild, limitToLast } from 'firebase/database';
import { User } from 'firebase/auth';

export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  timestamp: number;
  location: string;
  details?: string;
}

export interface DashboardAccess {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  dashboardName: string;
  role: string;
  lastAccessed: number;
  accessCount: number;
}

export interface LoginHistory {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  loginTime: number;
  logoutTime?: number;
  sessionDuration?: number;
  ipAddress?: string;
  userAgent?: string;
}

// Track user login
export const trackUserLogin = async (user: User) => {
  try {
    const loginData = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      loginTime: Date.now(),
      location: 'Unknown'
    };

    const loginRef = ref(db, 'user_activity/login_history');
    const newLoginRef = push(loginRef);
    await set(newLoginRef, loginData);

    console.log('User login tracked successfully');
  } catch (error) {
    console.error('Error tracking user login:', error);
  }
};

// Track user logout
export const trackUserLogout = async (user: User) => {
  try {
    const logoutData = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      loginTime: Date.now(),
      location: 'Unknown'
    };

    const logoutRef = ref(db, 'user_activity/logout_history');
    const newLogoutRef = push(logoutRef);
    await set(newLogoutRef, logoutData);

    console.log('User logout tracked successfully');
  } catch (error) {
    console.error('Error tracking user logout:', error);
  }
};

// Track user activity
export const trackUserActivity = async (
  user: User, 
  action: string, 
  location: string, 
  details?: string
) => {
  try {
    const activityData: Omit<UserActivity, 'id'> = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      action,
      timestamp: Date.now(),
      location,
      details
    };

    const activityRef = ref(db, 'user_activity/activities');
    const newActivityRef = push(activityRef);
    await set(newActivityRef, activityData);

    console.log('User activity tracked successfully');
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
};

// Track dashboard access
export const trackDashboardAccess = async (
  user: User, 
  dashboardName: string, 
  role: string = 'User'
) => {
  try {
    const accessData: Omit<DashboardAccess, 'id'> = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      dashboardName,
      role,
      lastAccessed: Date.now(),
      accessCount: 1
    };

    const accessRef = ref(db, 'user_activity/dashboard_access');
    const newAccessRef = push(accessRef);
    await set(newAccessRef, accessData);

    // Also track as activity
    await trackUserActivity(user, `Accessed ${dashboardName}`, dashboardName, `User accessed ${dashboardName} dashboard`);

    console.log('Dashboard access tracked successfully');
  } catch (error) {
    console.error('Error tracking dashboard access:', error);
  }
};

// Get user login history
export const getUserLoginHistory = async (userId?: string, limit: number = 20): Promise<LoginHistory[]> => {
  try {
    const loginHistoryRef = ref(db, 'user_activity/login_history');
    const snapshot = await get(loginHistoryRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const logins = snapshot.val();
    const loginList: LoginHistory[] = Object.keys(logins).map(id => ({
      id,
      ...logins[id]
    }));

    // Filter by user if specified
    if (userId) {
      return loginList
        .filter(login => login.userId === userId)
        .sort((a, b) => b.loginTime - a.loginTime)
        .slice(0, limit);
    }

    // Sort by timestamp (newest first) and limit
    return loginList
      .sort((a, b) => b.loginTime - a.loginTime)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting user login history:', error);
    return [];
  }
};

// Get user activities
export const getUserActivities = async (userId?: string, limit: number = 50): Promise<UserActivity[]> => {
  try {
    const activitiesRef = ref(db, 'user_activity/activities');
    const snapshot = await get(activitiesRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const activities = snapshot.val();
    const activityList: UserActivity[] = Object.keys(activities).map(id => ({
      id,
      ...activities[id]
    }));

    // Filter by user if specified
    if (userId) {
      return activityList
        .filter(activity => activity.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }

    // Sort by timestamp (newest first) and limit
    return activityList
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting user activities:', error);
    return [];
  }
};

// Get dashboard access history
export const getDashboardAccessHistory = async (userId?: string): Promise<DashboardAccess[]> => {
  try {
    const accessRef = ref(db, 'user_activity/dashboard_access');
    const snapshot = await get(accessRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const accesses = snapshot.val();
    const accessList: DashboardAccess[] = Object.keys(accesses).map(id => ({
      id,
      ...accesses[id]
    }));

    // Filter by user if specified
    if (userId) {
      return accessList
        .filter(access => access.userId === userId)
        .sort((a, b) => b.lastAccessed - a.lastAccessed);
    }

    // Sort by last accessed (newest first)
    return accessList.sort((a, b) => b.lastAccessed - a.lastAccessed);
  } catch (error) {
    console.error('Error getting dashboard access history:', error);
    return [];
  }
};

// Get all users who have accessed the dashboard
export const getAllDashboardUsers = async (): Promise<{
  userId: string;
  userEmail: string;
  userName: string;
  lastLogin: number;
  totalLogins: number;
  lastActivity: number;
  dashboards: string[];
}[]> => {
  try {
    const loginHistoryRef = ref(db, 'user_activity/login_history');
    const activitiesRef = ref(db, 'user_activity/activities');
    const accessRef = ref(db, 'user_activity/dashboard_access');

    const [loginSnapshot, activitiesSnapshot, accessSnapshot] = await Promise.all([
      get(loginHistoryRef),
      get(activitiesRef),
      get(accessRef)
    ]);

    const users = new Map<string, {
      userId: string;
      userEmail: string;
      userName: string;
      lastLogin: number;
      totalLogins: number;
      lastActivity: number;
      dashboards: Set<string>;
    }>();

    // Process login history
    if (loginSnapshot.exists()) {
      const logins = loginSnapshot.val();
      Object.values(logins).forEach((login: any) => {
        const user = users.get(login.userId) || {
          userId: login.userId,
          userEmail: login.userEmail,
          userName: login.userName,
          lastLogin: 0,
          totalLogins: 0,
          lastActivity: 0,
          dashboards: new Set<string>()
        };

        user.lastLogin = Math.max(user.lastLogin, login.loginTime);
        user.totalLogins += 1;
        users.set(login.userId, user);
      });
    }

    // Process activities
    if (activitiesSnapshot.exists()) {
      const activities = activitiesSnapshot.val();
      Object.values(activities).forEach((activity: any) => {
        const user = users.get(activity.userId);
        if (user) {
          user.lastActivity = Math.max(user.lastActivity, activity.timestamp);
        }
      });
    }

    // Process dashboard access
    if (accessSnapshot.exists()) {
      const accesses = accessSnapshot.val();
      Object.values(accesses).forEach((access: any) => {
        const user = users.get(access.userId);
        if (user) {
          user.dashboards.add(access.dashboardName);
        }
      });
    }

    // Convert to array and sort by last activity
    return Array.from(users.values())
      .map(user => ({
        ...user,
        dashboards: Array.from(user.dashboards)
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  } catch (error) {
    console.error('Error getting all dashboard users:', error);
    return [];
  }
}; 
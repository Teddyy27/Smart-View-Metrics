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

export interface UserDevicePermission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  permissionLevel: 'full' | 'control' | 'view' | 'restricted';
  grantedAt: number;
  grantedBy: string;
  lastAccessed?: number;
  accessCount: number;
}

export interface UserDashboardPermission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  dashboardAccess: 'admin' | 'editor' | 'viewer' | 'readonly' | 'restricted';
  grantedAt: number;
  grantedBy: string;
  lastAccessed?: number;
  accessCount: number;
  canManageUsers: boolean;
  canManageDevices: boolean;
  canViewAnalytics: boolean;
  canManageAutomation: boolean;
  canAccessSettings: boolean;
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

    console.log('User activity tracked successfully:', {
      userId: user.uid,
      action,
      location,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking user activity:', error);
    throw error; // Re-throw to allow calling code to handle
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

    console.log('Dashboard access tracked successfully:', {
      userId: user.uid,
      dashboardName,
      role,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking dashboard access:', error);
    throw error; // Re-throw to allow calling code to handle
  }
};

// Track user device access
export const trackUserDeviceAccess = async (
  user: User,
  deviceId: string,
  deviceName: string,
  deviceType: string,
  action: string
) => {
  try {
    const accessData = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      deviceId,
      deviceName,
      deviceType,
      action,
      timestamp: Date.now(),
      location: 'Device Control'
    };

    const accessRef = ref(db, 'user_activity/device_access');
    const newAccessRef = push(accessRef);
    await set(newAccessRef, accessData);

    console.log('User device access tracked successfully:', {
      userId: user.uid,
      deviceId,
      deviceName,
      action,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking user device access:', error);
  }
};

// Grant device permission to user
export const grantDevicePermission = async (
  user: User,
  deviceId: string,
  deviceName: string,
  deviceType: string,
  permissionLevel: 'full' | 'control' | 'view' | 'restricted',
  grantedBy: string
) => {
  try {
    const permissionData: Omit<UserDevicePermission, 'id'> = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      deviceId,
      deviceName,
      deviceType,
      permissionLevel,
      grantedAt: Date.now(),
      grantedBy,
      accessCount: 0
    };

    const permissionRef = ref(db, 'user_permissions/device_permissions');
    const newPermissionRef = push(permissionRef);
    await set(newPermissionRef, permissionData);

    // Also track as activity
    await trackUserActivity(user, `Device Permission Granted: ${deviceName}`, 'Device Management', `User granted ${permissionLevel} access to ${deviceName}`);

    console.log('Device permission granted successfully:', {
      userId: user.uid,
      deviceId,
      deviceName,
      permissionLevel,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error granting device permission:', error);
  }
};

// Grant dashboard permission to user
export const grantDashboardPermission = async (
  user: User,
  dashboardAccess: 'admin' | 'editor' | 'viewer' | 'readonly' | 'restricted',
  grantedBy: string
) => {
  try {
    const permissionData: Omit<UserDashboardPermission, 'id'> = {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Unknown',
      dashboardAccess,
      grantedAt: Date.now(),
      grantedBy,
      accessCount: 0,
      canManageUsers: dashboardAccess === 'admin',
      canManageDevices: ['admin', 'editor'].includes(dashboardAccess),
      canViewAnalytics: ['admin', 'editor', 'viewer'].includes(dashboardAccess),
      canManageAutomation: ['admin', 'editor'].includes(dashboardAccess),
      canAccessSettings: dashboardAccess === 'admin'
    };

    const permissionRef = ref(db, 'user_permissions/dashboard_permissions');
    const newPermissionRef = push(permissionRef);
    await set(newPermissionRef, permissionData);

    // Also track as activity
    await trackUserActivity(user, `Dashboard Permission Granted: ${dashboardAccess}`, 'User Management', `User granted ${dashboardAccess} access to SmartView dashboard`);

    console.log('Dashboard permission granted successfully:', {
      userId: user.uid,
      dashboardAccess,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error granting dashboard permission:', error);
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
    console.log('Fetching user activities...', { userId, limit });
    const activitiesRef = ref(db, 'user_activity/activities');
    const snapshot = await get(activitiesRef);
    
    console.log('Activities snapshot exists:', snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log('No activities found in database');
      return [];
    }

    const activities = snapshot.val();
    console.log('Raw activities data:', activities);
    
    const activityList: UserActivity[] = Object.keys(activities).map(id => ({
      id,
      ...activities[id]
    }));

    console.log('Processed activities:', activityList.length);

    // Filter by user if specified
    if (userId) {
      const filtered = activityList
        .filter(activity => activity.userId === userId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      console.log('Filtered activities for user:', filtered.length);
      return filtered;
    }

    // Sort by timestamp (newest first) and limit
    const sorted = activityList
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    console.log('Sorted activities:', sorted.length);
    return sorted;
  } catch (error) {
    console.error('Error getting user activities:', error);
    return [];
  }
};

// Get dashboard access history
export const getDashboardAccessHistory = async (userId?: string): Promise<DashboardAccess[]> => {
  try {
    console.log('Fetching dashboard access history...', { userId });
    const accessRef = ref(db, 'user_activity/dashboard_access');
    const snapshot = await get(accessRef);
    
    console.log('Dashboard access snapshot exists:', snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log('No dashboard access found in database');
      return [];
    }

    const accesses = snapshot.val();
    console.log('Raw dashboard access data:', accesses);
    
    const accessList: DashboardAccess[] = Object.keys(accesses).map(id => ({
      id,
      ...accesses[id]
    }));

    console.log('Processed dashboard access:', accessList.length);

    // Filter by user if specified
    if (userId) {
      const filtered = accessList
        .filter(access => access.userId === userId)
        .sort((a, b) => b.lastAccessed - a.lastAccessed);
      console.log('Filtered dashboard access for user:', filtered.length);
      return filtered;
    }

    // Sort by last accessed (newest first)
    const sorted = accessList.sort((a, b) => b.lastAccessed - a.lastAccessed);
    console.log('Sorted dashboard access:', sorted.length);
    return sorted;
  } catch (error) {
    console.error('Error getting dashboard access history:', error);
    return [];
  }
};

// Get user device permissions
export const getUserDevicePermissions = async (userId?: string): Promise<UserDevicePermission[]> => {
  try {
    console.log('Fetching user device permissions...', { userId });
    const permissionsRef = ref(db, 'user_permissions/device_permissions');
    const snapshot = await get(permissionsRef);
    
    console.log('Device permissions snapshot exists:', snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log('No device permissions found in database');
      return [];
    }

    const permissions = snapshot.val();
    console.log('Raw device permissions data:', permissions);
    
    const permissionList: UserDevicePermission[] = Object.keys(permissions).map(id => ({
      id,
      ...permissions[id]
    }));

    console.log('Processed device permissions:', permissionList.length);

    // Filter by user if specified
    if (userId) {
      const filtered = permissionList
        .filter(permission => permission.userId === userId)
        .sort((a, b) => b.grantedAt - a.grantedAt);
      console.log('Filtered device permissions for user:', filtered.length);
      return filtered;
    }

    // Sort by granted time (newest first)
    const sorted = permissionList.sort((a, b) => b.grantedAt - a.grantedAt);
    console.log('Sorted device permissions:', sorted.length);
    return sorted;
  } catch (error) {
    console.error('Error getting user device permissions:', error);
    return [];
  }
};

// Get user dashboard permissions
export const getUserDashboardPermissions = async (userId?: string): Promise<UserDashboardPermission[]> => {
  try {
    console.log('Fetching user dashboard permissions...', { userId });
    const permissionsRef = ref(db, 'user_permissions/dashboard_permissions');
    const snapshot = await get(permissionsRef);
    
    console.log('Dashboard permissions snapshot exists:', snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log('No dashboard permissions found in database');
      return [];
    }

    const permissions = snapshot.val();
    console.log('Raw dashboard permissions data:', permissions);
    
    const permissionList: UserDashboardPermission[] = Object.keys(permissions).map(id => ({
      id,
      ...permissions[id]
    }));

    console.log('Processed dashboard permissions:', permissionList.length);

    // Filter by user if specified
    if (userId) {
      const filtered = permissionList
        .filter(permission => permission.userId === userId)
        .sort((a, b) => b.grantedAt - a.grantedAt);
      console.log('Filtered dashboard permissions for user:', filtered.length);
      return filtered;
    }

    // Sort by granted time (newest first)
    const sorted = permissionList.sort((a, b) => b.grantedAt - a.grantedAt);
    console.log('Sorted dashboard permissions:', sorted.length);
    return sorted;
  } catch (error) {
    console.error('Error getting user dashboard permissions:', error);
    return [];
  }
};

// Get device access history
export const getDeviceAccessHistory = async (deviceId?: string): Promise<any[]> => {
  try {
    console.log('Fetching device access history...', { deviceId });
    const accessRef = ref(db, 'user_activity/device_access');
    const snapshot = await get(accessRef);
    
    console.log('Device access snapshot exists:', snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log('No device access found in database');
      return [];
    }

    const accesses = snapshot.val();
    console.log('Raw device access data:', accesses);
    
    const accessList = Object.keys(accesses).map(id => ({
      id,
      ...accesses[id]
    }));

    console.log('Processed device access:', accessList.length);

    // Filter by device if specified
    if (deviceId) {
      const filtered = accessList
        .filter(access => access.deviceId === deviceId)
        .sort((a, b) => b.timestamp - a.timestamp);
      console.log('Filtered device access for device:', filtered.length);
      return filtered;
    }

    // Sort by timestamp (newest first)
    const sorted = accessList.sort((a, b) => b.timestamp - a.timestamp);
    console.log('Sorted device access:', sorted.length);
    return sorted;
  } catch (error) {
    console.error('Error getting device access history:', error);
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

// Utility function to generate sample activity data for testing
export const generateSampleActivityData = async (user: User) => {
  try {
    console.log('Generating sample activity data for user:', user.uid);
    
    const sampleActivities = [
      {
        action: 'Accessed Dashboard',
        location: 'Dashboard',
        details: 'User accessed main dashboard overview'
      },
      {
        action: 'Viewed Analytics',
        location: 'Analytics',
        details: 'User viewed analytics and reports'
      },
      {
        action: 'Checked User Management',
        location: 'Users',
        details: 'User accessed user management section'
      },
      {
        action: 'Viewed Reports',
        location: 'Report',
        details: 'User accessed reports section'
      },
      {
        action: 'Checked Settings',
        location: 'Settings',
        details: 'User accessed application settings'
      }
    ];

    const sampleDashboardAccess = [
      'Dashboard',
      'Analytics', 
      'Users',
      'Report',
      'Settings'
    ];

    // Generate sample activities
    for (const activity of sampleActivities) {
      await trackUserActivity(user, activity.action, activity.location, activity.details);
    }

    // Generate sample dashboard access
    for (const dashboard of sampleDashboardAccess) {
      await trackDashboardAccess(user, dashboard, 'User');
    }

    console.log('Sample activity data generated successfully');
  } catch (error) {
    console.error('Error generating sample activity data:', error);
  }
};

// Check if database has activity data and generate sample if empty
export const ensureActivityDataExists = async (user: User) => {
  try {
    const activities = await getUserActivities(undefined, 1);
    const dashboardAccess = await getDashboardAccessHistory();
    
    if (activities.length === 0 && dashboardAccess.length === 0) {
      console.log('No activity data found, generating sample data...');
      await generateSampleActivityData(user);
    } else {
      console.log('Activity data already exists:', {
        activities: activities.length,
        dashboardAccess: dashboardAccess.length
      });
    }
  } catch (error) {
    console.error('Error ensuring activity data exists:', error);
  }
}; 

// Generate sample device permissions for testing
export const generateSampleDevicePermissions = async (user: User, devices: any[]) => {
  try {
    console.log('Generating sample device permissions for user:', user.uid);
    
    const permissionLevels = ['full', 'control', 'view', 'restricted'];
    
    for (const device of devices) {
      const randomPermission = permissionLevels[Math.floor(Math.random() * permissionLevels.length)] as 'full' | 'control' | 'view' | 'restricted';
      
      await grantDevicePermission(
        user,
        device.id,
        device.name,
        device.type,
        randomPermission,
        'System'
      );
    }

    console.log('Sample device permissions generated successfully');
  } catch (error) {
    console.error('Error generating sample device permissions:', error);
  }
}; 

// Generate sample dashboard permissions for testing
export const generateSampleDashboardPermissions = async (user: User) => {
  try {
    console.log('Generating sample dashboard permissions for user:', user.uid);
    
    const permissionLevels = ['admin', 'editor', 'viewer', 'readonly', 'restricted'] as const;
    const randomPermission = permissionLevels[Math.floor(Math.random() * permissionLevels.length)];
    
    await grantDashboardPermission(
      user,
      randomPermission,
      'System'
    );

    console.log('Sample dashboard permissions generated successfully');
  } catch (error) {
    console.error('Error generating sample dashboard permissions:', error);
  }
}; 
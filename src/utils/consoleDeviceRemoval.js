// ========================================
// EMERGENCY FIREBASE DEVICE REMOVAL & DEBUG
// ========================================
// Run this in your browser console to debug Firebase issues

// Import Firebase functions (if available in global scope)
const { getDatabase, ref, remove, get, set, onValue, off } = firebase.database;

// Get database instance
const db = getDatabase();

// ========================================
// DEBUGGING FUNCTIONS
// ========================================

/**
 * Test Firebase connection and permissions
 */
async function testFirebaseConnection() {
  console.log('🔍 Testing Firebase connection...');
  
  try {
    // Test write
    const testRef = ref(db, 'console-test');
    await set(testRef, { timestamp: Date.now(), test: true });
    console.log('✅ Write permission: OK');
    
    // Test read
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log('✅ Read permission: OK');
    } else {
      throw new Error('Write succeeded but read failed');
    }
    
    // Test delete
    await remove(testRef);
    const verifySnapshot = await get(testRef);
    if (!verifySnapshot.exists()) {
      console.log('✅ Delete permission: OK');
    } else {
      throw new Error('Delete failed - data still exists');
    }
    
    console.log('🎉 All Firebase permissions working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return false;
  }
}

/**
 * Get detailed information about all devices
 */
async function getDeviceDetails() {
  console.log('📋 Getting device details...');
  
  try {
    const devicesRef = ref(db, 'devices');
    const snapshot = await get(devicesRef);
    
    if (!snapshot.exists()) {
      console.log('📭 No devices found in Firebase');
      return [];
    }
    
    const data = snapshot.val();
    const devices = Object.keys(data).map(id => ({
      id,
      ...data[id],
      path: `devices/${id}`,
      lastModified: data[id].lastUpdated || 'unknown'
    }));
    
    console.log(`📊 Found ${devices.length} devices:`);
    devices.forEach(device => {
      console.log(`  - ${device.id}: ${device.name} (${device.type}) - ${device.status}`);
    });
    
    return devices;
    
  } catch (error) {
    console.error('❌ Failed to get device details:', error);
    return [];
  }
}

/**
 * Monitor device changes in real-time
 */
function monitorDeviceChanges(duration = 10000) {
  console.log(`🔍 Monitoring device changes for ${duration}ms...`);
  
  const devicesRef = ref(db, 'devices');
  const changes = [];
  
  const listener = onValue(devicesRef, (snapshot) => {
    const timestamp = Date.now();
    const data = snapshot.val();
    const deviceCount = data ? Object.keys(data).length : 0;
    
    changes.push({
      timestamp,
      deviceCount,
      hasData: !!data,
      deviceIds: data ? Object.keys(data) : []
    });
    
    console.log(`📊 [${new Date(timestamp).toLocaleTimeString()}] Device count: ${deviceCount}`);
  });
  
  // Stop monitoring after duration
  setTimeout(() => {
    off(devicesRef, 'value', listener);
    console.log(`✅ Monitoring completed. ${changes.length} changes detected.`);
    
    if (changes.length > 1) {
      console.log('⚠️ Devices are being modified! Check for other sources adding devices.');
    } else {
      console.log('✅ No unexpected device changes detected.');
    }
  }, duration);
  
  return { stop: () => off(devicesRef, 'value', listener) };
}

/**
 * Test device path permissions
 */
async function testDevicePermissions(deviceId) {
  console.log(`🔍 Testing permissions for device: ${deviceId}`);
  
  try {
    const deviceRef = ref(db, `devices/${deviceId}`);
    
    // Test read
    const snapshot = await get(deviceRef);
    const canRead = snapshot.exists();
    console.log(`  Read: ${canRead ? '✅' : '❌'}`);
    
    if (!canRead) {
      console.log(`  Device ${deviceId} does not exist`);
      return false;
    }
    
    // Test write (update)
    const originalData = snapshot.val();
    const testData = { ...originalData, testWrite: Date.now() };
    await set(deviceRef, testData);
    console.log(`  Write: ✅`);
    
    // Test delete
    await remove(deviceRef);
    const deleteSnapshot = await get(deviceRef);
    const canDelete = !deleteSnapshot.exists();
    console.log(`  Delete: ${canDelete ? '✅' : '❌'}`);
    
    // Restore original data
    if (canDelete) {
      await set(deviceRef, originalData);
      console.log(`  Restored original data`);
    }
    
    return canRead && canDelete;
    
  } catch (error) {
    console.error(`❌ Permission test failed for ${deviceId}:`, error);
    return false;
  }
}

// ========================================
// REMOVAL FUNCTIONS
// ========================================

/**
 * List all devices
 */
async function listAllDevices() {
  const devices = await getDeviceDetails();
  return devices;
}

/**
 * Remove a specific device
 */
async function removeDevice(deviceId) {
  console.log(`🗑️ Removing device: ${deviceId}`);
  
  try {
    // Check if device exists
    const deviceRef = ref(db, `devices/${deviceId}`);
    const snapshot = await get(deviceRef);
    
    if (!snapshot.exists()) {
      console.log(`❌ Device ${deviceId} does not exist`);
      return false;
    }
    
    const deviceData = snapshot.val();
    console.log(`Found device: ${deviceData.name} (${deviceData.type})`);
    
    // Remove device
    await remove(deviceRef);
    
    // Verify removal
    const verifySnapshot = await get(deviceRef);
    if (!verifySnapshot.exists()) {
      console.log(`✅ Device ${deviceId} successfully removed`);
      return true;
    } else {
      console.log(`❌ Device ${deviceId} still exists after removal`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Failed to remove device ${deviceId}:`, error);
    return false;
  }
}

/**
 * Remove device by name
 */
async function removeByName(deviceName) {
  console.log(`🗑️ Removing device by name: ${deviceName}`);
  
  const devices = await getDeviceDetails();
  const device = devices.find(d => d.name === deviceName);
  
  if (!device) {
    console.log(`❌ No device found with name: ${deviceName}`);
    return false;
  }
  
  return await removeDevice(device.id);
}

/**
 * Remove all devices
 */
async function removeAll() {
  console.log('🚨 REMOVING ALL DEVICES');
  
  const devices = await getDeviceDetails();
  
  if (devices.length === 0) {
    console.log('📭 No devices to remove');
    return true;
  }
  
  console.log(`Found ${devices.length} devices to remove:`);
  devices.forEach(d => console.log(`  - ${d.id}: ${d.name}`));
  
  if (!confirm(`Are you sure you want to remove ALL ${devices.length} devices?`)) {
    console.log('❌ Operation cancelled');
    return false;
  }
  
  const results = [];
  
  for (const device of devices) {
    const success = await removeDevice(device.id);
    results.push({ deviceId: device.id, name: device.name, success });
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Removed ${successCount}/${devices.length} devices`);
  
  results.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.name} (${result.deviceId})`);
  });
  
  return successCount === devices.length;
}

/**
 * Force remove all devices (nuclear option)
 */
async function forceRemoveAll() {
  console.log('💥 FORCE REMOVING ALL DEVICES');
  
  if (!confirm('This will force remove ALL devices from Firebase. Are you absolutely sure?')) {
    console.log('❌ Operation cancelled');
    return false;
  }
  
  try {
    // Remove entire devices node
    const devicesRef = ref(db, 'devices');
    await remove(devicesRef);
    
    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verifySnapshot = await get(devicesRef);
    if (!verifySnapshot.exists()) {
      console.log('✅ Force removal successful - all devices removed');
      return true;
    } else {
      console.log('❌ Force removal failed - devices still exist');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Force removal failed:', error);
    return false;
  }
}

// ========================================
// COMPREHENSIVE DIAGNOSTIC
// ========================================

/**
 * Run full diagnostic
 */
async function runDiagnostic() {
  console.log('🚀 Starting comprehensive diagnostic...');
  
  const results = {
    connection: false,
    devices: [],
    permissions: [],
    monitoring: null
  };
  
  // Test connection
  console.log('\n1️⃣ Testing Firebase connection...');
  results.connection = await testFirebaseConnection();
  
  // Get devices
  console.log('\n2️⃣ Getting device information...');
  results.devices = await getDeviceDetails();
  
  // Test permissions for each device
  if (results.devices.length > 0) {
    console.log('\n3️⃣ Testing device permissions...');
    for (const device of results.devices.slice(0, 3)) { // Test first 3 devices
      const hasPermissions = await testDevicePermissions(device.id);
      results.permissions.push({ deviceId: device.id, name: device.name, hasPermissions });
    }
  }
  
  // Monitor for changes
  console.log('\n4️⃣ Monitoring for device changes (5 seconds)...');
  const monitoring = monitorDeviceChanges(5000);
  results.monitoring = monitoring;
  
  // Wait for monitoring to complete
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  console.log('\n📊 DIAGNOSTIC RESULTS:');
  console.log(`  Connection: ${results.connection ? '✅' : '❌'}`);
  console.log(`  Devices: ${results.devices.length}`);
  console.log(`  Permissions: ${results.permissions.filter(p => p.hasPermissions).length}/${results.permissions.length}`);
  
  if (!results.connection) {
    console.log('\n❌ FIREBASE CONNECTION ISSUE DETECTED');
    console.log('   This is likely a Firebase configuration or permission problem.');
  }
  
  if (results.devices.length > 0 && results.permissions.some(p => !p.hasPermissions)) {
    console.log('\n⚠️ DEVICE PERMISSION ISSUES DETECTED');
    console.log('   Some devices cannot be modified or deleted.');
  }
  
  return results;
}

// ========================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ========================================

window.FirebaseDebug = {
  // Debugging
  testConnection: testFirebaseConnection,
  getDeviceDetails,
  monitorDeviceChanges,
  testDevicePermissions,
  runDiagnostic,
  
  // Removal
  listAllDevices,
  removeDevice,
  removeByName,
  removeAll,
  forceRemoveAll
};

console.log('🔧 Firebase Debug Tools loaded!');
console.log('Available functions:');
console.log('  FirebaseDebug.testConnection() - Test Firebase connection');
console.log('  FirebaseDebug.getDeviceDetails() - Get all device details');
console.log('  FirebaseDebug.monitorDeviceChanges() - Monitor device changes');
console.log('  FirebaseDebug.runDiagnostic() - Run full diagnostic');
console.log('  FirebaseDebug.listAllDevices() - List all devices');
console.log('  FirebaseDebug.removeDevice(id) - Remove specific device');
console.log('  FirebaseDebug.removeByName(name) - Remove device by name');
console.log('  FirebaseDebug.removeAll() - Remove all devices');
console.log('  FirebaseDebug.forceRemoveAll() - Force remove all devices');

// ========================================
// DEVICE RECREATION DETECTION
// ========================================

/**
 * Monitor for device recreation after deletion
 */
function monitorDeviceRecreation(duration = 30000) {
  console.log(`🔍 Monitoring device recreation for ${duration}ms...`);
  
  const devicesRef = ref(db, 'devices');
  let initialDevices = {};
  let deletedDevices = new Set();
  let deletionStartTime = {};
  const recreations = [];
  
  const listener = onValue(devicesRef, (snapshot) => {
    const currentData = snapshot.val() || {};
    const currentDeviceIds = Object.keys(currentData);
    
    // First time - record initial state
    if (Object.keys(initialDevices).length === 0) {
      initialDevices = { ...currentData };
      console.log(`📊 Initial state: ${currentDeviceIds.length} devices`);
      return;
    }
    
    const initialDeviceIds = Object.keys(initialDevices);
    
    // Check for deletions
    for (const deviceId of initialDeviceIds) {
      if (!currentDeviceIds.includes(deviceId) && !deletedDevices.has(deviceId)) {
        console.log(`🗑️ Device deleted: ${deviceId}`);
        deletedDevices.add(deviceId);
        deletionStartTime[deviceId] = Date.now();
      }
    }
    
    // Check for recreations
    for (const deviceId of currentDeviceIds) {
      if (deletedDevices.has(deviceId) && deletionStartTime[deviceId]) {
        const timeToRecreate = Date.now() - deletionStartTime[deviceId];
        const originalData = initialDevices[deviceId];
        const recreatedData = currentData[deviceId];
        
        console.log(`⚠️ DEVICE RECREATED: ${deviceId} after ${timeToRecreate}ms`);
        console.log('Original:', originalData);
        console.log('Recreated:', recreatedData);
        
        recreations.push({
          deviceId,
          originalData,
          recreatedData,
          timeToRecreate,
          timestamp: Date.now()
        });
        
        // Remove from tracking
        deletedDevices.delete(deviceId);
        delete deletionStartTime[deviceId];
      }
    }
  });
  
  // Stop monitoring after duration
  setTimeout(() => {
    off(devicesRef, 'value', listener);
    console.log(`✅ Recreation monitoring completed. ${recreations.length} recreations detected.`);
    
    if (recreations.length > 0) {
      console.log('⚠️ DEVICE RECREATION ISSUE CONFIRMED!');
      recreations.forEach(r => {
        console.log(`  - ${r.deviceId}: recreated after ${r.timeToRecreate}ms`);
      });
    } else {
      console.log('✅ No device recreation detected');
    }
  }, duration);
  
  return { stop: () => off(devicesRef, 'value', listener) };
}

/**
 * Test device deletion and monitor for recreation
 */
async function testDeviceDeletion(deviceId) {
  console.log(`🧪 Testing deletion of device: ${deviceId}`);
  
  try {
    // Get original device data
    const deviceRef = ref(db, `devices/${deviceId}`);
    const originalSnapshot = await get(deviceRef);
    
    if (!originalSnapshot.exists()) {
      console.log(`❌ Device ${deviceId} does not exist`);
      return false;
    }
    
    const originalData = originalSnapshot.val();
    console.log('Original device data:', originalData);
    
    // Start monitoring for recreation
    const monitoring = monitorDeviceRecreation(10000); // 10 seconds
    
    // Delete the device
    await remove(deviceRef);
    console.log(`🗑️ Deleted device: ${deviceId}`);
    
    // Wait for monitoring to complete
    await new Promise(resolve => setTimeout(resolve, 11000));
    
    return true;
    
  } catch (error) {
    console.error(`❌ Test deletion failed for ${deviceId}:`, error);
    return false;
  }
}

// Add to global scope
window.FirebaseDebug.monitorDeviceRecreation = monitorDeviceRecreation;
window.FirebaseDebug.testDeviceDeletion = testDeviceDeletion;

console.log('Additional functions:');
console.log('  FirebaseDebug.monitorDeviceRecreation() - Monitor for device recreation');
console.log('  FirebaseDebug.testDeviceDeletion(id) - Test deletion with recreation monitoring');

// Auto-run diagnostic if requested
if (window.location.search.includes('debug=true')) {
  console.log('🔍 Auto-running diagnostic...');
  runDiagnostic();
} 
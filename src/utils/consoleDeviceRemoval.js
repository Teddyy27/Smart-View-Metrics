// Console Device Removal Script
// Copy and paste this into your browser console to remove devices

// Import Firebase functions (if not already available)
const { getDatabase, ref, remove, get } = firebase.database;

// Get database reference
const db = getDatabase();

// Function to list all devices
async function listAllDevices() {
  try {
    const devicesRef = ref(db, 'devices');
    const snapshot = await get(devicesRef);
    
    if (!snapshot.exists()) {
      console.log('No devices found');
      return [];
    }
    
    const devices = Object.keys(snapshot.val()).map(id => ({
      id,
      ...snapshot.val()[id]
    }));
    
    console.log('📋 All devices in Firebase:');
    devices.forEach((device, index) => {
      console.log(`${index + 1}. ID: ${device.id} | Name: ${device.name} | Type: ${device.type} | Status: ${device.status}`);
    });
    
    return devices;
  } catch (error) {
    console.error('❌ Failed to list devices:', error);
    return [];
  }
}

// Function to remove a specific device
async function removeDevice(deviceId) {
  try {
    console.log(`🚨 Removing device: ${deviceId}`);
    
    // Check if device exists
    const deviceRef = ref(db, `devices/${deviceId}`);
    const snapshot = await get(deviceRef);
    
    if (!snapshot.exists()) {
      console.log(`❌ Device ${deviceId} does not exist`);
      return false;
    }
    
    const deviceData = snapshot.val();
    console.log(`Found device:`, deviceData);
    
    // Remove the device
    await remove(deviceRef);
    
    // Verify removal
    const verifySnapshot = await get(deviceRef);
    if (verifySnapshot.exists()) {
      console.log(`❌ Device ${deviceId} still exists after removal`);
      return false;
    }
    
    console.log(`✅ Device ${deviceId} successfully removed`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to remove device ${deviceId}:`, error);
    return false;
  }
}

// Function to remove multiple devices
async function removeMultipleDevices(deviceIds) {
  console.log(`🚨 Removing ${deviceIds.length} devices:`, deviceIds);
  
  const results = [];
  
  for (const deviceId of deviceIds) {
    const success = await removeDevice(deviceId);
    results.push({ deviceId, success });
  }
  
  console.log('📊 Removal results:', results);
  return results;
}

// Function to remove all devices
async function removeAllDevices() {
  console.log('🚨 NUCLEAR OPTION: Removing ALL devices');
  
  const devices = await listAllDevices();
  
  if (devices.length === 0) {
    console.log('No devices to remove');
    return;
  }
  
  const deviceIds = devices.map(d => d.id);
  const results = await removeMultipleDevices(deviceIds);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Successfully removed ${successCount}/${devices.length} devices`);
}

// Function to remove devices by name pattern
async function removeDevicesByName(namePattern) {
  console.log(`🔍 Searching for devices with name pattern: "${namePattern}"`);
  
  const devices = await listAllDevices();
  const matchingDevices = devices.filter(device => 
    device.name.toLowerCase().includes(namePattern.toLowerCase())
  );
  
  if (matchingDevices.length === 0) {
    console.log(`No devices found matching "${namePattern}"`);
    return;
  }
  
  console.log(`Found ${matchingDevices.length} matching devices:`, matchingDevices);
  
  const deviceIds = matchingDevices.map(d => d.id);
  const results = await removeMultipleDevices(deviceIds);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Successfully removed ${successCount}/${matchingDevices.length} matching devices`);
}

// Quick commands you can run:
console.log(`
🚀 Console Device Removal Commands Available:

1. listAllDevices() - List all devices
2. removeDevice('device_id') - Remove specific device
3. removeMultipleDevices(['id1', 'id2']) - Remove multiple devices
4. removeAllDevices() - Remove ALL devices (nuclear option)
5. removeDevicesByName('pattern') - Remove devices by name pattern

Examples:
- removeDevice('1753475599563')
- removeDevicesByName('Living Room')
- removeAllDevices()
`);

// Auto-run list to show current devices
listAllDevices(); 
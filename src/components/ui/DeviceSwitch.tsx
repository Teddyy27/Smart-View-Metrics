import React, { useEffect, useState, useCallback } from 'react';
import { Switch } from './switch';
import { db } from '@/services/firebase';
import { ref, onValue, set, off } from 'firebase/database';

// Custom hook for real-time device state
export function useDeviceState(path: string) {
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    if (!path) return;
    const deviceRef = ref(db, path);
    const listener = onValue(deviceRef, (snapshot) => {
      const value = snapshot.val();
      setIsOn(typeof value === 'boolean' ? value : value?.state ?? false);
    });
    return () => off(deviceRef, 'value', listener);
  }, [path]);

  return isOn;
}

interface DeviceSwitchProps {
  path: string; // Firebase path for the device toggle
  disabled?: boolean;
  className?: string;
}

export const DeviceSwitch: React.FC<DeviceSwitchProps> = ({ path, disabled, className }) => {
  const checked = useDeviceState(path);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) return;
    const toggleRef = ref(db, path);
    const listener = onValue(toggleRef, () => {
      setLoading(false);
    });
    return () => off(toggleRef, 'value', listener);
  }, [path]);

  const handleChange = useCallback(
    (value: boolean) => {
      if (!path) return;
      set(ref(db, path), value);
      // No need to update local state; will update via onValue
    },
    [path]
  );

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={disabled || loading}
      className={className}
    />
  );
}; 
import React, { useEffect, useState, useCallback } from 'react';
import { Switch } from './switch';
import { db } from '@/services/firebase';
import { ref, onValue, set, off } from 'firebase/database';

// Map device type to Firebase path for toggle
const getDeviceTogglePath = (deviceType: string) => {
  switch (deviceType) {
    case 'ac':
      return 'ac/toggle';
    case 'fan':
      return 'fan_state';
    case 'light':
      return 'lights/light_state';
    case 'refrigerator':
      return 'refrigerator/toggle';
    default:
      return null;
  }
};

interface DeviceSwitchProps {
  deviceType: 'ac' | 'fan' | 'light' | 'refrigerator';
  disabled?: boolean;
  className?: string;
}

export const DeviceSwitch: React.FC<DeviceSwitchProps> = ({ deviceType, disabled, className }) => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = getDeviceTogglePath(deviceType);
    if (!path) return;
    const toggleRef = ref(db, path);
    const listener = onValue(toggleRef, (snap) => {
      setChecked(!!snap.val());
      setLoading(false);
    });
    return () => {
      off(toggleRef);
    };
  }, [deviceType]);

  const handleChange = useCallback(
    (value: boolean) => {
      const path = getDeviceTogglePath(deviceType);
      if (!path) return;
      set(ref(db, path), value);
      // No need to update local state; will update via onValue
    },
    [deviceType]
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
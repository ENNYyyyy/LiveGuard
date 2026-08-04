import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD = 2.5; // G-force threshold
const SHAKE_COOLDOWN  = 3000; // ms between triggers

export default function useShake(onShake, enabled = true) {
  const lastShakeTime = useRef(0);
  const subscription  = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(200);
    subscription.current = Accelerometer.addListener(({ x, y, z }) => {
      const total = Math.sqrt(x * x + y * y + z * z);
      if (total > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime.current > SHAKE_COOLDOWN) {
          lastShakeTime.current = now;
          onShake?.();
        }
      }
    });

    return () => {
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [enabled, onShake]);
}

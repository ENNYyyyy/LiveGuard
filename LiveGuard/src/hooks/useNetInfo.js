import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Returns { isConnected: boolean }
 * Subscribes to real-time connectivity changes via NetInfo.
 */
const useNetInfo = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Fetch current state immediately
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    // Subscribe to future changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected };
};

export default useNetInfo;

import { useEffect, useState } from 'react';

/**
 * Hook to track network connectivity status
 * Returns true if device has internet connection, false otherwise
 */
export function useNetworkStatus() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // For now, we'll use a simple ping mechanism
        // In production, you'd use @react-native-community/netinfo
        // Install with: npm install @react-native-community/netinfo

        const checkConnection = async () => {
            try {
                const response = await fetch('https://www.google.com', {
                    method: 'HEAD',
                    mode: 'no-cors',
                });
                setIsOffline(false);
            } catch (error) {
                setIsOffline(true);
            }
        };

        // Check connection immediately
        checkConnection();

        // Check every 5 seconds
        const interval = setInterval(checkConnection, 5000);

        return () => clearInterval(interval);
    }, []);

    return { isOffline };
}

/**
 * Alternative implementation using NetInfo (recommended)
 * Uncomment and use this after installing @react-native-community/netinfo
 */
/*
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOffline };
}
*/

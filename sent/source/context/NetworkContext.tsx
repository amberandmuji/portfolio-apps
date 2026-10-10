import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext<boolean>(true);

export function useIsOnline() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while NetInfo is still determining
      // it — treat that as online rather than flashing an offline state.
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  return <NetworkContext.Provider value={isOnline}>{children}</NetworkContext.Provider>;
}

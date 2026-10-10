import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useIsOnline } from '../context/NetworkContext';
import { syncOfflineQueue } from '../lib/offlineSync';
import { queueLength } from '../lib/offlineQueue';
import { COLORS } from '../constants/theme';

/**
 * Mounted once near the root. Has no visual output of its own beyond an
 * optional status strip — its job is to drain the offline queue whenever
 * connectivity comes back, and again on a slow interval in case a sync
 * silently failed partway through.
 */
export function OfflineSyncManager() {
  const isOnline = useIsOnline();
  const queryClient = useQueryClient();
  const wasOnline = useRef(isOnline);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  async function refreshPendingCount() {
    setPending(await queueLength());
  }

  async function runSync() {
    setSyncing(true);
    const synced = await syncOfflineQueue();
    setSyncing(false);
    if (synced > 0) queryClient.invalidateQueries({ queryKey: ['sessions'] });
    await refreshPendingCount();
  }

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(() => {
      if (isOnline) runSync();
    }, 30_000);
    return () => clearInterval(interval);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && !wasOnline.current) {
      runSync();
    }
    wasOnline.current = isOnline;
  }, [isOnline]);

  if (isOnline && pending === 0) return null;

  return (
    <View style={[styles.banner, !isOnline ? styles.offline : styles.syncing]}>
      {!isOnline ? <WifiOff size={13} color="#FFFFFF" /> : <RefreshCw size={13} color="#FFFFFF" />}
      <Text style={styles.text}>
        {!isOnline
          ? pending > 0
            ? `Offline — ${pending} change${pending === 1 ? '' : 's'} will sync later`
            : 'Offline'
          : syncing
            ? 'Syncing...'
            : `${pending} change${pending === 1 ? '' : 's'} waiting to sync`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  offline: { backgroundColor: COLORS.sub },
  syncing: { backgroundColor: COLORS.accent },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
});

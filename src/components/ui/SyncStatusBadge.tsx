import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, spacing, radius } from '@/theme';
import { getSyncStatus, processSyncQueue, type SyncStatus } from '@/lib/services/sync.service';

interface SyncStatusBadgeProps {
  onSyncComplete?: () => void;
}

export function SyncStatusBadge({ onSyncComplete }: SyncStatusBadgeProps) {
  const [status, setStatus] = useState<SyncStatus>({
    isConfigured: true,
    pendingCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getSyncStatus().then((s) => {
      if (isMounted) setStatus(s);
    });

    const interval = setInterval(() => {
      getSyncStatus().then((s) => {
        if (isMounted) setStatus(s);
      });
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await processSyncQueue();
      const s = await getSyncStatus();
      setStatus(s);
      onSyncComplete?.();
    } finally {
      setSyncing(false);
    }
  };

  if (!status.isConfigured) {
    return (
      <View style={[styles.container, styles.demoContainer]}>
        <Icon name="shield" size={12} color={colors.textMuted} />
        <Text variant="caption" color="textMuted">
          Local Mode
        </Text>
      </View>
    );
  }

  const hasQueued = status.pendingCount > 0;

  return (
    <Pressable
      style={[
        styles.container,
        hasQueued ? styles.queuedContainer : styles.syncedContainer,
      ]}
      onPress={handleManualSync}
      disabled={syncing}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
      ) : hasQueued ? (
        <Icon name="refresh-cw" size={12} color={colors.warning} />
      ) : (
        <View style={styles.greenDot} />
      )}
      <Text
        variant="caption"
        weight="semibold"
        color={hasQueued ? 'warning' : 'textSecondary'}
        style={{ fontSize: 11 }}
      >
        {syncing
          ? 'Syncing...'
          : hasQueued
          ? `${status.pendingCount} Queued · Sync`
          : 'Cloud Synced'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  syncedContainer: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  queuedContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: colors.warning,
  },
  demoContainer: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
});

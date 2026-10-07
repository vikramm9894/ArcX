import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Divider } from './Divider';
import { Icon } from './Icon';
import { colors, spacing } from '@/theme';
import { exportArcBackup, restoreArcBackup, clearLocalArcData } from '@/lib/services/backup.service';

export interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onDataRestored?: () => void;
}

export function BackupModal({
  visible,
  onClose,
  userId,
  onDataRestored,
}: BackupModalProps) {
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'export' | 'import'>('export');

  const handleExport = async () => {
    try {
      setLoading(true);
      const json = await exportArcBackup(userId);
      Alert.alert(
        'Arc Database Backup Ready',
        json,
        [{ text: 'Acknowledged' }],
      );
    } catch {
      Alert.alert('Error', 'Could not export backup data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!importText.trim()) {
      Alert.alert('Required', 'Please paste a valid Arc backup JSON string.');
      return;
    }

    try {
      setLoading(true);
      await restoreArcBackup(userId, importText.trim());
      Alert.alert('Restored', 'Arc database successfully restored from backup.');
      setImportText('');
      if (onDataRestored) onDataRestored();
      onClose();
    } catch {
      Alert.alert('Restore Failed', 'Invalid backup JSON format or version mismatch.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Reset Arc Data',
      'This will erase your local habits, workouts, and reflection records. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearLocalArcData(userId);
            if (onDataRestored) onDataRestored();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card elevated style={styles.modalContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.titleRow}>
              <Icon name="settings" size={18} color={colors.primary} />
              <Text variant="subheading" weight="bold">
                Arc Data &amp; Cloud Telemetry
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text variant="body" color="textMuted">✕</Text>
            </Pressable>
          </View>

          {/* Tab mode selector */}
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeChip, mode === 'export' && styles.modeChipActive]}
              onPress={() => setMode('export')}
            >
              <Text variant="caption" weight="bold" color={mode === 'export' ? 'primary' : 'textMuted'}>
                EXPORT BACKUP
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeChip, mode === 'import' && styles.modeChipActive]}
              onPress={() => setMode('import')}
            >
              <Text variant="caption" weight="bold" color={mode === 'import' ? 'primary' : 'textMuted'}>
                RESTORE BACKUP
              </Text>
            </Pressable>
          </View>

          {mode === 'export' ? (
            <View style={styles.bodyBox}>
              <Text variant="caption" color="textMuted">
                Create a full JSON snapshot of all your logged workouts, habits, streaks, and journal entries.
              </Text>
              <Button
                title={loading ? 'Packaging...' : '📦 Generate Full JSON Backup'}
                variant="primary"
                loading={loading}
                onPress={handleExport}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <View style={styles.bodyBox}>
              <Text variant="caption" color="textMuted">
                Paste your previously exported Arc backup JSON to restore all records:
              </Text>
              <Input
                placeholder="Paste backup JSON here..."
                value={importText}
                onChangeText={setImportText}
                multiline
              />
              <Button
                title={loading ? 'Restoring...' : '📥 Restore from Backup'}
                variant="primary"
                loading={loading}
                onPress={handleRestore}
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}

          <Divider spacing={spacing.sm} />

          {/* Reset Action */}
          <Button
            title="⚠️ Reset Local Arc Storage"
            variant="ghost"
            onPress={handleClearData}
          />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 13, 0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    padding: spacing.xl,
    gap: spacing.md,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  bodyBox: {
    gap: spacing.xs,
  },
});

import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { Badge } from './Badge';
import { Divider } from './Divider';
import { Icon } from './Icon';
import { colors, spacing, radius } from '@/theme';
import {
  getReminderSettings,
  saveReminderSettings,
  requestNotificationPermissions,
  triggerTestReminder,
  type ArcReminderSettings,
  defaultReminderSettings,
} from '@/lib/services/notifications.service';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const [settings, setSettings] = useState<ArcReminderSettings>(defaultReminderSettings);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      getReminderSettings().then((loaded) => {
        if (isMounted) {
          setSettings(loaded);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleToggle = (key: keyof ArcReminderSettings, val: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    if (granted) {
      setFeedbackMsg('Permissions granted! Daily alerts active.');
    } else {
      setFeedbackMsg('Permissions disabled. Notifications cannot sound.');
    }
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await triggerTestReminder();
      setFeedbackMsg('🔔 Test notification dispatched!');
      if (Platform.OS === 'web') {
        Alert.alert('🔔 Winter Arc Alert', 'Discipline verified. Your alert engine is synchronized and locked in.');
      }
    } finally {
      setTimeout(() => {
        setTesting(false);
        setFeedbackMsg(null);
      }, 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveReminderSettings(settings);
      setFeedbackMsg('✅ Protocol schedule locked.');
      setTimeout(() => {
        setSaving(false);
        onClose();
      }, 700);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="bell" size={20} color={colors.primary} />
              <Text variant="heading" weight="heavy">
                Arc Alert Protocol
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text variant="title" color="textMuted">
                ✕
              </Text>
            </Pressable>
          </View>

          <Text variant="caption" color="textSecondary" style={styles.subtitle}>
            Winter Arc demands ruthless consistency. Automate daily reminders to safeguard your streak and enforce discipline.
          </Text>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Permission banner */}
            <Pressable style={styles.permBanner} onPress={handleRequestPermission}>
              <View style={styles.permTextRow}>
                <Icon name="shield" size={16} color={colors.accent} />
                <Text variant="caption" weight="bold" color="accent">
                  System Notification Status
                </Text>
              </View>
              <Badge label={permissionGranted ? 'AUTHORIZED' : 'VERIFY PERMISSIONS'} tone={permissionGranted ? 'success' : 'primary'} />
            </Pressable>

            {feedbackMsg && (
              <View style={styles.feedbackBanner}>
                <Text variant="caption" weight="bold" color="textPrimary" align="center">
                  {feedbackMsg}
                </Text>
              </View>
            )}

            {/* Reminders List */}
            <Card style={styles.cardItem}>
              <View style={styles.row}>
                <View style={styles.infoCol}>
                  <View style={styles.tagRow}>
                    <Text variant="bodySm" weight="bold">
                      🌅 Morning Discipline Call
                    </Text>
                    <Badge label={settings.morningTime} tone="primary" />
                  </View>
                  <Text variant="caption" color="textMuted">
                    Awaken and seize the day before dawn. Conquer your non-negotiables.
                  </Text>
                </View>
                <Switch
                  value={settings.morningEnabled}
                  onValueChange={(v) => handleToggle('morningEnabled', v)}
                  trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                  thumbColor={colors.textPrimary}
                />
              </View>
            </Card>

            <Card style={styles.cardItem}>
              <View style={styles.row}>
                <View style={styles.infoCol}>
                  <View style={styles.tagRow}>
                    <Text variant="bodySm" weight="bold">
                      ⚡ Midday Fortitude Check
                    </Text>
                    <Badge label={settings.middayTime} tone="neutral" />
                  </View>
                  <Text variant="caption" color="textMuted">
                    Hydration check, mental reset, and afternoon workout prompt.
                  </Text>
                </View>
                <Switch
                  value={settings.middayEnabled}
                  onValueChange={(v) => handleToggle('middayEnabled', v)}
                  trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                  thumbColor={colors.textPrimary}
                />
              </View>
            </Card>

            <Card style={styles.cardItem}>
              <View style={styles.row}>
                <View style={styles.infoCol}>
                  <View style={styles.tagRow}>
                    <Text variant="bodySm" weight="bold">
                      📜 Evening Stoic Reflection
                    </Text>
                    <Badge label={settings.eveningTime} tone="warning" />
                  </View>
                  <Text variant="caption" color="textMuted">
                    Log daily wins, review what tested discipline, and recite the Creed.
                  </Text>
                </View>
                <Switch
                  value={settings.eveningEnabled}
                  onValueChange={(v) => handleToggle('eveningEnabled', v)}
                  trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                  thumbColor={colors.textPrimary}
                />
              </View>
            </Card>

            <Card style={styles.cardItem}>
              <View style={styles.row}>
                <View style={styles.infoCol}>
                  <View style={styles.tagRow}>
                    <Text variant="bodySm" weight="bold">
                      🔥 Midnight Streak Shield Alert
                    </Text>
                    <Badge label={settings.streakShieldTime} tone="danger" />
                  </View>
                  <Text variant="caption" color="textMuted">
                    Urgent warning: Protect streak if any daily habits remain incomplete.
                  </Text>
                </View>
                <Switch
                  value={settings.streakShieldEnabled}
                  onValueChange={(v) => handleToggle('streakShieldEnabled', v)}
                  trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                  thumbColor={colors.textPrimary}
                />
              </View>
            </Card>

            <Divider spacing={spacing.md} />

            {/* Test Trigger */}
            <Button
              title={testing ? 'Dispatching...' : '🔔 Trigger Test Alert Now'}
              variant="secondary"
              onPress={handleTestNotification}
              disabled={testing}
            />
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <Button
              title={saving ? 'Locking Schedule...' : 'Save & Lock Protocol'}
              variant="primary"
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  scrollContent: {
    maxHeight: 460,
  },
  permBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  permTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  feedbackBanner: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  cardItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: spacing.md,
  },
});

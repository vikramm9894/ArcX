import { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Divider } from './Divider';
import { Icon } from './Icon';
import { colors, spacing } from '@/theme';
import { generateArcExportReport } from '@/lib/services/quotes.service';

export interface ShareContractModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  currentStreak: number;
  totalDays: number;
  goal: string;
  workoutsCount: number;
  reflectionsCount: number;
  unlockedBadgesCount: number;
}

export function ShareContractModal({
  visible,
  onClose,
  userName,
  currentStreak,
  totalDays,
  goal,
  workoutsCount,
  reflectionsCount,
  unlockedBadgesCount,
}: ShareContractModalProps) {
  const [copied, setCopied] = useState(false);

  const reportText = generateArcExportReport({
    userName,
    currentStreak,
    totalDays,
    goal,
    workoutsCount,
    reflectionsCount,
    unlockedBadgesCount,
  });

  const handleCopy = () => {
    setCopied(true);
    Alert.alert(
      'Arc Protocol Report Generated',
      reportText,
      [{ text: 'Acknowledged', onPress: () => setCopied(false) }],
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
          {/* Header */}
          <View style={styles.topBar}>
            <View style={styles.titleRow}>
              <Icon name="shield" size={18} color={colors.primary} />
              <Text variant="subheading" weight="bold">
                Winter Arc Passport
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text variant="body" color="textMuted">✕</Text>
            </Pressable>
          </View>

          {/* Visual Arc Passport Card */}
          <Card style={styles.passportCard}>
            <View style={styles.passportHeader}>
              <View>
                <Text variant="caption" color="primary" weight="heavy">
                  CLASSIFIED TELEMETRY
                </Text>
                <Text variant="heading" weight="heavy">
                  {userName.toUpperCase()}
                </Text>
              </View>
              <Badge label={`STREAK ${currentStreak}🔥`} tone="primary" />
            </View>

            <Divider spacing={spacing.sm} />

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text variant="title" weight="heavy" color="primary">
                  {currentStreak}
                </Text>
                <Text variant="caption" color="textMuted">DAYS IN</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text variant="title" weight="heavy" color="fitness">
                  {workoutsCount}
                </Text>
                <Text variant="caption" color="textMuted">WORKOUTS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text variant="title" weight="heavy" color="mindfulness">
                  {reflectionsCount}
                </Text>
                <Text variant="caption" color="textMuted">DEBRIEFS</Text>
              </View>
            </View>

            <Divider spacing={spacing.sm} />

            <View style={styles.goalRow}>
              <Text variant="caption" color="textMuted">TARGET MISSION:</Text>
              <Text variant="bodySm" weight="semibold">
                {goal}
              </Text>
            </View>

            <View style={styles.creedBox}>
              <Text variant="caption" color="textSecondary" style={styles.creedText}>
                &quot;When the cold arrives and the weak hibernate, we build in the dark.&quot;
              </Text>
            </View>
          </Card>

          {/* Action Buttons */}
          <Button
            title={copied ? 'Report Generated ✓' : '📄 Export & Read Arc Report'}
            variant="primary"
            onPress={handleCopy}
          />
          <Button
            title="Dismiss"
            variant="ghost"
            onPress={onClose}
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
  passportCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primary,
    borderWidth: 1,
    gap: spacing.sm,
  },
  passportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderSubtle,
  },
  goalRow: {
    gap: 2,
  },
  creedBox: {
    paddingTop: spacing.xs,
  },
  creedText: {
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

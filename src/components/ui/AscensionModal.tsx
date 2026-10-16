import { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Card } from './Card';
import { Badge } from './Badge';
import { Divider } from './Divider';
import { Icon } from './Icon';
import { colors, spacing, radius } from '@/theme';
import {
  evaluateArcAscension,
  type AscensionEvaluationInput,
  type AscensionCertificate,
} from '@/lib/services/ascension.service';

interface AscensionModalProps {
  visible: boolean;
  onClose: () => void;
  evaluationInput: AscensionEvaluationInput;
}

export function AscensionModal({ visible, onClose, evaluationInput }: AscensionModalProps) {
  const [copied, setCopied] = useState(false);
  const cert: AscensionCertificate = evaluateArcAscension(evaluationInput);

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(cert.shareableSummary);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
          return;
        }
      }
      await Share.share({
        title: 'Winter Arc 90-Day Ascension Certificate',
        message: cert.shareableSummary,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Ignore dismiss
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="award" size={22} color={cert.tierColor} />
              <Text variant="heading" weight="heavy">
                Arc Ascension
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text variant="title" color="textMuted">
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Certificate Diploma Border */}
            <View style={[styles.certificateFrame, { borderColor: cert.tierColor }]}>
              {/* Corner Accents */}
              <View style={[styles.cornerTL, { borderColor: cert.tierColor }]} />
              <View style={[styles.cornerTR, { borderColor: cert.tierColor }]} />
              <View style={[styles.cornerBL, { borderColor: cert.tierColor }]} />
              <View style={[styles.cornerBR, { borderColor: cert.tierColor }]} />

              <View style={styles.certHeader}>
                <Text variant="caption" weight="heavy" color="textMuted" align="center" style={styles.subHeading}>
                  OFFICIAL DISCIPLINE SEAL OF WINTER ARC
                </Text>
                <Text variant="title" weight="heavy" align="center" style={styles.certTitle}>
                  ASCENSION DIPLOMA
                </Text>
                <Badge
                  label={cert.certificateId}
                  tone="neutral"
                  style={{ alignSelf: 'center', marginTop: spacing.xs }}
                />
              </View>

              <Divider spacing={spacing.md} />

              <View style={styles.honoreeSection}>
                <Text variant="caption" color="textMuted" align="center">
                  THIS CERTIFIES THAT
                </Text>
                <Text variant="display" weight="heavy" align="center" color="textPrimary" style={styles.warriorName}>
                  {cert.userName}
                </Text>
                <Text variant="caption" color="textSecondary" align="center">
                  has endured the unrelenting crucible of the 90-Day Winter Arc, conquering physical weakness and forging an unbreakable mind.
                </Text>
              </View>

              {/* Tier Banner */}
              <View style={[styles.tierBanner, { backgroundColor: 'rgba(251, 191, 36, 0.08)', borderColor: cert.tierColor }]}>
                <Text variant="caption" weight="heavy" style={{ color: cert.tierColor }}>
                  DISCIPLINE RANK ACHIEVED
                </Text>
                <Text variant="title" weight="heavy" style={{ color: cert.tierColor, fontSize: 20 }}>
                  👑 {cert.tier}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Master Score: {cert.disciplineScore} / 100 · Streak: {cert.daysCompleted} Days
                </Text>
              </View>

              {/* Metrics Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text variant="heading" weight="heavy" color="fitness">
                    {cert.totalWorkouts}
                  </Text>
                  <Text variant="caption" color="textMuted" align="center">
                    Workouts
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text variant="heading" weight="heavy" color="discipline">
                    {cert.totalHabitsLogged}
                  </Text>
                  <Text variant="caption" color="textMuted" align="center">
                    Habits Done
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text variant="heading" weight="heavy" color="mindfulness">
                    {cert.totalReflections}
                  </Text>
                  <Text variant="caption" color="textMuted" align="center">
                    Reflections
                  </Text>
                </View>
              </View>

              {/* Creed */}
              <Card style={styles.creedBox}>
                <Text variant="caption" weight="bold" color="primary" align="center">
                  THE WINTER PROMISE FULFILLED
                </Text>
                <Text variant="caption" color="textSecondary" align="center" style={styles.creedText}>
                  &quot;{cert.creedQuote}&quot;
                </Text>
                <Text variant="caption" color="textMuted" align="center" style={{ fontSize: 10, marginTop: 4 }}>
                  Verified on {cert.completedAt}
                </Text>
              </Card>
            </View>

            {/* Sharing Button */}
            <View style={styles.actions}>
              <Button
                title={copied ? '✅ Certificate Copied to Clipboard!' : '📜 Export & Share Ascension Certificate'}
                variant="primary"
                onPress={handleShare}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 13, 0.90)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  certificateFrame: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    position: 'relative',
    marginBottom: spacing.lg,
  },
  cornerTL: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  certHeader: {
    alignItems: 'center',
  },
  subHeading: {
    letterSpacing: 1.5,
    fontSize: 9,
  },
  certTitle: {
    letterSpacing: 2,
    marginTop: 4,
  },
  honoreeSection: {
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.xs,
  },
  warriorName: {
    fontSize: 24,
    letterSpacing: 0.5,
  },
  tierBanner: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: spacing.md,
    gap: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  creedBox: {
    padding: spacing.md,
    gap: 4,
    backgroundColor: colors.surfaceElevated,
  },
  creedText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

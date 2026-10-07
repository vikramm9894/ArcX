import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, Pressable, Vibration } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Divider } from './Divider';
import { Icon } from './Icon';
import { colors, radius, spacing } from '@/theme';

export type TimerMode = 'cold' | 'rest' | 'focus';

export interface ProtocolTimerModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: TimerMode;
  onTimerComplete?: (mode: TimerMode) => void;
}

const PRESETS: Record<TimerMode, { label: string; times: number[] }> = {
  cold: {
    label: 'Cold Exposure',
    times: [120, 180, 300], // 2m, 3m, 5m
  },
  rest: {
    label: 'Workout Rest',
    times: [30, 60, 90, 120], // 30s, 1m, 1.5m, 2m
  },
  focus: {
    label: 'Deep Focus',
    times: [900, 1500, 2700], // 15m, 25m, 45m
  },
};

function ProtocolTimerModalContent({
  visible,
  onClose,
  initialMode = 'cold',
  onTimerComplete,
}: ProtocolTimerModalProps) {
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const defaultSeconds = PRESETS[initialMode]?.times[0] ?? 120;
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            try {
              Vibration.vibrate([0, 500, 200, 500]);
            } catch {
              // Vibration fallback
            }
            if (onTimerComplete) {
              onTimerComplete(mode);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, onTimerComplete]);

  const handleSelectPreset = (seconds: number) => {
    setIsRunning(false);
    setIsFinished(false);
    setTotalSeconds(seconds);
    setTimeLeft(seconds);
  };

  const handleSelectMode = (newMode: TimerMode) => {
    setMode(newMode);
    const defaultSec = PRESETS[newMode].times[0];
    setTotalSeconds(defaultSec);
    setTimeLeft(defaultSec);
    setIsRunning(false);
    setIsFinished(false);
  };

  const handleTogglePlay = () => {
    if (isFinished) {
      setTimeLeft(totalSeconds);
      setIsFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(totalSeconds);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    totalSeconds > 0 ? Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100) : 0;

  // Real-time breathing/stoic cue based on elapsed time for cold exposure
  const getCue = () => {
    if (isFinished) return 'PROTOCOL CONQUERED. STEEL FORGED.';
    if (mode === 'cold') {
      const elapsed = totalSeconds - timeLeft;
      if (elapsed < 30) return 'SHOCK PHASE: Inhale deep through the nose. Steady.';
      if (timeLeft < 30) return 'FINAL SURGE: Embrace the ice. You are unbroken.';
      return 'ADAPTATION: Drop the shoulders. Mind controls the body.';
    }
    if (mode === 'rest') {
      if (timeLeft <= 10) return 'PREPARE FOR SET: Chalk up and focus your energy.';
      return 'RECOVERY: Deep diaphragmatic breathing. Lower heart rate.';
    }
    return 'DEEP FOCUS: Eliminate external noise. Flow state active.';
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
              <Icon name="clock" size={18} color={colors.primary} />
              <Text variant="subheading" weight="bold">
                Arc Protocol Timer
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text variant="body" color="textMuted">✕</Text>
            </Pressable>
          </View>

          {/* Mode Selector */}
          <View style={styles.modeRow}>
            {(['cold', 'rest', 'focus'] as TimerMode[]).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  style={[
                    styles.modeChip,
                    active && styles.modeChipActive,
                  ]}
                  onPress={() => handleSelectMode(m)}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={active ? 'primary' : 'textMuted'}
                  >
                    {PRESETS[m].label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Presets Row */}
          <View style={styles.presetsRow}>
            {PRESETS[mode].times.map((sec) => {
              const selected = totalSeconds === sec;
              const mins = sec >= 60 ? `${sec / 60}m` : `${sec}s`;
              return (
                <Pressable
                  key={sec}
                  style={[
                    styles.presetChip,
                    selected && styles.presetChipSelected,
                  ]}
                  onPress={() => handleSelectPreset(sec)}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={selected ? 'textInverse' : 'textSecondary'}
                  >
                    {mins}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Timer Display Hero */}
          <View style={styles.timerHero}>
            <View style={[styles.progressRing, isFinished && styles.progressRingFinished]}>
              <Text variant="display" weight="heavy" color={isFinished ? 'success' : 'primary'} style={styles.timeDigits}>
                {formatTime(timeLeft)}
              </Text>
              <Badge
                label={isFinished ? 'VICTORY' : isRunning ? 'ACTIVE PROTOCOL' : 'PAUSED'}
                tone={isFinished ? 'success' : isRunning ? 'primary' : 'neutral'}
              />
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                  isFinished && { backgroundColor: colors.success },
                ]}
              />
            </View>

            {/* Motivational Breathing Cue */}
            <Card style={styles.cueCard}>
              <Text variant="caption" weight="bold" color="textSecondary" align="center">
                {getCue()}
              </Text>
            </Card>
          </View>

          <Divider spacing={spacing.xs} />

          {/* Action Buttons */}
          <View style={styles.controlsRow}>
            <Button
              title="Reset"
              variant="secondary"
              onPress={handleReset}
              style={{ flex: 1 }}
            />
            <Button
              title={isFinished ? 'Repeat' : isRunning ? 'Pause' : 'Engage'}
              variant="primary"
              onPress={handleTogglePlay}
              style={{ flex: 2 }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

export function ProtocolTimerModal(props: ProtocolTimerModalProps) {
  if (!props.visible) return null;
  return <ProtocolTimerModalContent key={props.initialMode} {...props} />;
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
    borderColor: colors.primary,
    borderWidth: 1.5,
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
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timerHero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressRing: {
    width: 170,
    height: 170,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  progressRingFinished: {
    borderColor: colors.success,
  },
  timeDigits: {
    letterSpacing: -1,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  cueCard: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

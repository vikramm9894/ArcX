import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text, Card, Badge, Button } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import {
  fetchBattleById,
  initiateAttack,
  type FullBattleRecord,
  type BattleEvent,
} from '@/lib/services/battle.service';
import { useAuth } from '@/providers';
import type { CharacterKey } from '@/lib/services/player.service';

export default function BattleReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [battle, setBattle] = useState<FullBattleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [attackerHp, setAttackerHp] = useState(100);
  const [defenderHp, setDefenderHp] = useState(100);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [isFinished, setIsFinished] = useState(false);
  const [activeHitter, setActiveHitter] = useState<'attacker' | 'defender' | null>(null);
  const [floatingDamage, setFloatingDamage] = useState<{
    target: 'attacker' | 'defender';
    damage: number;
    isCrit: boolean;
  } | null>(null);
  const [rematching, setRematching] = useState(false);

  // Animation values (using useState to satisfy React 19 render-ref rules)
  const [attackerShakeAnim] = useState(() => new Animated.Value(0));
  const [defenderShakeAnim] = useState(() => new Animated.Value(0));
  const [damageFloatAnim] = useState(() => new Animated.Value(0));
  const [victoryScaleAnim] = useState(() => new Animated.Value(0.8));
  const [victoryOpacityAnim] = useState(() => new Animated.Value(0));

  // Load battle record
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      try {
        const record = await fetchBattleById(id);
        if (mounted && record) {
          setBattle(record);
          setAttackerHp(record.attackerStats.hp);
          setDefenderHp(record.defenderStats.hp);
        }
      } catch (err) {
        console.warn('[BattleReplay] Failed to load battle:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Shake animation helper
  const triggerHitShake = useCallback((target: 'attacker' | 'defender') => {
    const anim = target === 'attacker' ? attackerShakeAnim : defenderShakeAnim;
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [attackerShakeAnim, defenderShakeAnim]);

  // Floating damage animation helper
  const triggerFloatingDamage = useCallback((target: 'attacker' | 'defender', damage: number, isCrit: boolean) => {
    setFloatingDamage({ target, damage, isCrit });
    damageFloatAnim.setValue(0);
    Animated.timing(damageFloatAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setFloatingDamage(null);
    });
  }, [damageFloatAnim]);

  // Play step
  const executeStep = useCallback((event: BattleEvent) => {
    setActiveHitter(event.hitter);
    const target = event.hitter === 'attacker' ? 'defender' : 'attacker';

    triggerHitShake(target);
    triggerFloatingDamage(target, event.damage, event.is_crit);

    setAttackerHp(event.attacker_hp);
    setDefenderHp(event.defender_hp);
  }, [triggerHitShake, triggerFloatingDamage]);

  // Step-by-step playback ticker
  useEffect(() => {
    if (!battle || !isPlaying || isFinished || loading) return;

    const delay = speedMultiplier === 1 ? 1100 : 550;
    const timer = setTimeout(() => {
      if (currentEventIndex < battle.events.length) {
        const event = battle.events[currentEventIndex];
        executeStep(event);
        setCurrentEventIndex((prev) => prev + 1);
      } else {
        // Battle replay finished
        setIsFinished(true);
        setIsPlaying(false);
        setActiveHitter(null);
        // Show victory modal animation
        Animated.parallel([
          Animated.spring(victoryScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
          Animated.timing(victoryOpacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    battle,
    isPlaying,
    isFinished,
    loading,
    currentEventIndex,
    speedMultiplier,
    executeStep,
    victoryScaleAnim,
    victoryOpacityAnim,
  ]);

  // Skip directly to the end
  const handleSkipToEnd = () => {
    if (!battle) return;
    const finalEvent = battle.events[battle.events.length - 1];
    if (finalEvent) {
      setAttackerHp(finalEvent.attacker_hp);
      setDefenderHp(finalEvent.defender_hp);
    }
    setCurrentEventIndex(battle.events.length);
    setIsFinished(true);
    setIsPlaying(false);
    setActiveHitter(null);

    Animated.parallel([
      Animated.spring(victoryScaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(victoryOpacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // Replay from start
  const handleRestart = () => {
    if (!battle) return;
    setAttackerHp(battle.attackerStats.hp);
    setDefenderHp(battle.defenderStats.hp);
    setCurrentEventIndex(0);
    setIsFinished(false);
    setIsPlaying(true);
    setActiveHitter(null);
  };

  // Rematch action
  const handleRematch = async () => {
    if (!battle) return;
    const opponentId = user?.id === battle.attackerId ? battle.defenderId : battle.attackerId;
    setRematching(true);
    try {
      const res = await initiateAttack(opponentId);
      router.replace({
        pathname: '/battle/[id]',
        params: { id: res.battleId },
      });
    } catch (err: any) {
      Alert.alert('Rematch Notice', err?.message || 'Could not initiate rematch.');
      setRematching(false);
    }
  };

  const getCharEmoji = (char: CharacterKey | string) => {
    if (char === 'titan') return '🏋️';
    if (char === 'sentinel') return '🛡️';
    if (char === 'monk') return '🧘';
    return '⚔️';
  };

  const getCharColor = (char: CharacterKey | string) => {
    if (char === 'titan') return colors.fitness;
    if (char === 'sentinel') return colors.primary;
    if (char === 'monk') return colors.mindfulness;
    return colors.accent;
  };

  if (loading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="caption" muted style={{ marginTop: spacing.md }}>
          Simulating Seeded Combat...
        </Text>
      </Screen>
    );
  }

  if (!battle) {
    return (
      <Screen scroll={false} padded style={styles.center}>
        <Text style={{ fontSize: 40 }}>❓</Text>
        <Text variant="title" style={{ marginTop: spacing.sm }}>
          Battle Not Found
        </Text>
        <Text variant="caption" muted style={{ marginTop: spacing.xs, textAlign: 'center' }}>
          This battle replay does not exist or has expired.
        </Text>
        <Button
          title="Return to Arena"
          variant="primary"
          size="md"
          onPress={() => router.replace('/(tabs)/arena')}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  const isUserWinner = battle.winnerId === user?.id;
  const isAttackerWinner = battle.winnerId === battle.attackerId;
  const currentEvent = currentEventIndex > 0 ? battle.events[currentEventIndex - 1] : null;

  // HP percentage calculation
  const attackerMaxHp = battle.attackerStats.hp;
  const defenderMaxHp = battle.defenderStats.hp;
  const attackerHpPct = Math.max(0, Math.min(100, (attackerHp / attackerMaxHp) * 100));
  const defenderHpPct = Math.max(0, Math.min(100, (defenderHp / defenderMaxHp) * 100));

  const attackerHpColor =
    attackerHpPct > 50 ? colors.success : attackerHpPct > 25 ? colors.warning : colors.danger;
  const defenderHpColor =
    defenderHpPct > 50 ? colors.success : defenderHpPct > 25 ? colors.warning : colors.danger;

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      {/* Top Navigation */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.replace('/(tabs)/arena')} hitSlop={12}>
          <Text style={styles.backButton}>✕ Close</Text>
        </Pressable>
        <View style={styles.seedBadge}>
          <Text variant="caption" muted>
            SEED #{battle.seed}
          </Text>
        </View>
        <Pressable onPress={handleSkipToEnd} hitSlop={12} disabled={isFinished}>
          <Text
            style={[
              styles.skipButton,
              isFinished && { color: colors.textMuted },
            ]}
          >
            Skip ⏩
          </Text>
        </Pressable>
      </View>

      <View style={styles.mainContainer}>
        {/* Fighter 1 (Attacker) Card */}
        <Animated.View
          style={[
            styles.fighterCard,
            activeHitter === 'attacker' && styles.hitterActiveGlow,
            { transform: [{ translateX: attackerShakeAnim }] },
          ]}
        >
          <View style={styles.fighterHeader}>
            <View style={styles.fighterIdentity}>
              <View
                style={[
                  styles.avatarCircle,
                  { borderColor: getCharColor(battle.attackerStats.character_key) },
                ]}
              >
                <Text style={{ fontSize: 24 }}>
                  {getCharEmoji(battle.attackerStats.character_key)}
                </Text>
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text variant="subheading" style={styles.fighterName}>
                    {battle.attackerStats.name}
                  </Text>
                  <Badge label="ATTACKER" tone="primary" />
                </View>
                <Text variant="caption" muted>
                  Lv. {battle.attackerStats.level} · ATK {battle.attackerStats.atk} · DEF {battle.attackerStats.def}
                </Text>
              </View>
            </View>

            <Text variant="bodySm" style={styles.hpLabel}>
              {attackerHp} / {attackerMaxHp} HP
            </Text>
          </View>

          {/* Attacker HP Bar */}
          <View style={styles.hpBarTrack}>
            <View
              style={[
                styles.hpBarFill,
                { width: `${attackerHpPct}%`, backgroundColor: attackerHpColor },
              ]}
            />
          </View>

          {/* Floating Damage Indicator */}
          {floatingDamage?.target === 'attacker' && (
            <Animated.View
              style={[
                styles.floatingDamageWrapper,
                {
                  opacity: damageFloatAnim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: damageFloatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -32],
                      }),
                    },
                    {
                      scale: damageFloatAnim.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.6, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.damageAmount}>-{floatingDamage.damage}</Text>
              {floatingDamage.isCrit && <Text style={styles.critNotice}>CRIT! 🔥</Text>}
            </Animated.View>
          )}
        </Animated.View>

        {/* Center Clash Area */}
        <View style={styles.clashArea}>
          <View style={styles.roundPill}>
            <Text variant="caption" style={styles.roundText}>
              ROUND {currentEvent ? currentEvent.round : 1} OF 6
            </Text>
          </View>

          {/* Dynamic Combat Ticker */}
          <View style={styles.tickerCard}>
            {currentEvent ? (
              <View style={styles.tickerContent}>
                <Text style={styles.tickerIcon}>
                  {currentEvent.hitter === 'attacker' ? '⚔️' : '🛡️'}
                </Text>
                <Text variant="bodySm" style={styles.tickerMessage}>
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                    {currentEvent.hitter === 'attacker'
                      ? battle.attackerStats.name
                      : battle.defenderStats.name}
                  </Text>{' '}
                  hits for{' '}
                  <Text style={{ fontWeight: '800', color: currentEvent.is_crit ? colors.warning : colors.accent }}>
                    {currentEvent.damage} DMG
                  </Text>
                  {currentEvent.is_crit ? ' (CRITICAL! 🔥)' : '!'}
                </Text>
              </View>
            ) : (
              <Text variant="caption" muted style={{ textAlign: 'center' }}>
                Combat initiation in progress...
              </Text>
            )}
          </View>
        </View>

        {/* Fighter 2 (Defender) Card */}
        <Animated.View
          style={[
            styles.fighterCard,
            activeHitter === 'defender' && styles.hitterActiveGlow,
            { transform: [{ translateX: defenderShakeAnim }] },
          ]}
        >
          <View style={styles.fighterHeader}>
            <View style={styles.fighterIdentity}>
              <View
                style={[
                  styles.avatarCircle,
                  { borderColor: getCharColor(battle.defenderStats.character_key) },
                ]}
              >
                <Text style={{ fontSize: 24 }}>
                  {getCharEmoji(battle.defenderStats.character_key)}
                </Text>
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text variant="subheading" style={styles.fighterName}>
                    {battle.defenderStats.name}
                  </Text>
                  <Badge label="DEFENDER" tone="neutral" />
                </View>
                <Text variant="caption" muted>
                  Lv. {battle.defenderStats.level} · ATK {battle.defenderStats.atk} · DEF {battle.defenderStats.def}
                </Text>
              </View>
            </View>

            <Text variant="bodySm" style={styles.hpLabel}>
              {defenderHp} / {defenderMaxHp} HP
            </Text>
          </View>

          {/* Defender HP Bar */}
          <View style={styles.hpBarTrack}>
            <View
              style={[
                styles.hpBarFill,
                { width: `${defenderHpPct}%`, backgroundColor: defenderHpColor },
              ]}
            />
          </View>

          {/* Floating Damage Indicator */}
          {floatingDamage?.target === 'defender' && (
            <Animated.View
              style={[
                styles.floatingDamageWrapper,
                {
                  opacity: damageFloatAnim.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: damageFloatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -32],
                      }),
                    },
                    {
                      scale: damageFloatAnim.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.6, 1.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.damageAmount}>-{floatingDamage.damage}</Text>
              {floatingDamage.isCrit && <Text style={styles.critNotice}>CRIT! 🔥</Text>}
            </Animated.View>
          )}
        </Animated.View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            style={styles.controlButton}
            onPress={() => setIsPlaying((prev) => !prev)}
            disabled={isFinished}
          >
            <Text variant="caption" style={styles.controlText}>
              {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.controlButton}
            onPress={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))}
          >
            <Text variant="caption" style={styles.controlText}>
              ⚡ {speedMultiplier}X SPEED
            </Text>
          </Pressable>

          <Pressable style={styles.controlButton} onPress={handleRestart}>
            <Text variant="caption" style={styles.controlText}>
              🔄 RESTART
            </Text>
          </Pressable>
        </View>

        {/* Victory / Defeat Modal Overlay */}
        {isFinished && (
          <Animated.View
            style={[
              styles.victoryModal,
              {
                opacity: victoryOpacityAnim,
                transform: [{ scale: victoryScaleAnim }],
              },
            ]}
          >
            <Card
              style={[
                styles.victoryCard,
                isAttackerWinner ? styles.victoryGlow : styles.defeatGlow,
              ]}
            >
              <Text style={styles.victoryEmoji}>{isAttackerWinner ? '🏆' : '💀'}</Text>
              <Text
                style={[
                  styles.victoryTitle,
                  { color: isAttackerWinner ? colors.accent : colors.danger },
                ]}
              >
                {isAttackerWinner ? 'VICTORY!' : 'DEFEAT'}
              </Text>

              <Text variant="bodySm" color="textSecondary" style={styles.victoryWinnerName}>
                Winner:{' '}
                <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
                  {isAttackerWinner ? battle.attackerStats.name : battle.defenderStats.name}
                </Text>
              </Text>

              {/* Trophy Delta Badge */}
              <View style={styles.deltaBox}>
                <Text
                  variant="subheading"
                  style={{
                    fontWeight: '900',
                    color: isUserWinner ? colors.success : colors.danger,
                  }}
                >
                  {isUserWinner
                    ? `+${battle.attackerDelta} TROPHIES 🏆`
                    : `${battle.attackerDelta} TROPHIES 🏆`}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionButtons}>
                <Button
                  title={rematching ? 'Rematching...' : 'REMATCH ⚔️'}
                  variant="primary"
                  size="md"
                  disabled={rematching}
                  onPress={handleRematch}
                  style={{ flex: 1 }}
                />
                <Button
                  title="RETURN TO ARENA"
                  variant="secondary"
                  size="md"
                  onPress={() => router.replace('/(tabs)/arena')}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.backgroundElevated,
  },
  backButton: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  seedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  skipButton: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  mainContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  fighterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    position: 'relative',
  },
  hitterActiveGlow: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  fighterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fighterIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fighterName: {
    fontWeight: '800',
  },
  hpLabel: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  hpBarTrack: {
    width: '100%',
    height: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  hpBarFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  floatingDamageWrapper: {
    position: 'absolute',
    top: 10,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  damageAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.danger,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  critNotice: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.warning,
    letterSpacing: 1,
  },
  clashArea: {
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  roundPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  roundText: {
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.accent,
  },
  tickerCard: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 54,
    justifyContent: 'center',
  },
  tickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tickerIcon: {
    fontSize: 18,
  },
  tickerMessage: {
    color: colors.textSecondary,
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  controlButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  controlText: {
    fontWeight: '700',
    fontSize: 11,
    color: colors.textPrimary,
  },
  victoryModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 10, 15, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    zIndex: 99,
  },
  victoryCard: {
    width: '100%',
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    gap: spacing.md,
  },
  victoryGlow: {
    borderColor: colors.accent,
  },
  defeatGlow: {
    borderColor: colors.danger,
  },
  victoryEmoji: {
    fontSize: 54,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  victoryWinnerName: {
    textAlign: 'center',
  },
  deltaBox: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
});

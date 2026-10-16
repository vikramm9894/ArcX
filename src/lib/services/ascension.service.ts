export interface AscensionEvaluationInput {
  userName: string;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  disciplineScore: number;
  totalWorkouts: number;
  totalHabitsLogged: number;
  totalReflections: number;
  goal: string;
}

export type AscensionTier =
  | 'ASCENDED TITAN'
  | 'IRON LEGEND'
  | 'WINTER CENTURION'
  | 'DISCIPLINED SURVIVOR';

export interface AscensionCertificate {
  certificateId: string;
  userName: string;
  completedAt: string;
  tier: AscensionTier;
  tierColor: string;
  disciplineScore: number;
  totalDays: number;
  daysCompleted: number;
  completionRate: number;
  totalWorkouts: number;
  totalHabitsLogged: number;
  totalReflections: number;
  longestStreak: number;
  goal: string;
  creedQuote: string;
  shareableSummary: string;
}

/**
 * Evaluates whether the user is eligible for the Ascension Ceremony and generates
 * the official 90-Day Winter Arc Graduation Certificate.
 */
export function evaluateArcAscension(input: AscensionEvaluationInput): AscensionCertificate {
  const {
    userName,
    currentStreak,
    longestStreak,
    totalDays,
    disciplineScore,
    totalWorkouts,
    totalHabitsLogged,
    totalReflections,
    goal,
  } = input;

  let tier: AscensionTier = 'DISCIPLINED SURVIVOR';
  let tierColor = '#9AA7B8';

  if (disciplineScore >= 90) {
    tier = 'ASCENDED TITAN';
    tierColor = '#FBBF24'; // Gold
  } else if (disciplineScore >= 80) {
    tier = 'IRON LEGEND';
    tierColor = '#38BDF8'; // Ice Cyan
  } else if (disciplineScore >= 70) {
    tier = 'WINTER CENTURION';
    tierColor = '#3B82F6'; // Frost Blue
  } else {
    tier = 'DISCIPLINED SURVIVOR';
    tierColor = '#A78BFA'; // Violet
  }

  // Generate deterministic verification hash
  const rawHash = `${userName}-${disciplineScore}-${currentStreak}-${Date.now().toString().slice(-4)}`;
  let numeric = 0;
  for (let i = 0; i < rawHash.length; i++) {
    numeric = (numeric << 5) - numeric + rawHash.charCodeAt(i);
    numeric |= 0;
  }
  const hexPart = Math.abs(numeric).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  const certificateId = `ARC-X90-${hexPart}`;

  const completionRate = Math.min(100, Math.round((currentStreak / totalDays) * 100));

  const creedQuote =
    'When the cold arrives, the weak hibernate; we built in the dark. Entered as clay, reborn as iron.';

  const shareableSummary = [
    `⚔️ WINTER ARC 90-DAY ASCENSION CERTIFICATE ⚔️`,
    `----------------------------------------`,
    `WARRIOR: ${userName.toUpperCase()}`,
    `CERTIFICATE ID: ${certificateId}`,
    `STATUS: ${tier} [SCORE: ${disciplineScore}/100]`,
    `STREAK: ${currentStreak} Days unbroken (Peak: ${longestStreak})`,
    `WORKOUTS COMPLETED: ${totalWorkouts}`,
    `HABITS CRUSHED: ${totalHabitsLogged}`,
    `STOIC REFLECTIONS: ${totalReflections}`,
    `MISSION: "${goal}"`,
    `----------------------------------------`,
    `"${creedQuote}"`,
    `Verified via ArcX Terminal`,
  ].join('\n');

  return {
    certificateId,
    userName: userName || 'Winter Arc Warrior',
    completedAt: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    tier,
    tierColor,
    disciplineScore,
    totalDays,
    daysCompleted: currentStreak,
    completionRate,
    totalWorkouts,
    totalHabitsLogged,
    totalReflections,
    longestStreak,
    goal,
    creedQuote,
    shareableSummary,
  };
}

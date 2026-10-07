export interface PillarAnalytics {
  disciplineIndex: number; // 0 - 100
  tierLabel: 'S-TIER' | 'A-TIER' | 'B-TIER' | 'REBUILDING';
  fitnessScore: number; // 0 - 100
  disciplineScore: number; // 0 - 100
  mindsetScore: number; // 0 - 100
  tacticalAdvice: string;
}

export function computePillarAnalytics(params: {
  habitAdherencePercent: number; // 0 - 100
  totalWorkouts: number;
  totalReflections: number;
  currentStreak: number;
}): PillarAnalytics {
  const {
    habitAdherencePercent,
    totalWorkouts,
    totalReflections,
    currentStreak,
  } = params;

  // Fitness score based on workout count & streak
  const targetWorkouts = Math.max(3, Math.round(currentStreak * 0.5));
  const fitnessScore = Math.min(100, Math.round((totalWorkouts / targetWorkouts) * 100));

  // Discipline score based on habit adherence
  const disciplineScore = Math.min(100, Math.round(habitAdherencePercent));

  // Mindset score based on evening reflections
  const targetReflections = Math.max(2, Math.round(currentStreak * 0.6));
  const mindsetScore = Math.min(100, Math.round((totalReflections / targetReflections) * 100));

  // Overall Discipline Index (weighted: 40% habits, 35% fitness, 25% mindset)
  const disciplineIndex = Math.min(
    100,
    Math.round(disciplineScore * 0.4 + fitnessScore * 0.35 + mindsetScore * 0.25),
  );

  let tierLabel: PillarAnalytics['tierLabel'] = 'REBUILDING';
  if (disciplineIndex >= 85) tierLabel = 'S-TIER';
  else if (disciplineIndex >= 70) tierLabel = 'A-TIER';
  else if (disciplineIndex >= 50) tierLabel = 'B-TIER';

  let tacticalAdvice = 'Steady execution. Maintain the rhythm through the cold.';
  if (fitnessScore < 40) {
    tacticalAdvice = 'Physical mastery lagging: Schedule a dedicated lifting or running session today.';
  } else if (mindsetScore < 40) {
    tacticalAdvice = 'Mindset neglected: Take 5 minutes tonight to audit your thoughts in the Journal.';
  } else if (disciplineScore < 50) {
    tacticalAdvice = 'Habit adherence slipping: Focus strictly on your top 2 non-negotiables.';
  } else if (disciplineIndex >= 85) {
    tacticalAdvice = 'Flawless balance: You are dominating across physical, mental, and habit fronts.';
  }

  return {
    disciplineIndex,
    tierLabel,
    fitnessScore,
    disciplineScore,
    mindsetScore,
    tacticalAdvice,
  };
}

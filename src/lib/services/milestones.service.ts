export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'fitness' | 'mindset' | 'discipline';
  tier: 'bronze' | 'silver' | 'gold' | 'arc_ascendant';
  isUnlocked: boolean;
  progressPercent: number;
  criteriaLabel: string;
}

export interface TelemetryStats {
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalHabits: number;
  totalReflections: number;
}

export function computeMilestones(stats: TelemetryStats): MilestoneBadge[] {
  const { streak, totalWorkouts, totalReflections } = stats;

  return [
    {
      id: 'cold_start',
      title: 'Cold Start',
      description: 'Entered the Winter Arc and logged Day 01 without looking back.',
      icon: '❄️',
      category: 'streak',
      tier: 'bronze',
      isUnlocked: streak >= 1,
      progressPercent: Math.min(100, Math.round((streak / 1) * 100)),
      criteriaLabel: 'Day 1 Streak',
    },
    {
      id: 'frostborn',
      title: 'Frostborn',
      description: 'Maintained 7 straight days of non-negotiable discipline.',
      icon: '⚔️',
      category: 'streak',
      tier: 'bronze',
      isUnlocked: streak >= 7,
      progressPercent: Math.min(100, Math.round((streak / 7) * 100)),
      criteriaLabel: 'Day 7 Streak',
    },
    {
      id: 'iron_athlete',
      title: 'Iron Athlete',
      description: 'Logged 5 physical training sessions against resistance.',
      icon: '🏋️',
      category: 'fitness',
      tier: 'bronze',
      isUnlocked: totalWorkouts >= 5,
      progressPercent: Math.min(100, Math.round((totalWorkouts / 5) * 100)),
      criteriaLabel: '5 Workouts',
    },
    {
      id: 'habit_iron',
      title: 'Iron Standard',
      description: 'Two full weeks (14 days) uninterrupted execution.',
      icon: '🛡️',
      category: 'streak',
      tier: 'silver',
      isUnlocked: streak >= 14,
      progressPercent: Math.min(100, Math.round((streak / 14) * 100)),
      criteriaLabel: 'Day 14 Streak',
    },
    {
      id: 'stoic_mind',
      title: 'Stoic Fortress',
      description: 'Penned 7 evening reflections to audit thoughts and sharpen clarity.',
      icon: '📜',
      category: 'mindset',
      tier: 'bronze',
      isUnlocked: totalReflections >= 7,
      progressPercent: Math.min(100, Math.round((totalReflections / 7) * 100)),
      criteriaLabel: '7 Reflections',
    },
    {
      id: 'steel_will',
      title: 'Steel Will',
      description: 'Reached Day 30 in the depths of winter. Habit has become identity.',
      icon: '⚡',
      category: 'streak',
      tier: 'silver',
      isUnlocked: streak >= 30,
      progressPercent: Math.min(100, Math.round((streak / 30) * 100)),
      criteriaLabel: 'Day 30 Streak',
    },
    {
      id: 'beast_mode',
      title: 'Heavy Artillery',
      description: 'Logged 15 workouts. The body is transforming daily.',
      icon: '🔥',
      category: 'fitness',
      tier: 'silver',
      isUnlocked: totalWorkouts >= 15,
      progressPercent: Math.min(100, Math.round((totalWorkouts / 15) * 100)),
      criteriaLabel: '15 Workouts',
    },
    {
      id: 'frost_mountain',
      title: 'Frost Titan',
      description: '60 Days unbroken. You are immune to cold and excuses.',
      icon: '🏔️',
      category: 'streak',
      tier: 'gold',
      isUnlocked: streak >= 60,
      progressPercent: Math.min(100, Math.round((streak / 60) * 100)),
      criteriaLabel: 'Day 60 Streak',
    },
    {
      id: 'winter_ascendant',
      title: 'Arc Ascendant',
      description: 'Completed the full 90-day Winter Arc. Reborn in cold discipline.',
      icon: '👑',
      category: 'streak',
      tier: 'arc_ascendant',
      isUnlocked: streak >= 90,
      progressPercent: Math.min(100, Math.round((streak / 90) * 100)),
      criteriaLabel: 'Day 90 Victory',
    },
  ];
}

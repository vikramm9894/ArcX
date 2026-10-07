export interface StoicQuote {
  id: string;
  quote: string;
  author: string;
  pillar: 'discipline' | 'fitness' | 'mindfulness';
}

export const STOIC_CREEDS: StoicQuote[] = [
  {
    id: '1',
    quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
    pillar: 'mindfulness',
  },
  {
    id: '2',
    quote: 'We suffer more often in imagination than in reality.',
    author: 'Seneca',
    pillar: 'mindfulness',
  },
  {
    id: '3',
    quote: 'No man is free who is not master of himself.',
    author: 'Epictetus',
    pillar: 'discipline',
  },
  {
    id: '4',
    quote: 'Don’t stop when you’re tired. Stop when you’re done.',
    author: 'David Goggins',
    pillar: 'fitness',
  },
  {
    id: '5',
    quote: 'Discipline equals freedom.',
    author: 'Jocko Willink',
    pillar: 'discipline',
  },
  {
    id: '6',
    quote: 'There is nothing outside of yourself that can enable you to get better, stronger, richer, quicker, or smarter. Everything is within.',
    author: 'Miyamoto Musashi',
    pillar: 'discipline',
  },
  {
    id: '7',
    quote: 'He who has a why to live can bear almost any how.',
    author: 'Friedrich Nietzsche',
    pillar: 'mindfulness',
  },
  {
    id: '8',
    quote: 'The impediment to action advances action. What stands in the way becomes the way.',
    author: 'Marcus Aurelius',
    pillar: 'discipline',
  },
  {
    id: '9',
    quote: 'Associate with people who are likely to improve you.',
    author: 'Seneca',
    pillar: 'mindfulness',
  },
  {
    id: '10',
    quote: 'If you want to be uncommon, you have to do what other people are unwilling to do.',
    author: 'David Goggins',
    pillar: 'fitness',
  },
  {
    id: '11',
    quote: 'First say to yourself what you would be; and then do what you have to do.',
    author: 'Epictetus',
    pillar: 'discipline',
  },
  {
    id: '12',
    quote: 'Waste no more time arguing about what a good man should be. Be one.',
    author: 'Marcus Aurelius',
    pillar: 'discipline',
  },
];

export function getDailyCreed(daySeed?: number): StoicQuote {
  const seed = daySeed ?? new Date().getDate();
  const index = Math.abs(seed) % STOIC_CREEDS.length;
  return STOIC_CREEDS[index];
}

export function getRandomCreed(): StoicQuote {
  const randomIndex = Math.floor(Math.random() * STOIC_CREEDS.length);
  return STOIC_CREEDS[randomIndex];
}

export function generateArcExportReport(params: {
  userName: string;
  currentStreak: number;
  totalDays: number;
  goal: string;
  workoutsCount: number;
  reflectionsCount: number;
  unlockedBadgesCount: number;
}): string {
  const {
    userName,
    currentStreak,
    totalDays,
    goal,
    workoutsCount,
    reflectionsCount,
    unlockedBadgesCount,
  } = params;

  return `════════════════════════════════════
❄️ ARC-X WINTER PROTOCOL REPORT ❄️
════════════════════════════════════
OPERATIVE: ${userName.toUpperCase()}
ACTIVE MISSION: ${goal}
PROGRESS: DAY ${currentStreak} OF ${totalDays} (${Math.round((currentStreak / totalDays) * 100)}%)
CURRENT STREAK: ${currentStreak} DAYS 🔥

TELEMETRY TOTALS:
• Workouts Executed: ${workoutsCount}
• Mindset Debriefs: ${reflectionsCount}
• Milestones Unlocked: ${unlockedBadgesCount}

"When the cold arrives and the weak hibernate, we build in the dark."
════════════════════════════════════`;
}

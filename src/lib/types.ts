export type PillarKey = 'fitness' | 'discipline' | 'mindfulness';

export interface ArcOnboardingData {
  goal: string;
  focusPillar: PillarKey;
  durationDays: number;
  startDate: string;
  habits: string[];
}

export interface UserProfile {
  id: string;
  email?: string;
  onboarding?: ArcOnboardingData | null;
}

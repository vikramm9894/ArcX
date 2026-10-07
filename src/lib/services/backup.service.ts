import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfile, type ProfileRow } from './profile.service';
import { fetchUserHabits, type HabitRow } from './habits.service';
import { fetchWorkouts, type WorkoutWithExercises } from './workouts.service';
import { fetchJournalEntries, type JournalEntryRow } from './journal.service';

export interface ArcBackupPackage {
  version: '1.0';
  exportedAt: string;
  userId: string;
  profile: ProfileRow | null;
  habits: HabitRow[];
  workouts: WorkoutWithExercises[];
  journalEntries: JournalEntryRow[];
}

export async function exportArcBackup(userId: string): Promise<string> {
  const [profile, habits, workouts, journalEntries] = await Promise.all([
    fetchUserProfile(userId),
    fetchUserHabits(userId),
    fetchWorkouts(userId),
    fetchJournalEntries(userId),
  ]);

  const backupPkg: ArcBackupPackage = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    userId,
    profile,
    habits,
    workouts,
    journalEntries,
  };

  return JSON.stringify(backupPkg, null, 2);
}

export async function restoreArcBackup(userId: string, jsonStr: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonStr) as ArcBackupPackage;
    if (!parsed || parsed.version !== '1.0') {
      throw new Error('Invalid Arc backup file version');
    }

    if (parsed.habits && parsed.habits.length > 0) {
      await AsyncStorage.setItem(`@arc_habits_${userId}`, JSON.stringify(parsed.habits));
    }

    if (parsed.workouts && parsed.workouts.length > 0) {
      await AsyncStorage.setItem(`@arc_workouts_${userId}`, JSON.stringify(parsed.workouts));
    }

    if (parsed.journalEntries && parsed.journalEntries.length > 0) {
      await AsyncStorage.setItem(`@arc_journal_${userId}`, JSON.stringify(parsed.journalEntries));
    }

    return true;
  } catch (err) {
    console.error('Failed to restore Arc backup:', err);
    throw err;
  }
}

export async function clearLocalArcData(userId: string): Promise<void> {
  const keysToRemove = [
    `@arc_habits_${userId}`,
    `@arc_workouts_${userId}`,
    `@arc_journal_${userId}`,
    `@arc_user_profile_${userId}`,
  ];
  await AsyncStorage.multiRemove(keysToRemove);
}

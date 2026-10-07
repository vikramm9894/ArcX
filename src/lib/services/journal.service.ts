import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type JournalEntryRow = Database['public']['Tables']['journal_entries']['Row'];

const JOURNAL_STORAGE_KEY_PREFIX = '@arc_journal_';

export async function fetchJournalEntries(userId: string): Promise<JournalEntryRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(`${JOURNAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
        return data;
      }
    } catch {
      // Fallback
    }
  }

  const local = await AsyncStorage.getItem(`${JOURNAL_STORAGE_KEY_PREFIX}${userId}`);
  if (local) {
    try {
      return JSON.parse(local) as JournalEntryRow[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveJournalEntry(
  userId: string,
  entry: {
    entry_date?: string;
    mood_score?: number;
    discipline_rating?: number;
    reflection_text?: string;
    gratitude_text?: string;
  },
): Promise<JournalEntryRow> {
  const dateStr = entry.entry_date ?? new Date().toISOString().split('T')[0];
  const newEntry: JournalEntryRow = {
    id: `local_journal_${Date.now()}`,
    user_id: userId,
    entry_date: dateStr,
    mood_score: entry.mood_score ?? 5,
    discipline_rating: entry.discipline_rating ?? 5,
    reflection_text: entry.reflection_text ?? null,
    gratitude_text: entry.gratitude_text ?? null,
    created_at: new Date().toISOString(),
  };

  const existing = await fetchJournalEntries(userId);
  const filtered = existing.filter((e) => e.entry_date !== dateStr);
  const updated = [newEntry, ...filtered];
  await AsyncStorage.setItem(`${JOURNAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('journal_entries')
        .upsert({
          user_id: userId,
          entry_date: dateStr,
          mood_score: newEntry.mood_score,
          discipline_rating: newEntry.discipline_rating,
          reflection_text: newEntry.reflection_text,
          gratitude_text: newEntry.gratitude_text,
        })
        .select()
        .single();

      if (data) return data;
    } catch {
      // fallback saved
    }
  }

  return newEntry;
}

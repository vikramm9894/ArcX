import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

/**
 * Defaults tuned for a mobile app: data is considered fresh for a short window
 * so tab switches don't refetch constantly, but a stale app coming back to the
 * foreground (or a pull-to-refresh) will refetch.
 */
const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: 0,
  },
};

export const queryClient = new QueryClient({ defaultOptions });

/** Query keys used across the app — keeps cache invalidation honest. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  activeArc: (userId: string) => ['arc', 'active', userId] as const,
  arcs: (userId: string) => ['arcs', userId] as const,
  habits: (arcId: string) => ['habits', arcId] as const,
  habitLogs: (arcId: string, date: string) => ['habit-logs', arcId, date] as const,
  habitLogRange: (arcId: string) => ['habit-logs', 'range', arcId] as const,
  workouts: (arcId: string) => ['workouts', arcId] as const,
  journal: (userId: string) => ['journal', userId] as const,
  journalEntry: (userId: string, date: string) => ['journal', userId, date] as const,
  chatMessages: (arcId: string) => ['chat', arcId] as const,
} as const;

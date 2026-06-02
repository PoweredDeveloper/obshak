import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  day1RetentionPct: number;
  week1RetentionPct: number;
  blockedUsers: number;
  blockedUsersPct: number;
  unrecognizedRequests: number;
  botCrashes: number;
  byInstitute: { institute: string; count: number }[];
  byGroup: { group_name: string; count: number }[];
}

/** Admin dashboard metrics — computed on API, not in browser. */
export function useUsersStats() {
  const q = useQuery({
    queryKey: ['admin', 'users-stats'],
    queryFn: () => api<UserStats>('/admin/users-stats', { auth: 'required' }),
    staleTime: 60 * 1000,
    retry: 1,
  });

  return {
    stats: q.data ?? null,
    loading: q.isLoading,
    refresh: q.refetch,
    error: q.error,
  };
}

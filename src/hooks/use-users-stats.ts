import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
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

export function useUsersStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const isoToday = today.toISOString();
      const isoWeekAgo = weekAgo.toISOString();
      const isoMonthAgo = monthAgo.toISOString();

      const [
        { count: totalUsers },
        { count: newUsersToday },
        { count: activeToday },
        { count: activeWeek },
        { count: activeMonth },
        { data: instituteData },
        { data: groupData },
        { count: blockedUsers },
        { count: unrecognizedRequests },
        { count: botCrashes },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', isoToday),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', isoToday),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', isoWeekAgo),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', isoMonthAgo),
        supabase.from('profiles').select('institute').not('institute', 'is', null),
        supabase.from('profiles').select('group_name').not('group_name', 'is', null),
        supabase.from('bot_user_status').select('*', { count: 'exact', head: true }).eq('is_blocked', true),
        supabase.from('bot_events').select('*', { count: 'exact', head: true }).eq('event_type', 'unrecognized_request'),
        supabase.from('bot_events').select('*', { count: 'exact', head: true }).eq('event_type', 'bot_crash'),
      ]);

      const byInstitute = Object.entries(((instituteData || []) as { institute: string }[]).reduce((acc, { institute }) => {
        acc[institute] = (acc[institute] || 0) + 1;
        return acc;
      }, {} as Record<string, number>))
        .map(([institute, count]) => ({ institute, count }))
        .sort((a, b) => b.count - a.count);

      const byGroup = Object.entries(((groupData || []) as { group_name: string }[]).reduce((acc, { group_name }) => {
        acc[group_name] = (acc[group_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>))
        .map(([group_name, count]) => ({ group_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const { data: profileDates } = await supabase
        .from('profiles')
        .select('telegram_id, created_at')
        .not('telegram_id', 'is', null)
        .not('created_at', 'is', null);

      const { data: userActivity } = await supabase
        .from('bot_events')
        .select('telegram_id, created_at')
        .in('event_type', ['update_received', 'start_command', 'help_callback'])
        .not('telegram_id', 'is', null)
        .not('created_at', 'is', null);

      const activityByUser = new Map<number, Set<string>>();
      (userActivity || []).forEach((event: any) => {
        const tId = Number(event.telegram_id);
        if (!Number.isFinite(tId)) return;
        const day = new Date(event.created_at).toISOString().slice(0, 10);
        if (!activityByUser.has(tId)) {
          activityByUser.set(tId, new Set());
        }
        activityByUser.get(tId)!.add(day);
      });

      let baseUsers = 0;
      let retainedDay1 = 0;
      let retainedWeek1 = 0;
      (profileDates || []).forEach((p: any) => {
        const tId = Number(p.telegram_id);
        if (!Number.isFinite(tId) || !p.created_at) return;
        const createdDay = new Date(p.created_at).toISOString().slice(0, 10);
        const activityDays = activityByUser.get(tId);
        if (!activityDays) return;
        baseUsers++;
        const createdDate = new Date(`${createdDay}T00:00:00.000Z`);
        const day1Date = new Date(createdDate);
        day1Date.setUTCDate(day1Date.getUTCDate() + 1);
        const week1Date = new Date(createdDate);
        week1Date.setUTCDate(week1Date.getUTCDate() + 7);
        const day1Key = day1Date.toISOString().slice(0, 10);
        const week1Key = week1Date.toISOString().slice(0, 10);
        if (activityDays.has(day1Key)) retainedDay1++;
        if (activityDays.has(week1Key)) retainedWeek1++;
      });

      const day1RetentionPct = baseUsers > 0 ? Math.round((retainedDay1 / baseUsers) * 1000) / 10 : 0;
      const week1RetentionPct = baseUsers > 0 ? Math.round((retainedWeek1 / baseUsers) * 1000) / 10 : 0;
      const safeTotal = totalUsers || 0;
      const safeBlocked = blockedUsers || 0;
      const blockedUsersPct = safeTotal > 0 ? Math.round((safeBlocked / safeTotal) * 1000) / 10 : 0;

      setStats({
        totalUsers: safeTotal,
        newUsersToday: newUsersToday || 0,
        activeToday: activeToday || 0,
        activeWeek: activeWeek || 0,
        activeMonth: activeMonth || 0,
        day1RetentionPct,
        week1RetentionPct,
        blockedUsers: safeBlocked,
        blockedUsersPct,
        unrecognizedRequests: unrecognizedRequests || 0,
        botCrashes: botCrashes || 0,
        byInstitute,
        byGroup,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return { stats, loading, refresh: loadStats };
}

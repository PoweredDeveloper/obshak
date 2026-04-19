import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  byInstitute: { institute: string; count: number }[];
  byGroup: { group_name: string; count: number }[];
}

export function useUsersStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      // Общее количество пользователей
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Активные за сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: activeToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', today.toISOString());

      // Активные за неделю
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: activeWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', weekAgo.toISOString());

      // Активные за месяц
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const { count: activeMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', monthAgo.toISOString());

      // По институтам
      const { data: instituteData } = await supabase
        .from('profiles')
        .select('institute')
        .not('institute', 'is', null);

      const byInstitute = Object.entries(
        (instituteData || []).reduce((acc, { institute }) => {
          acc[institute] = (acc[institute] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([institute, count]) => ({ institute, count }))
        .sort((a, b) => b.count - a.count);

      // По группам (топ 10)
      const { data: groupData } = await supabase
        .from('profiles')
        .select('group_name')
        .not('group_name', 'is', null);

      const byGroup = Object.entries(
        (groupData || []).reduce((acc, { group_name }) => {
          acc[group_name] = (acc[group_name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([group_name, count]) => ({ group_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        activeWeek: activeWeek || 0,
        activeMonth: activeMonth || 0,
        byInstitute,
        byGroup,
      });
      setError(null);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }

  return { stats, loading, error, refresh: loadStats };
}

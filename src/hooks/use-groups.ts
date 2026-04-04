import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Group } from '@/lib/schedule-data';

// Кеш для групп (в памяти приложения)
let cachedGroups: Group[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

// Функция для очистки кеша (экспортируем для использования при logout)
export function clearGroupsCache() {
  cachedGroups = null;
  cacheTimestamp = null;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>(cachedGroups || []);
  const [loading, setLoading] = useState(!cachedGroups);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      // Проверяем кеш
      if (cachedGroups && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
        console.log('Using cached groups');
        setGroups(cachedGroups);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching groups from Supabase...');

        // Загружаем группы с информацией об институтах и направлениях
        const { data, error: fetchError } = await supabase
          .from('groups')
          .select(`
            id,
            name,
            course,
            form,
            directions!inner (
              name,
              institutes!inner (
                name
              )
            )
          `)
          .order('name');

        console.log('Query result:', { data, error: fetchError });

        if (fetchError) {
          console.error('Supabase error:', fetchError);
          throw fetchError;
        }

        // Преобразуем данные в нужный формат
        const formattedGroups: Group[] = (data || []).map((g: any) => {
          // Вычисляем семестр на основе курса (примерно)
          const semester = g.course ? g.course * 2 : 1;
          
          return {
            id: g.id,
            name: g.name,
            institute: g.directions?.institutes?.name || 'Unknown',
            direction: g.directions?.name || 'Unknown',
            course: g.course || 1,
            semester: semester,
          };
        });

        console.log('Formatted groups:', formattedGroups.slice(0, 3));
        
        // Сохраняем в кеш
        cachedGroups = formattedGroups;
        cacheTimestamp = Date.now();
        
        setGroups(formattedGroups);
      } catch (err) {
        console.error('Error fetching groups:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load groups';
        console.error('Error details:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchGroups();
  }, []);

  return { groups, loading, error };
}

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Хук для подписки на изменения рейтингов преподавателей в реальном времени
 */
export function useTeachersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Подписываемся на изменения в таблице teacher_ratings
    const channel = supabase
      .channel('teacher_ratings_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Все события: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'teacher_ratings',
        },
        (payload) => {
          console.log('Realtime: teacher rating changed', payload);
          
          // Инвалидируем кеш преподавателей
          // Это заставит React Query перезагрузить данные
          queryClient.invalidateQueries({
            queryKey: ['teachers'],
            exact: false,
          });
        }
      )
      .subscribe();

    // Отписываемся при размонтировании
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

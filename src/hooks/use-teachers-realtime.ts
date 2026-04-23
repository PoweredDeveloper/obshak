import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Periodically refresh teacher ratings (replaces Supabase Realtime).
 */
export function useTeachersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = window.setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['teachers'],
        exact: false,
      });
    }, 60_000);

    return () => window.clearInterval(id);
  }, [queryClient]);
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/postgrest/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTeacherRating(teacherId: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Мутация для установки/обновления рейтинга
  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { error } = await db
        .from('teacher_ratings')
        .upsert({
          teacher_id: teacherId,
          user_id: profile.id,
          rating,
        }, {
          onConflict: 'teacher_id,user_id',
        });

      if (error) throw error;
      return rating;
    },
    onSuccess: (rating) => {
      // Инвалидируем все запросы teachers
      // Это обновит кеш для всех вариантов пагинации, поиска и сортировки
      queryClient.invalidateQueries({ 
        queryKey: ['teachers'],
        exact: false // Инвалидирует все ключи начинающиеся с ['teachers']
      });
    },
  });

  return {
    rateTeacher: rateMutation.mutate,
    isRating: rateMutation.isPending,
  };
}

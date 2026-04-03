import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Teacher {
  id: string;
  full_name: string;
  department: string | null;
  email: string | null;
  average_rating?: number;
  ratings_count?: number;
  user_rating?: number | null;
}

export function useTeachers(userId?: string) {
  return useQuery({
    queryKey: ['teachers', userId],
    queryFn: async () => {
      // Загружаем преподавателей с рейтингами из денормализованных колонок (БЫСТРО!)
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, full_name, department, email, average_rating, ratings_count')
        .order('full_name');

      if (teachersError) {
        console.error('Error loading teachers:', teachersError);
        throw teachersError;
      }
      
      if (!teachers || teachers.length === 0) return [];

      // Получаем только user_rating для текущего пользователя (один быстрый запрос)
      if (userId) {
        const teacherIds = teachers.map(t => t.id);
        const { data: userRatings } = await supabase
          .from('teacher_ratings')
          .select('teacher_id, rating')
          .eq('user_id', userId)
          .in('teacher_id', teacherIds);

        const userRatingsMap = (userRatings || []).reduce((acc, r) => {
          acc[r.teacher_id] = r.rating;
          return acc;
        }, {} as Record<string, number>);

        return teachers.map(teacher => ({
          ...teacher,
          average_rating: parseFloat(teacher.average_rating as any) || 0,
          ratings_count: parseInt(teacher.ratings_count as any) || 0,
          user_rating: userRatingsMap[teacher.id] || null,
        }));
      }

      return teachers.map(t => ({ 
        ...t, 
        average_rating: parseFloat(t.average_rating as any) || 0,
        ratings_count: parseInt(t.ratings_count as any) || 0,
        user_rating: null 
      }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });
}

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

export interface TeachersParams {
  userId?: string;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  sortBy?: 'rating' | 'name';
}

export interface TeachersResponse {
  teachers: Teacher[];
  total: number;
  hasMore: boolean;
}

export function useTeachers(params: TeachersParams) {
  const { userId, limit = 20, offset = 0, searchQuery = '', sortBy = 'rating' } = params;

  return useQuery({
    queryKey: ['teachers', userId, limit, offset, searchQuery, sortBy],
    queryFn: async (): Promise<TeachersResponse> => {
      // Строим запрос с фильтрацией и сортировкой
      let query = supabase
        .from('teachers')
        .select('id, full_name, department, email, average_rating, ratings_count', { count: 'exact' });

      // Поиск по имени или кафедре
      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%`);
      }

      // Сортировка
      if (sortBy === 'rating') {
        query = query.order('average_rating', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('full_name', { ascending: true });
      }

      // Пагинация
      query = query.range(offset, offset + limit - 1);

      const { data: teachers, error: teachersError, count } = await query;

      if (teachersError) {
        console.error('Error loading teachers:', teachersError);
        throw teachersError;
      }
      
      if (!teachers || teachers.length === 0) {
        return { teachers: [], total: count || 0, hasMore: false };
      }

      // Получаем user_rating для текущего пользователя
      let teachersWithRatings = teachers;
      
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

        teachersWithRatings = teachers.map(teacher => ({
          ...teacher,
          average_rating: parseFloat(teacher.average_rating as any) || 0,
          ratings_count: parseInt(teacher.ratings_count as any) || 0,
          user_rating: userRatingsMap[teacher.id] || null,
        }));
      } else {
        teachersWithRatings = teachers.map(t => ({ 
          ...t, 
          average_rating: parseFloat(t.average_rating as any) || 0,
          ratings_count: parseInt(t.ratings_count as any) || 0,
          user_rating: null 
        }));
      }

      return {
        teachers: teachersWithRatings,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });
}

import { useQuery } from '@tanstack/react-query';
import { api, type ApiPage } from '@/lib/api';

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

interface ApiTeacher {
  id: string;
  full_name: string;
  department: string | null;
  email: string | null;
  average_rating: number | null;
  ratings_count: number | null;
  user_rating: number | null;
}

export function useTeachers(params: TeachersParams) {
  const { userId, limit = 20, offset = 0, searchQuery = '', sortBy = 'rating' } = params;

  return useQuery({
    queryKey: ['teachers', userId, limit, offset, searchQuery, sortBy],
    queryFn: async (): Promise<TeachersResponse> => {
      const page = await api<ApiPage<ApiTeacher>>('/teachers', {
        query: {
          limit,
          offset,
          search: searchQuery.trim(),
          sort_by: sortBy,
        },
      });

      const teachers: Teacher[] = page.items.map((t) => ({
        id: t.id,
        full_name: t.full_name,
        department: t.department,
        email: t.email,
        average_rating: t.average_rating ?? 0,
        ratings_count: t.ratings_count ?? 0,
        user_rating: t.user_rating,
      }));

      return {
        teachers,
        total: page.total,
        hasMore: page.has_more,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });
}

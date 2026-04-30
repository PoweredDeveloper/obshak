import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string | null;
}

export interface Service {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category_id: string;
  author_name: string;
  author_username: string | null;
  author_rating: number;
  reviews_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ServiceReview {
  id: string;
  service_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string | null;
    group_name: string | null;
  };
}

export function useServiceCategories(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ServiceCategory[];
    },
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled !== false, // По умолчанию включено
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<ServiceCategory, 'id'>) => {
      const { data, error } = await supabase
        .from('service_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...category }: Partial<ServiceCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
    },
  });
}

interface UseServicesOptions {
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export function useServices(options: UseServicesOptions = {}, queryOptions?: { enabled?: boolean }) {
  const { categoryId, searchQuery = '', limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: ['services', categoryId, searchQuery, limit, offset],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*', { count: 'exact' })
        .eq('is_active', true);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        services: data as Service[],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: queryOptions?.enabled !== false, // По умолчанию включено
  });
}

export function useServiceReviews(serviceId: string, options: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = options;
  
  return useQuery({
    queryKey: ['service-reviews', serviceId, limit, offset],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('service_reviews')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            group_name
          )
        `, { count: 'exact' })
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return {
        reviews: data as ServiceReview[],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (review: { service_id: string; rating: number; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('service_reviews')
        .insert({ ...review, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newReview) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['service-reviews', newReview.service_id] });
      
      const previousReviews = queryClient.getQueryData(['service-reviews', newReview.service_id, 20, 0]);
      
      // Обновляем кеш оптимистично
      queryClient.setQueryData(['service-reviews', newReview.service_id, 20, 0], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          reviews: [{ ...newReview, id: 'temp', created_at: new Date().toISOString() }, ...old.reviews],
          total: old.total + 1,
        };
      });
      
      return { previousReviews };
    },
    onError: (err, newReview, context) => {
      // Откатываем при ошибке
      if (context?.previousReviews) {
        queryClient.setQueryData(['service-reviews', newReview.service_id, 20, 0], context.previousReviews);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-reviews', variables.service_id] });
      queryClient.invalidateQueries({ queryKey: ['service'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, service_id, ...review }: { id: string; service_id: string; rating: number; comment?: string }) => {
      const { data, error } = await supabase
        .from('service_reviews')
        .update({ ...review, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-reviews', variables.service_id] });
      queryClient.invalidateQueries({ queryKey: ['service'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useAdminServices(options: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = options;
  
  return useQuery({
    queryKey: ['admin-services', limit, offset],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('services')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return {
        services: data as Service[],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (service: Omit<Service, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('services')
        .insert(service)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...service }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update({ ...service, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service'] });
    },
  });
}

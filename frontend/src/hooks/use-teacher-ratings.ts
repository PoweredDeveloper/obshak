import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface RateTeacherResponse {
  teacher_id: string;
  user_rating: number;
  average_rating: number | null;
  ratings_count: number;
}

export function useTeacherRating(teacherId: string) {
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: async (rating: number): Promise<RateTeacherResponse> => {
      return api<RateTeacherResponse>(`/teachers/${teacherId}/rating`, {
        method: 'PUT',
        body: { rating },
        auth: 'required',
      });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Не удалось сохранить оценку', { description: msg });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'], exact: false });
    },
  });

  return {
    rateTeacher: rateMutation.mutate,
    isRating: rateMutation.isPending,
  };
}

import { useAuth } from '@/contexts/AuthContext';

export function useAdmin() {
  const { isAdmin, isLoading } = useAuth();
  
  return { isAdmin, loading: isLoading };
}

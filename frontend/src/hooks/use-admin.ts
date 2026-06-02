import { useAuth } from '@/contexts/AuthContext';

export function useAdmin() {
  const { isAdmin, isLoading, isAdminLoading } = useAuth();
  
  return { isAdmin, loading: isLoading || isAdminLoading };
}

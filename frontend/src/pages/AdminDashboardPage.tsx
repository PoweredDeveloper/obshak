import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import { useUsersStats } from '@/hooks/use-users-stats';
import { AdminLayout } from '@/components/AdminLayout';
import { AdminStatsGrid } from '@/components/admin/AdminStatsGrid';
import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';
import { AdminBroadcastCard } from '@/components/admin/AdminBroadcastCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Calendar, Users, RefreshCw } from 'lucide-react';

export default function AdminDashboardPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { stats, loading: statsLoading, refresh } = useUsersStats();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Доступ запрещен');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Админ-панель</h2>
          <Button size="sm" variant="outline" onClick={() => refresh()} disabled={statsLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {stats && <AdminStatsGrid stats={stats} />}
        {stats && <AdminDashboardCharts stats={stats} />}

        <AdminBroadcastCard />

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" className="h-auto py-4 justify-start" onClick={() => navigate('/admin/schedule')}>
            <Calendar className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-left">
              <span className="block font-semibold">Расписание</span>
              <span className="text-xs text-muted-foreground font-normal">Редактирование занятий</span>
            </span>
          </Button>
          <Button variant="secondary" className="h-auto py-4 justify-start" onClick={() => navigate('/admin/users')}>
            <Users className="w-5 h-5 mr-3 shrink-0" />
            <span className="text-left">
              <span className="block font-semibold">Пользователи</span>
              <span className="text-xs text-muted-foreground font-normal">Группы и метаданные</span>
            </span>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

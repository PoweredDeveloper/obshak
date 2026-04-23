import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import { AdminLayout } from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/integrations/postgrest/client';
import { toast } from 'sonner';
import { Bell, Save, Eye, EyeOff, MessageCircle, ChevronRight, Home, User } from 'lucide-react';

interface Notification {
  id: string;
  key: string;
  enabled: boolean;
  text: string;
  link: string | null;
}

export default function AdminNotificationsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  
  const [scheduleFeedback, setScheduleFeedback] = useState<Notification | null>(null);
  const [bugReport, setBugReport] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Доступ запрещен');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    
    const { data, error } = await db
      .from('app_notifications')
      .select('*')
      .in('key', ['schedule_feedback', 'bug_report']);

    if (error) {
      console.error('Error loading notifications:', error);
      toast.error('Ошибка загрузки уведомлений');
    } else {
      const schedule = data?.find(n => n.key === 'schedule_feedback');
      const bug = data?.find(n => n.key === 'bug_report');
      
      if (schedule) setScheduleFeedback(schedule);
      if (bug) setBugReport(bug);
    }

    setLoading(false);
  }

  async function saveNotification(notification: Notification) {
    setSaving(true);

    const { error } = await db
      .from('app_notifications')
      .update({
        enabled: notification.enabled,
        text: notification.text,
        link: notification.link,
        updated_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    if (error) {
      console.error('Error saving notification:', error);
      toast.error('Ошибка сохранения');
    } else {
      toast.success('Уведомление сохранено');
    }

    setSaving(false);
  }

  if (adminLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Загрузка...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (!scheduleFeedback || !bugReport) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Уведомления не найдены</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Уведомления</h2>
        </div>

        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="home" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Главная страница
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Профиль
            </TabsTrigger>
          </TabsList>

          {/* Вкладка: Главная страница */}
          <TabsContent value="home" className="mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Кнопка обратной связи</h3>
                  <p className="text-sm text-muted-foreground">
                    Плавающая кнопка на главной странице для сообщения об ошибках в расписании
                  </p>
                </div>

                {/* Включить/Выключить */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {scheduleFeedback.enabled ? (
                      <Eye className="w-5 h-5 text-green-500" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <Label className="text-base font-medium">
                        {scheduleFeedback.enabled ? 'Кнопка включена' : 'Кнопка выключена'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {scheduleFeedback.enabled 
                          ? 'Пользователи видят кнопку на главной странице'
                          : 'Кнопка скрыта от пользователей'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={scheduleFeedback.enabled}
                    onCheckedChange={(checked) => 
                      setScheduleFeedback({ ...scheduleFeedback, enabled: checked })
                    }
                  />
                </div>

                {/* Текст кнопки */}
                <div className="space-y-2">
                  <Label htmlFor="schedule-text">Текст кнопки</Label>
                  <Input
                    id="schedule-text"
                    value={scheduleFeedback.text}
                    onChange={(e) => 
                      setScheduleFeedback({ ...scheduleFeedback, text: e.target.value })
                    }
                    placeholder="Неверное расписание?"
                  />
                </div>

                {/* Ссылка */}
                <div className="space-y-2">
                  <Label htmlFor="schedule-link">Ссылка (Telegram)</Label>
                  <Input
                    id="schedule-link"
                    value={scheduleFeedback.link || ''}
                    onChange={(e) => 
                      setScheduleFeedback({ ...scheduleFeedback, link: e.target.value })
                    }
                    placeholder="https://t.me/username"
                  />
                </div>

                {/* Превью */}
                <div className="space-y-2">
                  <Label>Превью</Label>
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded-full w-fit">
                      <Bell className="w-3.5 h-3.5" />
                      <span>{scheduleFeedback.text}</span>
                    </div>
                  </div>
                </div>

                {/* Кнопка сохранения */}
                <Button
                  onClick={() => saveNotification(scheduleFeedback)}
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Вкладка: Профиль */}
          <TabsContent value="profile" className="mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Кнопка "Сообщить об ошибке"</h3>
                  <p className="text-sm text-muted-foreground">
                    Кнопка в профиле пользователя для связи с поддержкой
                  </p>
                </div>

                {/* Включить/Выключить */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {bugReport.enabled ? (
                      <Eye className="w-5 h-5 text-green-500" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <Label className="text-base font-medium">
                        {bugReport.enabled ? 'Кнопка включена' : 'Кнопка выключена'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {bugReport.enabled 
                          ? 'Пользователи видят кнопку в профиле'
                          : 'Кнопка скрыта от пользователей'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={bugReport.enabled}
                    onCheckedChange={(checked) => 
                      setBugReport({ ...bugReport, enabled: checked })
                    }
                  />
                </div>

                {/* Текст кнопки */}
                <div className="space-y-2">
                  <Label htmlFor="bug-text">Текст кнопки</Label>
                  <Input
                    id="bug-text"
                    value={bugReport.text}
                    onChange={(e) => 
                      setBugReport({ ...bugReport, text: e.target.value })
                    }
                    placeholder="Сообщить об ошибке"
                  />
                </div>

                {/* Ссылка */}
                <div className="space-y-2">
                  <Label htmlFor="bug-link">Ссылка (Telegram)</Label>
                  <Input
                    id="bug-link"
                    value={bugReport.link || ''}
                    onChange={(e) => 
                      setBugReport({ ...bugReport, link: e.target.value })
                    }
                    placeholder="https://t.me/username"
                  />
                </div>

                {/* Превью */}
                <div className="space-y-2">
                  <Label>Превью</Label>
                  <div className="p-4 bg-secondary/50 rounded-lg border">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{bugReport.text}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Кнопка сохранения */}
                <Button
                  onClick={() => saveNotification(bugReport)}
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import { useUsersStats } from '@/hooks/use-users-stats';
import { AdminLayout } from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/integrations/postgrest/client';
import { toast } from 'sonner';
import { Search, Users, TrendingUp, Calendar, MessageCircle, RefreshCw, Shield, ShieldOff, ArrowUpDown } from 'lucide-react';

interface UserProfile {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  group_name: string | null;
  institute: string | null;
  course: number | null;
  last_active: string | null;
  created_at: string;
  is_admin?: boolean;
}

interface GroupStats {
  group_name: string;
  total: number;
  active_today: number;
  active_week: number;
  never_active: number;
}

export default function AdminUsersPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { stats, loading: statsLoading } = useUsersStats();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'activity' | 'name' | 'group'>('activity');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [loadingGroupStats, setLoadingGroupStats] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'groups'>('all');
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Доступ запрещен');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    loadGroups();
    loadGroupStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      loadUsers();
    }
  }, [currentPage, searchQuery, sortBy, selectedGroup, activeTab]);

  // Автообновление при фокусе на странице
  useEffect(() => {
    const handleFocus = () => {
      if (activeTab === 'all') {
        loadUsers();
      } else {
        loadGroupStats();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentPage, searchQuery, sortBy, selectedGroup, activeTab]);

  async function loadGroups() {
    const { data } = await db
      .from('profiles')
      .select('group_name')
      .not('group_name', 'is', null)
      .order('group_name');

    const uniqueGroups = [...new Set(data?.map(p => p.group_name).filter(Boolean) as string[])];
    setGroups(uniqueGroups);
  }

  async function loadGroupStats() {
    setLoadingGroupStats(true);

    const { data: allProfiles } = await db
      .from('profiles')
      .select('group_name, last_active')
      .not('group_name', 'is', null);

    if (!allProfiles) {
      setLoadingGroupStats(false);
      return;
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groupMap = new Map<string, GroupStats>();

    allProfiles.forEach(profile => {
      const groupName = profile.group_name!;
      
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, {
          group_name: groupName,
          total: 0,
          active_today: 0,
          active_week: 0,
          never_active: 0
        });
      }

      const stats = groupMap.get(groupName)!;
      stats.total++;

      if (!profile.last_active) {
        stats.never_active++;
      } else {
        const lastActive = new Date(profile.last_active);
        if (lastActive >= today) stats.active_today++;
        if (lastActive >= weekAgo) stats.active_week++;
      }
    });

    const statsArray = Array.from(groupMap.values())
      .sort((a, b) => b.total - a.total);

    setGroupStats(statsArray);
    setLoadingGroupStats(false);
  }

  async function loadUsers() {
    setLoadingUsers(true);
    
    const from = (currentPage - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    let query = db
      .from('profiles')
      .select('id, telegram_id, first_name, last_name, username, photo_url, group_name, institute, course, last_active, created_at', { count: 'exact' });

    // Фильтр по группе
    if (selectedGroup !== 'all') {
      query = query.eq('group_name', selectedGroup);
    }

    // Поиск
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,group_name.ilike.%${searchTerm}%`);
    }

    // Сортировка
    if (sortBy === 'activity') {
      query = query.order('last_active', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'name') {
      query = query.order('first_name', { ascending: true });
    } else if (sortBy === 'group') {
      query = query.order('group_name', { ascending: true, nullsFirst: false });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error loading users:', error);
      toast.error('Ошибка загрузки пользователей');
      setLoadingUsers(false);
      return;
    }

    // Проверяем какие пользователи являются админами
    const { data: adminsData } = await db
      .from('admins')
      .select('telegram_id');

    const adminTelegramIds = new Set(adminsData?.map(a => a.telegram_id) || []);

    const usersWithAdminFlag = (data || []).map(user => ({
      ...user,
      is_admin: adminTelegramIds.has(user.telegram_id)
    }));

    setUsers(usersWithAdminFlag);
    setTotalCount(count || 0);
    setLoadingUsers(false);
  }

  function formatLastActive(lastActive: string | null) {
    if (!lastActive) return 'Никогда';

    const now = new Date();
    const active = new Date(lastActive);
    const diffSeconds = (now.getTime() - active.getTime()) / 1000;
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    // Если больше недели, показываем дату
    return active.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function openTelegram(username: string) {
    window.open(`https://t.me/${username}`, '_blank');
  }

  async function toggleAdmin(user: UserProfile) {
    if (user.is_admin) {
      // Убираем админа
      const { error } = await db
        .from('admins')
        .delete()
        .eq('telegram_id', user.telegram_id);

      if (error) {
        console.error('Error removing admin:', error);
        toast.error('Ошибка при удалении админа');
      } else {
        toast.success(`${user.first_name} больше не админ`);
        loadUsers();
      }
    } else {
      // Добавляем админа
      const { error } = await db
        .from('admins')
        .insert({
          telegram_id: user.telegram_id,
          username: user.username
        });

      if (error) {
        console.error('Error adding admin:', error);
        toast.error('Ошибка при добавлении админа');
      } else {
        toast.success(`${user.first_name} теперь админ`);
        loadUsers();
      }
    }
  }

  if (adminLoading || statsLoading) {
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

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">Пользователи</h2>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Всего</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeToday}</p>
                  <p className="text-xs text-muted-foreground">Сегодня</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeWeek}</p>
                  <p className="text-xs text-muted-foreground">За неделю</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeMonth}</p>
                  <p className="text-xs text-muted-foreground">За месяц</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* По институтам */}
        {stats && stats.byInstitute.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">По институтам</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {stats.byInstitute.map((item) => (
                <div key={item.institute} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">{item.institute}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Вкладки */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Все пользователи</TabsTrigger>
            <TabsTrigger value="groups">По группам</TabsTrigger>
          </TabsList>

          {/* Вкладка: Все пользователи */}
          <TabsContent value="all" className="space-y-4 mt-4">

        {/* Топ групп */}
        {stats && stats.byGroup.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Топ-10 групп</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {stats.byGroup.map((item) => (
                <button
                  key={item.group_name}
                  onClick={() => {
                    setSelectedGroup(item.group_name);
                    setCurrentPage(1);
                    // Прокручиваем к списку пользователей
                    document.getElementById('users-list')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all hover:scale-105 ${
                    selectedGroup === item.group_name 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <span className="text-sm font-medium">{item.group_name}</span>
                  <Badge 
                    variant={selectedGroup === item.group_name ? "secondary" : "default"} 
                    className="text-xs"
                  >
                    {item.count}
                  </Badge>
                </button>
              ))}
            </div>
            {selectedGroup !== 'all' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedGroup('all')}
                className="mt-3 w-full"
              >
                Показать все группы
              </Button>
            )}
          </Card>
        )}

        {/* Список пользователей */}
        <Card className="p-4" id="users-list">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              {selectedGroup !== 'all' ? `Группа ${selectedGroup}` : 'Все пользователи'} 
              {totalCount > 0 && ` (${totalCount})`}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => loadUsers()}
              disabled={loadingUsers}
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Фильтры и поиск */}
          <div className="space-y-3 mb-4">
            {selectedGroup !== 'all' && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <Badge variant="default" className="text-sm">
                  {selectedGroup}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Показано пользователей: {totalCount}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedGroup('all')}
                  className="ml-auto"
                >
                  Сбросить
                </Button>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск по имени, фамилии, username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">По активности</SelectItem>
                  <SelectItem value="name">По имени</SelectItem>
                  <SelectItem value="group">По группе</SelectItem>
                </SelectContent>
              </Select>

              {selectedGroup === 'all' && (
                <Select value={selectedGroup} onValueChange={(value) => {
                  setSelectedGroup(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Все группы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все группы</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {loadingUsers && (
            <div className="text-center py-8 text-muted-foreground">
              Загрузка...
            </div>
          )}

          {!loadingUsers && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery.trim() ? 'Пользователи не найдены' : 'Нет пользователей'}
            </div>
          )}

          {!loadingUsers && users.length > 0 && (
            <>
              <div className="space-y-2">
                {users.map((user) => {
                const lastActiveText = formatLastActive(user.last_active);
                const fullName = `${user.first_name} ${user.last_name || ''}`.trim();
                const initials = `${user.first_name[0]}${user.last_name?.[0] || ''}`;

                return (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={user.photo_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{fullName}</p>
                        {user.username && (
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        )}
                        {user.is_admin && (
                          <Badge variant="default" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Админ
                          </Badge>
                        )}
                      </div>
                      
                      {(user.group_name || user.institute) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {user.group_name && (
                            <span className="font-medium">{user.group_name}</span>
                          )}
                          {user.group_name && user.institute && (
                            <span>•</span>
                          )}
                          {user.institute && (
                            <span>{user.institute}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                        <span className="text-muted-foreground">Заходил: {lastActiveText}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                      {user.username && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTelegram(user.username!)}
                          className="flex-1 sm:flex-initial"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Написать
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={user.is_admin ? "ghost" : "ghost"}
                        onClick={() => toggleAdmin(user)}
                        className={`flex-shrink-0 ${user.is_admin ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-muted-foreground hover:text-primary'}`}
                      >
                        {user.is_admin ? (
                          <ShieldOff className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Пагинация */}
              {totalCount > USERS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Показано {(currentPage - 1) * USERS_PER_PAGE + 1}-{Math.min(currentPage * USERS_PER_PAGE, totalCount)} из {totalCount}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Назад
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage * USERS_PER_PAGE >= totalCount}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
          </TabsContent>

          {/* Вкладка: По группам */}
          <TabsContent value="groups" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Все группы ({groupStats.length})</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => loadGroupStats()}
                  disabled={loadingGroupStats}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingGroupStats ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {loadingGroupStats && (
                <div className="text-center py-8 text-muted-foreground">
                  Загрузка...
                </div>
              )}

              {!loadingGroupStats && groupStats.length > 0 && (
                <div className="space-y-2">
                  {groupStats.map((group) => (
                    <button
                      key={group.group_name}
                      onClick={() => {
                        setSelectedGroup(group.group_name);
                        setActiveTab('all');
                        setCurrentPage(1);
                        setTimeout(() => {
                          document.getElementById('users-list')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-all hover:scale-[1.02] text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-lg">{group.group_name}</span>
                          <Badge variant="secondary">{group.total} чел</Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Сегодня: {group.active_today}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            За неделю: {group.active_week}
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            Никогда: {group.never_active}
                          </span>
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

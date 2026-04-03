import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Trash2, Search } from 'lucide-react';
import { useFavoriteGroups } from '@/hooks/use-favorite-groups';
import { ScheduleModal } from '@/components/ScheduleModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  course: number | null;
  direction_id: string | null;
}

interface Direction {
  id: string;
  name: string;
  institute_id: string | null;
}

interface Institute {
  id: string;
  name: string;
}

export default function FriendsPage() {
  const { favorites, loading, addFavorite, removeFavorite } = useFavoriteGroups();
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);

  // Загружаем группы только один раз
  useEffect(() => {
    if (!groupsLoaded) {
      loadGroups();
    }
  }, [groupsLoaded]);

  async function loadGroups() {
    setLoadingGroups(true);
    
    const [groupsRes, directionsRes, institutesRes] = await Promise.all([
      supabase.from('groups').select('id, name, course, direction_id').order('name'),
      supabase.from('directions').select('id, name, institute_id'),
      supabase.from('institutes').select('id, name'),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data);
    if (directionsRes.data) setDirections(directionsRes.data);
    if (institutesRes.data) setInstitutes(institutesRes.data);

    setGroupsLoaded(true);
    setLoadingGroups(false);
  }

  function getGroupInfo(group: Group) {
    const direction = directions.find(d => d.id === group.direction_id);
    const institute = direction ? institutes.find(i => i.id === direction.institute_id) : null;
    return {
      instituteName: institute?.name || 'Не указан',
      course: group.course || 0,
    };
  }

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleAddFavorite(group: Group) {
    const info = getGroupInfo(group);
    const result = await addFavorite(group.id, group.name, info.instituteName, info.course);
    
    if (result.success) {
      setIsAddDialogOpen(false);
      setSearchQuery('');
    } else {
      if (result.error?.includes('duplicate')) {
        toast.error('Эта группа уже в избранном');
      } else {
        toast.error('Ошибка при добавлении');
      }
    }
  }

  async function handleRemoveFavorite(favoriteId: string, groupName: string) {
    const result = await removeFavorite(favoriteId);
    
    if (!result.success) {
      toast.error('Ошибка при удалении');
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Избранное</h1>
            <p className="text-sm text-muted-foreground">
              Быстрый доступ к расписанию других групп
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Plus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-xl">Добавить группу</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Найдите группу друга или другого курса
                </p>
              </DialogHeader>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Поиск по названию группы..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingGroups ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Загрузка групп...</p>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-muted-foreground font-medium">
                      {searchQuery ? 'Группы не найдены' : 'Нет доступных групп'}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const info = getGroupInfo(group);
                    const isFav = favorites.some(f => f.group_id === group.id);
                    
                    return (
                      <button
                        key={group.id}
                        onClick={() => !isFav && handleAddFavorite(group)}
                        disabled={isFav}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          isFav
                            ? 'bg-secondary/50 border-border cursor-not-allowed opacity-60'
                            : 'hover:bg-secondary border-border hover:border-primary/30 hover:shadow-sm'
                        }`}
                      >
                        <p className="font-semibold text-sm text-foreground">{group.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {info.instituteName} • {info.course} курс
                        </p>
                        {isFav && (
                          <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                            <span>✓</span>
                            <span>Уже в избранном</span>
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Показываем empty state сразу, если нет избранного */}
        {favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-4"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">Добавьте первую группу</p>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
              Смотрите расписание друзей, одногруппников или других курсов без смены своей группы
            </p>
            <div className="space-y-3 text-left max-w-sm mx-auto mb-8">
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-foreground">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Добавьте группу</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Найдите нужную группу в списке</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-foreground">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Смотрите расписание</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Быстрый доступ в один клик</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite, i) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="schedule-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-card-foreground text-base">{favorite.group_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{favorite.institute}</span>
                      <span>•</span>
                      <span>{favorite.course} курс</span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setSelectedGroup({ id: favorite.group_id, name: favorite.group_name })}
                      className="flex items-center gap-1.5 shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Открыть</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFavorite(favorite.id, favorite.group_name)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {selectedGroup && (
        <ScheduleModal
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
        />
      )}
    </div>
  );
}

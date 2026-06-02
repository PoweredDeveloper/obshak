import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronRight, ArrowLeft, Heart, Search, ArrowUpDown, X, Loader2 } from 'lucide-react';
import { useTeachers } from '@/hooks/use-teachers';
import { useTeachersRealtime } from '@/hooks/use-teachers-realtime';
import { useTeacherRating } from '@/hooks/use-teacher-ratings';
import { useAuth } from '@/contexts/AuthContext';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { Teacher } from '@/hooks/use-teachers';

const FAVORITES_KEY = 'teacher-favorites';

export default function TeachersPage() {
  const { profile } = useAuth();

  // Подключаем Realtime для автоматического обновления рейтингов
  useTeachersRealtime();

  const [selected, setSelected] = useState<Teacher | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    // Загружаем избранное из localStorage при инициализации
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [searchInput, setSearchInput] = useState(''); // Для инпута
  const debouncedSearch = useDebouncedValue(searchInput, 800); // Debounce для серверного поиска (увеличено до 800мс)
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  
  const { data: teachersData, isLoading, error } = useTeachers({
    userId: profile?.id,
    limit,
    offset,
    searchQuery: debouncedSearch,
    sortBy,
  });

  // Сброс offset при изменении фильтров
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, sortBy]);

  // После оценки список перезапрашивается — подтянуть свежие ratings_count / average_rating в открытую карточку
  useEffect(() => {
    if (!selected || !teachersData?.teachers.length) return;
    const updated = teachersData.teachers.find((t) => t.id === selected.id);
    if (!updated) return;
    setSelected((prev) => {
      if (!prev || prev.id !== updated.id) return prev;
      if (
        prev.ratings_count === updated.ratings_count &&
        prev.average_rating === updated.average_rating &&
        prev.user_rating === updated.user_rating
      ) {
        return prev;
      }
      return { ...updated };
    });
  }, [teachersData, selected?.id]);

  // Сохраняем избранное в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, [favorites]);

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Разделяем на избранное и обычные (на клиенте)
  const { favoriteTeachers, regularTeachers } = useMemo(() => {
    if (!teachersData) return { favoriteTeachers: [], regularTeachers: [] };

    const favs = teachersData.teachers.filter(t => favorites.has(t.id));
    const regular = teachersData.teachers.filter(t => !favorites.has(t.id));

    return {
      favoriteTeachers: favs,
      regularTeachers: regular,
    };
  }, [teachersData, favorites]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-6">
          <h1 className="text-xl font-bold text-foreground mb-4">Преподаватели</h1>
          
          {/* Анимация загрузки */}
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Загрузка преподавателей...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-6">
          <h1 className="text-xl font-bold text-foreground mb-4">Преподаватели</h1>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">😕</p>
            <p className="text-lg font-semibold text-foreground mb-2">Ошибка загрузки</p>
            <p className="text-sm text-muted-foreground mb-4">
              Не удалось загрузить список преподавателей
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AnimatePresence mode="wait">
        {selected ? (
          <TeacherDetail
            teacher={selected}
            isFav={favorites.has(selected.id)}
            onBack={() => setSelected(null)}
            onToggleFav={() => toggleFav(selected.id)}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="px-5 pt-6"
          >
            <h1 className="text-xl font-bold text-foreground mb-4">Преподаватели</h1>

            {/* Поиск с кнопкой фильтра */}
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск преподавателя..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-24 py-3.5 rounded-2xl bg-card border border-border shadow-sm text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-colors ${
                  showFilters ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>

            {/* Горизонтальные фильтры - показываются только при showFilters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide"
              >
                <button
                  onClick={() => setSortBy('rating')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    sortBy === 'rating'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-secondary/50 text-foreground'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  По рейтингу
                </button>
                <button
                  onClick={() => setSortBy('name')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    sortBy === 'name'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-secondary/50 text-foreground'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  По имени
                </button>
              </motion.div>
            )}

            {/* Favorites first */}
            {favoriteTeachers.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  ❤️ Избранное
                </p>
                <div className="space-y-2">
                  {favoriteTeachers.map((teacher, i) => (
                    <TeacherRow
                      key={teacher.id}
                      teacher={teacher}
                      index={i}
                      isFav
                      onSelect={() => setSelected(teacher)}
                      onToggleFav={() => toggleFav(teacher.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {regularTeachers.map((teacher, i) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                  index={i}
                  isFav={false}
                  onSelect={() => setSelected(teacher)}
                  onToggleFav={() => toggleFav(teacher.id)}
                />
              ))}
            </div>

            {/* Кнопка "Показать еще" */}
            {teachersData?.hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setOffset(prev => prev + limit)}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Загрузка...' : 'Показать еще'}
                </button>
              </div>
            )}

            {/* Счетчик */}
            {teachersData && teachersData.teachers.length > 0 && (
              <div className="text-center text-xs text-muted-foreground mt-2">
                Показано {offset + teachersData.teachers.length} из {teachersData.total}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherDetail({
  teacher,
  isFav,
  onBack,
  onToggleFav,
}: {
  teacher: Teacher;
  isFav: boolean;
  onBack: () => void;
  onToggleFav: () => void;
}) {
  const { rateTeacher, isRating } = useTeacherRating(teacher.id);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [optimisticRating, setOptimisticRating] = useState<number | null>(null);

  const handleRate = (rating: number) => {
    setOptimisticRating(rating);
    rateTeacher(rating, {
      onError: () => setOptimisticRating(null),
    });
  };

  const displayRating = hoveredStar || optimisticRating || teacher.user_rating || 0;

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="px-5 pt-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-primary text-sm font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      {/* Teacher profile */}
      <div className="schedule-card mb-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary">
              {teacher.full_name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-card-foreground text-lg leading-tight break-words">{teacher.full_name}</h2>
            {teacher.department && (
              <p className="text-sm text-muted-foreground mt-0.5 break-words">{teacher.department}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="text-sm font-semibold text-card-foreground">
                  {teacher.average_rating ? teacher.average_rating.toFixed(1) : '—'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({teacher.ratings_count || 0} оценок)
              </span>
            </div>
          </div>
          <button
            onClick={onToggleFav}
            className="p-2 rounded-xl hover:bg-secondary transition-colors flex-shrink-0"
          >
            <Heart
              className={`w-5 h-5 ${isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`}
            />
          </button>
        </div>
      </div>

      {/* Email */}
      {teacher.email && (
        <div className="schedule-card mb-4">
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <a
            href={`mailto:${teacher.email}`}
            className="text-sm text-primary hover:underline"
          >
            {teacher.email}
          </a>
        </div>
      )}

      {/* Ваша оценка */}
      <div className="schedule-card">
        <h3 className="text-sm font-semibold text-card-foreground mb-3">
          {(optimisticRating || teacher.user_rating) ? 'Ваша оценка' : 'Оцените преподавателя'}
        </h3>
        <div className="flex items-center justify-center gap-2 py-2 relative">
          {isRating && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-xl">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              disabled={isRating}
              className="transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= displayRating
                    ? 'text-warning fill-warning'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {(optimisticRating || teacher.user_rating) && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Нажмите на звезду, чтобы изменить оценку
          </p>
        )}
      </div>
    </motion.div>
  );
}

function TeacherRow({
  teacher,
  index,
  isFav,
  onSelect,
  onToggleFav,
}: {
  teacher: Teacher;
  index: number;
  isFav: boolean;
  onSelect: () => void;
  onToggleFav: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }} // Ограничиваем задержку
      className="bg-card rounded-2xl p-3.5 shadow-sm border border-border/50"
    >
      <div className="flex items-center gap-3">
        <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-primary">{teacher.full_name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-card-foreground text-sm truncate">{teacher.full_name}</p>
            {teacher.department && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{teacher.department}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {teacher.average_rating && teacher.average_rating > 0 ? (
              <>
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="text-base font-bold text-card-foreground">
                  {teacher.average_rating.toFixed(1)}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
        <button onClick={onToggleFav} className="p-1.5 flex-shrink-0">
          <Heart className={`w-5 h-5 ${isFav ? 'fill-destructive text-destructive' : 'text-muted-foreground/40'}`} />
        </button>
      </div>
    </motion.div>
  );
}

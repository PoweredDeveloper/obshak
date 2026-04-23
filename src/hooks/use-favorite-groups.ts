import { useState, useEffect } from 'react';
import { db } from '@/integrations/postgrest/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FavoriteGroup {
  id: string;
  group_id: string;
  group_name: string;
  institute: string | null;
  course: number | null;
  created_at: string | null;
}

// Кэш для избранных групп
const favoritesCache = new Map<string, { favorites: FavoriteGroup[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Функция для очистки кэша (экспортируем для использования при logout)
export function clearFavoritesCache() {
  favoritesCache.clear();
}

export function useFavoriteGroups() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) {
      setFavorites([]);
      return;
    }

    void loadFavorites();

    const poll = window.setInterval(() => {
      favoritesCache.delete(profile.id);
      void loadFavorites();
    }, 60_000);

    return () => window.clearInterval(poll);
  }, [profile?.id]);

  async function loadFavorites() {
    if (!profile?.id) return;

    // Проверяем кэш
    const cached = favoritesCache.get(profile.id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached favorites');
      setFavorites(cached.favorites);
      return;
    }

    setLoading(true);

    const { data, error } = await db
      .from('favorite_groups')
      .select('id, group_id, group_name, institute, course, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading favorites:', error);
    } else {
      const favoritesList = data || [];

      setFavorites(favoritesList);

      // Сохраняем в кэш
      favoritesCache.set(profile.id, {
        favorites: favoritesList,
        timestamp: Date.now(),
      });
    }

    setLoading(false);
  }

  async function addFavorite(groupId: string, groupName: string, institute: string | null, course: number | null) {
    if (!profile?.id) return { success: false, error: 'Not authenticated' };

    const { data, error } = await db
      .from('favorite_groups')
      .insert({
        user_id: profile.id,
        group_id: groupId,
        group_name: groupName,
        institute: institute,
        course: course,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding favorite:', error);
      return { success: false, error: error.message };
    }

    // Инвалидируем кэш
    favoritesCache.delete(profile.id);

    // Добавляем только новый элемент в начало списка
    if (data) {
      setFavorites((prev) => [data, ...prev]);
    }

    return { success: true };
  }

  async function removeFavorite(favoriteId: string) {
    if (!profile?.id) return { success: false, error: 'Not authenticated' };

    // Оптимистично удаляем из UI
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));

    const { error } = await db.from('favorite_groups').delete().eq('id', favoriteId);

    if (error) {
      console.error('Error removing favorite:', error);
      // Если ошибка - восстанавливаем список
      await loadFavorites();
      return { success: false, error: error.message };
    }

    // Инвалидируем кэш после успешного удаления
    favoritesCache.delete(profile.id);

    return { success: true };
  }

  function isFavorite(groupId: string): boolean {
    return favorites.some((f) => f.group_id === groupId);
  }

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
  };
}

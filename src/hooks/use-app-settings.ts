import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AppSetting {
  key: string;
  value: string | number | boolean | null;
}

interface AppSettings {
  [key: string]: string | number | boolean | null;
}

/**
 * Хук для получения глобальных настроек приложения
 * Кеширование на 5 минут для оптимизации (1000+ пользователей)
 */
export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .order('key') as { data: AppSetting[] | null; error: Error | null };

      if (error) throw error;

      // Преобразуем в объект для удобного доступа
      const settings: AppSettings = {};
      data?.forEach((setting) => {
        settings[setting.key] = setting.value;
      });

      return settings;
    },
    staleTime: 5 * 60 * 1000, // 5 минут кеш - оптимизация для большого количества пользователей
    gcTime: 10 * 60 * 1000, // Храним в памяти 10 минут
    refetchOnWindowFocus: true, // Обновляем при возврате на вкладку
  });
}

/**
 * Хук для проверки включена ли определенная фича
 * @param flagKey - ключ настройки (например: 'features.services_enabled')
 * @returns boolean - включена ли фича
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { data: settings, isLoading } = useAppSettings();

  // Пока загружается, возвращаем false (фича выключена по умолчанию)
  if (isLoading || !settings) return false;

  return settings[flagKey] === true || settings[flagKey] === 'true';
}

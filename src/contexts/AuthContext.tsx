import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '@/integrations/postgrest/client';
import { auth } from '@/integrations/postgrest/session';
import {
  type DbProfile,
  type TelegramLoginWidgetUser,
  authenticateWithTelegram,
  authenticateWithLoginWidget,
  updateProfile as updateProfileApi,
  fetchProfile,
  getTelegramInitData,
  isTelegramWebApp,
} from '@/lib/telegram-auth';
import { initActivityTracking } from '@/lib/activity-tracker';
import { clearGroupsCache } from '@/hooks/use-groups';
import { clearScheduleCache } from '@/hooks/use-schedule';
import { clearFavoritesCache } from '@/hooks/use-favorite-groups';

interface Notification {
  key: string;
  enabled: boolean;
  text: string;
  link: string | null;
}

interface AuthContextType {
  profile: DbProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isWebApp: boolean;
  login: () => Promise<void>;
  loginWithWidget: (userData: TelegramLoginWidgetUser) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<DbProfile>) => Promise<void>;
  error: string | null;
  notifications: Record<string, Notification>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Authentication failed';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Record<string, Notification>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWebApp] = useState(() => isTelegramWebApp());

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const initData = getTelegramInitData();
      if (!initData) {
        throw new Error('Откройте приложение внутри Telegram');
      }

      const nextProfile = await authenticateWithTelegram(initData);
      setProfile(nextProfile);
    } catch (error) {
      setProfile(null);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithWidget = useCallback(async (userData: TelegramLoginWidgetUser) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextProfile = await authenticateWithLoginWidget(userData);
      setProfile(nextProfile);
      initActivityTracking();
    } catch (error) {
      setProfile(null);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Проверяем статус админа (polling replaces Supabase Realtime)
  useEffect(() => {
    async function checkAdmin() {
      if (!profile?.telegram_id) {
        setIsAdmin(false);
        return;
      }

      const { data } = await db
        .from('admins')
        .select('id')
        .eq('telegram_id', profile.telegram_id)
        .single();

      setIsAdmin(!!data);
    }

    void checkAdmin();
    const id = window.setInterval(() => {
      void checkAdmin();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [profile?.telegram_id]);

  // Уведомления (polling replaces Realtime)
  useEffect(() => {
    async function loadNotifications() {
      const { data } = await db
        .from('app_notifications')
        .select('key, enabled, text, link')
        .eq('enabled', true);

      if (data) {
        const notificationsMap: Record<string, Notification> = {};
        data.forEach((notification) => {
          notificationsMap[notification.key] = notification;
        });
        setNotifications(notificationsMap);
      }
    }

    void loadNotifications();
    const id = window.setInterval(() => {
      void loadNotifications();
    }, 45_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let isActive = true;

    const finishLoading = () => {
      if (isActive) {
        setIsLoading(false);
      }
    };

    const syncProfile = async (userId: string) => {
      try {
        const nextProfile = await fetchProfile(userId);
        if (!isActive) return;

        setProfile(nextProfile);
        setError(nextProfile ? null : 'Профиль не найден');

        // Обновляем активность при успешной загрузке профиля
        if (nextProfile) {
          initActivityTracking();
        }
      } catch (error) {
        if (!isActive) return;

        console.error('Failed to fetch profile:', error);
        setProfile(null);
        setError('Не удалось загрузить профиль');
      } finally {
        finishLoading();
      }
    };

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await auth.getSession();

        if (!isActive) return;

        if (session?.user) {
          void syncProfile(session.user.id);
          return;
        }

        // Only auto-authenticate if running inside Telegram Mini App
        if (isWebApp) {
          const initData = getTelegramInitData();
          if (initData) {
            try {
              const nextProfile = await authenticateWithTelegram(initData);
              if (!isActive) return;

              setProfile(nextProfile);
              setError(null);

              // Обновляем активность при успешной аутентификации
              if (nextProfile) {
                initActivityTracking();
              }
            } catch (error) {
              if (!isActive) return;

              setProfile(null);
              setError(getErrorMessage(error));
            } finally {
              finishLoading();
              return;
            }
          }
        }

        // For website, just finish loading - user needs to click Login Widget
        finishLoading();
      } catch (error) {
        if (!isActive) return;

        console.error('Auth initialization failed:', error);
        setProfile(null);
        setError('Не удалось инициализировать авторизацию');
        finishLoading();
      }
    };

    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      if (!isActive) return;

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setError(null);
        finishLoading();
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        window.setTimeout(() => {
          if (isActive) {
            void syncProfile(session.user.id);
          }
        }, 0);
      }
    });

    void initializeAuth();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [isWebApp]);

  const logout = useCallback(async () => {
    await auth.signOut();
    setProfile(null);
    setError(null);
    // Clear all caches on logout
    clearGroupsCache();
    clearScheduleCache();
    clearFavoritesCache();
  }, []);

  const updateProfileFn = useCallback(async (updates: Partial<DbProfile>) => {
    if (!profile) return;
    const updated = await updateProfileApi(updates);
    setProfile(updated);
  }, [profile]);

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        isAuthenticated: !!profile,
        isOnboarded: !!profile?.onboarded,
        isWebApp,
        login,
        loginWithWidget,
        logout,
        updateProfile: updateProfileFn,
        error,
        notifications,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

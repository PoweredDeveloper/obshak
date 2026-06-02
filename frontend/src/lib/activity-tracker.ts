import { supabase } from '@/integrations/supabase/client';

/**
 * Обновляет last_active пользователя
 */
export async function updateUserActivity() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating activity:', error);
    } else {
      console.log('[Activity] Updated at', new Date().toISOString());
    }
  } catch (error) {
    console.error('Error in updateUserActivity:', error);
  }
}

/**
 * Инициализирует отслеживание активности
 * Записывает время только при открытии приложения
 */
export function initActivityTracking() {
  // Записываем время открытия
  updateUserActivity();
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { WeekToggle } from '@/components/schedule/WeekToggle';
import { ClassCard } from '@/components/schedule/ClassCard';
import { useSchedule } from '@/hooks/use-schedule';
import { useAuth } from '@/contexts/AuthContext';
import {
  CURRENT_SEMESTER,
  getCurrentWeekType,
  getTodayDayIndex,
  getDaySummaryEmoji,
} from '@/lib/schedule-data';

export default function WeekView() {
  const { profile } = useAuth();
  const autoWeekType = getCurrentWeekType(CURRENT_SEMESTER);
  const [weekType, setWeekType] = useState<'even' | 'odd'>(autoWeekType);

  const { schedule, loading, error, refresh } = useSchedule(profile?.group_id || null, weekType);
  
  // Автообновление при возврате на страницу
  useEffect(() => {
    const handleFocus = () => {
      refresh();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refresh]);
  
  const today = getTodayDayIndex();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Загрузка расписания...</p>
        </div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-destructive mb-2">Ошибка загрузки расписания</p>
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Обзор недели</h1>
        <WeekToggle
          weekType={weekType}
          onToggle={() => setWeekType(w => (w === 'even' ? 'odd' : 'even'))}
        />
      </div>

      <div className="px-5 space-y-6">
        {schedule.days.map((day, dayIdx) => {
          const isToday = dayIdx === today;
          return (
            <motion.div
              key={day.dayIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIdx * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <h2
                  className={`text-sm font-bold ${
                    isToday ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {day.dayName}
                </h2>
                {isToday && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Сегодня
                  </span>
                )}
                <span className="text-sm ml-auto">
                  {getDaySummaryEmoji(day.classes.length)}{' '}
                  <span className="text-muted-foreground text-xs">
                    {day.classes.length} {day.classes.length === 1 ? 'занятие' : day.classes.length < 5 ? 'занятия' : 'занятий'}
                  </span>
                </span>
              </div>

              {day.classes.length > 0 ? (
                <div className="space-y-2">
                  {day.classes.map((cls, i) => (
                    <ClassCard key={cls.id} cls={cls} index={i} dayIndex={day.dayIndex} />
                  ))}
                </div>
              ) : (
                <div className="schedule-card text-center py-4">
                  <p className="text-muted-foreground text-sm">Нет занятий 🏖️</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Snowflake, Loader2, MessageCircle, AlertCircle } from 'lucide-react';
import { ClassCard } from '@/components/schedule/ClassCard';
import { DaySelector } from '@/components/schedule/DaySelector';
import { WeekToggle } from '@/components/schedule/WeekToggle';
import { useSchedule } from '@/hooks/use-schedule';
import { useAuth } from '@/contexts/AuthContext';
import {
  CURRENT_SEMESTER,
  getCurrentWeekType,
  getTodayDayIndex,
  getNextClass,
  getDaySummaryEmoji,
} from '@/lib/schedule-data';
import type { UserProfile } from '@/lib/user-store';

interface HomeProps {
  user: UserProfile;
}

export default function Home({ user }: HomeProps) {
  const autoWeekType = getCurrentWeekType(CURRENT_SEMESTER);
  const [weekType, setWeekType] = useState<'even' | 'odd'>(autoWeekType);
  const [selectedDay, setSelectedDay] = useState(getTodayDayIndex());
  const { notifications } = useAuth();

  const { schedule, loading, error, refresh } = useSchedule(user.groupId, weekType);
  
  const scheduleFeedbackNotification = notifications['schedule_feedback'];
  
  // Автообновление при возврате на страницу
  useEffect(() => {
    const handleFocus = () => {
      refresh();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refresh]);
  
  const todayClasses = schedule?.days[selectedDay]?.classes ?? [];
  const nextClass = useMemo(() => getNextClass(todayClasses), [todayClasses]);
  const classCount = todayClasses.length;

  const isToday = selectedDay === getTodayDayIndex();
  const dayName = schedule?.days[selectedDay]?.dayName ?? '';

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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-destructive mb-2">Ошибка загрузки расписания</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground">Расписание недоступно</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isToday ? 'Сегодня' : dayName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                {CURRENT_SEMESTER.type === 'spring' ? (
                  <><Leaf className="w-3.5 h-3.5 text-success" /> Весна</>
                ) : (
                  <><Snowflake className="w-3.5 h-3.5 text-primary" /> Осень</>
                )}
              </span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-sm font-medium text-muted-foreground">{user.groupName}</span>
            </div>
          </div>
          <WeekToggle
            weekType={weekType}
            onToggle={() => setWeekType(w => w === 'even' ? 'odd' : 'even')}
          />
        </div>

        {/* Day selector */}
        <DaySelector
          days={schedule.days}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      {/* Day summary */}
      <div className="px-5 mb-4">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="schedule-card flex items-center gap-3"
        >
          <span className="text-2xl">{getDaySummaryEmoji(classCount)}</span>
          <div>
            <p className="font-semibold text-card-foreground text-sm">
              {classCount === 0
                ? 'Нет занятий — наслаждайтесь днём!'
                : `${classCount} ${classCount === 1 ? 'занятие' : classCount < 5 ? 'занятия' : 'занятий'} ${isToday ? 'сегодня' : ''}`
              }
            </p>
            {nextClass && isToday && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Следующее: {nextClass.subject} в {nextClass.startTime}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Classes list */}
      <div className="px-5 space-y-3">
        {todayClasses.map((cls, i) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            index={i}
            variant={nextClass?.id === cls.id && isToday ? 'next' : 'default'}
            dayIndex={selectedDay}
          />
        ))}

        {classCount === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <p className="text-5xl mb-4">🏖️</p>
            <p className="text-muted-foreground font-medium">Свободный день!</p>
            <p className="text-sm text-muted-foreground mt-1">Занятий нет</p>
          </motion.div>
        )}
      </div>

      {/* Компактная кнопка обратной связи */}
      {scheduleFeedbackNotification?.link && (
        <motion.button
          onClick={() => {
            const prefilledText = `Неверное расписание\n\nГруппа: ${user.groupName}\nДень: ${dayName}\nНеделя: ${weekType === 'even' ? 'Четная' : 'Нечетная'}`;
            const encodedText = encodeURIComponent(prefilledText);
            const linkWithText = `${scheduleFeedbackNotification.link}?text=${encodedText}`;
            
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.openTelegramLink(linkWithText);
            } else {
              window.open(linkWithText, '_blank');
            }
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-20 right-5 z-10 flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded-full shadow-lg transition-colors"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{scheduleFeedbackNotification.text}</span>
        </motion.button>
      )}
    </div>
  );
}

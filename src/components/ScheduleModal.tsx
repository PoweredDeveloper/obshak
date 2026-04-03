import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { ClassCard } from './schedule/ClassCard';
import { DaySelector } from './schedule/DaySelector';
import { WeekToggle } from './schedule/WeekToggle';
import { useSchedule } from '@/hooks/use-schedule';
import { getCurrentWeekType, getTodayDayIndex, CURRENT_SEMESTER } from '@/lib/schedule-data';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export function ScheduleModal({ isOpen, onClose, groupId, groupName }: ScheduleModalProps) {
  const autoWeekType = getCurrentWeekType(CURRENT_SEMESTER);
  const [weekType, setWeekType] = useState<'even' | 'odd'>(autoWeekType);
  const [selectedDay, setSelectedDay] = useState(getTodayDayIndex());

  const { schedule, loading, error } = useSchedule(groupId, weekType);

  const todayClasses = schedule?.days[selectedDay]?.classes ?? [];
  const classCount = todayClasses.length;
  const dayName = schedule?.days[selectedDay]?.dayName ?? '';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{groupName}</h2>
            <p className="text-sm text-muted-foreground">{dayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <WeekToggle
              weekType={weekType}
              onToggle={() => setWeekType(w => w === 'even' ? 'odd' : 'even')}
            />
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-73px)] overflow-y-auto pb-24">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-16 px-6">
              <p className="text-destructive text-center">{error}</p>
            </div>
          )}

          {!loading && !error && schedule && (
            <>
              {/* Day selector */}
              <div className="px-5 pt-4">
                <DaySelector
                  days={schedule.days}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              </div>

              {/* Classes */}
              <div className="px-5 py-4 space-y-3">
                {classCount === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-5xl mb-4">🏖️</p>
                    <p className="text-muted-foreground font-medium">Свободный день!</p>
                    <p className="text-sm text-muted-foreground mt-1">Занятий нет</p>
                  </div>
                ) : (
                  todayClasses.map((cls, i) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      index={i}
                      variant="default"
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
}

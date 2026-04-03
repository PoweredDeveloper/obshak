import { motion } from 'framer-motion';
import { getTodayDayIndex, getDaySummaryEmoji } from '@/lib/schedule-data';
import type { DaySchedule } from '@/lib/schedule-data';

interface DaySelectorProps {
  days: DaySchedule[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function DaySelector({ days, selectedDay, onSelectDay }: DaySelectorProps) {
  const today = getTodayDayIndex();

  return (
    <div className="flex gap-1.5 px-1 overflow-x-auto scrollbar-hide">
      {DAY_LABELS.map((label, i) => {
        const isSelected = i === selectedDay;
        const isToday = i === today;
        const classCount = days[i]?.classes.length ?? 0;

        return (
          <button
            key={i}
            onClick={() => onSelectDay(i)}
            className={`relative flex flex-col items-center min-w-[48px] py-2 px-1 rounded-xl transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-secondary'
            }`}
          >
            <span className="text-[10px] font-medium opacity-70">{label}</span>
            <span className="text-sm font-bold mt-0.5">
              {getDaySummaryEmoji(classCount)}
            </span>
            <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {classCount}
            </span>
            {isToday && !isSelected && (
              <motion.div
                layoutId="today-dot"
                className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

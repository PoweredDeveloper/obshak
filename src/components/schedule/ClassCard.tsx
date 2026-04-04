import { motion } from 'framer-motion';
import { Clock, MapPin, User } from 'lucide-react';
import type { ClassSession } from '@/lib/schedule-data';
import { isCurrentClass, getClassProgress, getTimeLeftMinutes } from '@/lib/schedule-data';
import { getContrastColor } from '@/lib/utils';

interface ClassCardProps {
  cls: ClassSession;
  index: number;
  variant?: 'default' | 'current' | 'next';
  dayIndex?: number; // Индекс дня недели (0-6)
}

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Лекция',
  seminar: 'Семинар',
  lab: 'Лабораторная',
  practice: 'Практика',
};

export function ClassCard({ cls, index, variant = 'default', dayIndex }: ClassCardProps) {
  const isCurrent = variant === 'current' || isCurrentClass(cls, dayIndex);
  const progress = isCurrent ? getClassProgress(cls) : 0;
  const timeLeft = isCurrent ? getTimeLeftMinutes(cls.endTime) : 0;

  // Если есть варианты для подгрупп
  if (cls.hasSubgroups && cls.subgroupVariants) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="schedule-card relative overflow-hidden"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ backgroundColor: cls.color }}
        />

        <div className="pl-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ 
                    backgroundColor: cls.color + '20', 
                    color: getContrastColor(cls.color),
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap'
                  }}
                >
                  По подгруппам
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-semibold text-card-foreground">
                {cls.startTime}
              </p>
              <p className="text-xs text-muted-foreground">
                {cls.endTime}
              </p>
            </div>
          </div>

          {/* Варианты для подгрупп */}
          <div className="space-y-2">
            {cls.subgroupVariants.map((variant, idx) => (
              <div
                key={idx}
                className="p-2 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-card-foreground text-sm flex-1">
                    {variant.subject}
                  </h4>
                  <span className="text-xs font-semibold text-primary ml-2 flex-shrink-0">
                    Подгр. {variant.subgroup}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 flex-1 min-w-0">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{variant.teacher}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <MapPin className="w-3 h-3" />
                    <span>{variant.room}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`schedule-card relative overflow-hidden ${isCurrent ? 'ring-2 ring-primary' : ''}`}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: cls.color }}
      />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ 
                  backgroundColor: cls.color + '20', 
                  color: getContrastColor(cls.color),
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap'
                }}
              >
                {TYPE_LABELS[cls.type]}
              </span>
              {isCurrent && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse-soft">
                  🔥 Сейчас
                </span>
              )}
              {variant === 'next' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                  ➡️ Следующее
                </span>
              )}
            </div>
            <h3 className="font-semibold text-card-foreground text-[15px] leading-tight">
              {cls.subject}
            </h3>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-sm font-semibold text-card-foreground">
              {cls.startTime}
            </p>
            <p className="text-xs text-muted-foreground">
              {cls.endTime}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1 flex-1 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{cls.teacher}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-2">
            <MapPin className="w-3 h-3" />
            <span>{cls.room}</span>
          </span>
        </div>

        {/* Progress for current class */}
        {isCurrent && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Осталось {timeLeft} мин
              </span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { MapPin, User, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getContrastColor } from '@/lib/utils';
import type { GroupedLesson } from '@/hooks/use-admin-schedule';

interface AdminClassCardProps {
  lesson: GroupedLesson;
  index: number;
  color: string;
  onEdit: (lesson: GroupedLesson) => void;
  onDelete: (lesson: GroupedLesson) => void;
}

const TYPE_LABELS: Record<string, string> = {
  'Лекции': 'Лекция',
  'Практические': 'Практика',
  'Лабораторные': 'Лабораторная',
};

export function AdminClassCard({ lesson, index, color, onEdit, onDelete }: AdminClassCardProps) {
  const typeLabel = TYPE_LABELS[lesson.type] || lesson.type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="schedule-card relative overflow-hidden group"
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: color }}
      />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ 
                  backgroundColor: color + '20', 
                  color: getContrastColor(color),
                  minWidth: 'fit-content',
                  whiteSpace: 'nowrap'
                }}
              >
                {typeLabel}
              </span>
            </div>
            <h3 className="font-semibold text-card-foreground text-[15px] leading-tight">
              {lesson.subject}
            </h3>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-sm font-semibold text-card-foreground">
              {lesson.time_start.slice(0, 5)}
            </p>
            <p className="text-xs text-muted-foreground">
              {lesson.time_end.slice(0, 5)}
            </p>
          </div>
        </div>

        {/* Info - если есть варианты подгрупп, показываем их */}
        {lesson.hasSubgroups && lesson.subgroupVariants ? (
          <div className="space-y-1.5 mb-2">
            {lesson.subgroupVariants.map((variant, idx) => (
              <div key={idx} className="text-xs bg-secondary/50 rounded-lg p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-semibold text-primary">
                    Подгр. {variant.subgroup}:
                  </span>
                  <span className="font-medium">{variant.subject}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
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
        ) : (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1 flex-1 min-w-0">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lesson.teacher || 'Не указан'}</span>
            </span>
            <span className="flex items-center gap-1 flex-shrink-0 ml-2">
              <MapPin className="w-3 h-3" />
              <span>{lesson.room || 'Не указана'}</span>
            </span>
          </div>
        )}

        {/* Admin buttons - показываются при наведении */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs flex-1"
            onClick={() => onEdit(lesson)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Изменить
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(lesson)}
          >
            <Trash className="w-3 h-3 mr-1" />
            Удалить
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

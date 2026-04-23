import { useState, useEffect, useCallback } from 'react';
import { db } from '@/integrations/postgrest/client';
import {
  formatScheduleTime,
  type WeekSchedule,
  type DaySchedule,
  type ClassSession,
  type SubgroupVariant,
} from '@/lib/schedule-data';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_SHORTS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Маппинг типов занятий из БД в UI
const TYPE_MAP: Record<string, 'lecture' | 'seminar' | 'lab' | 'practice'> = {
  'Лекции': 'lecture',
  'Практические': 'practice',
  'Лабораторные': 'lab',
  '1 уровень': 'seminar',
  '2 уровень': 'seminar',
  '3 уровень': 'seminar',
  'ТИМ, BIM': 'seminar',
  'бизнеса': 'seminar',
  '1 занятие': 'seminar',
  'Самостоятельная работа': 'practice',
};

const SUBJECT_COLORS: Record<string, string> = {
  lecture: 'hsl(199, 85%, 55%)',
  seminar: 'hsl(270, 60%, 60%)',
  lab: 'hsl(152, 60%, 48%)',
  practice: 'hsl(38, 92%, 55%)',
};

// Кэш для расписаний
const scheduleCache = new Map<string, { schedule: WeekSchedule; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const MAX_CACHE_SIZE = 10; // Максимум 10 записей в кэше

// Функция для очистки кэша (экспортируем для использования при logout)
export function clearScheduleCache() {
  scheduleCache.clear();
}

// Функция очистки старого кэша
function cleanupCache() {
  const now = Date.now();
  const entries = Array.from(scheduleCache.entries());
  
  // Удаляем устаревшие записи
  entries.forEach(([key, value]) => {
    if (now - value.timestamp > CACHE_DURATION) {
      scheduleCache.delete(key);
    }
  });
  
  // Если кэш все еще слишком большой, удаляем самые старые
  if (scheduleCache.size > MAX_CACHE_SIZE) {
    const sorted = Array.from(scheduleCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = sorted.slice(0, scheduleCache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => scheduleCache.delete(key));
  }
}

export function useSchedule(groupId: string | null, weekType: 'even' | 'odd') {
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Определяем какую таблицу использовать (lessons или lessons_test)
  const tableName = import.meta.env.VITE_TEST_MODE === 'true' ? 'lessons_test' : 'lessons';

  // Функция для принудительного обновления расписания
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSchedule() {
      if (!groupId) {
        setSchedule(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Проверяем кэш (только если не принудительное обновление)
        const cacheKey = `${groupId}-${weekType}`;
        if (refreshKey === 0) {
          const cached = scheduleCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            setSchedule(cached.schedule);
            setLoading(false);
            return;
          }
        }

        // Определяем какой тип недели искать в БД
        const dbWeekType = weekType === 'even' ? 'Чет' : 'Неч';

        // Текущая дата для фильтрации занятий с start_date
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Загружаем занятия для группы
        // Берем занятия которые либо для конкретной недели, либо для обеих недель
        // И фильтруем по датам: показываем только если start_date <= today (или null)
        // И end_date >= today (или null)
        const query = db
          .from(tableName)
          .select('id, subject, type, teacher, room, day_of_week, lesson_number, time_start, time_end, subgroup, start_date, end_date')
          .eq('group_id', groupId)
          .in('week_type', [dbWeekType, 'Обе'])
          .order('day_of_week')
          .order('lesson_number');

        const { data: allData, error: fetchError } = await query;

        // Проверяем, был ли отменен запрос
        if (controller.signal.aborted) return;

        if (fetchError) {
          throw fetchError;
        }

        // Фильтруем на клиенте по датам
        const data = allData?.filter(lesson => {
          const startOk = !lesson.start_date || lesson.start_date <= today;
          const endOk = !lesson.end_date || lesson.end_date >= today;
          return startOk && endOk;
        });

        // Группируем по дням недели
        const daySchedules: DaySchedule[] = [];

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const dayLessons = (data || []).filter(l => l.day_of_week === dayIndex + 1);

          // Группируем занятия по номеру пары и времени
          const lessonGroups = new Map<string, typeof data>();

          dayLessons.forEach((lesson: typeof data[number]) => {
            const key = `${lesson.lesson_number}-${lesson.time_start}`;
            if (!lessonGroups.has(key)) {
              lessonGroups.set(key, []);
            }
            lessonGroups.get(key)!.push(lesson);
          });

          const classes: ClassSession[] = Array.from(lessonGroups.entries())
            .sort((a, b) => {
              const [keyA] = a;
              const [keyB] = b;
              const numA = parseInt(keyA.split('-')[0]);
              const numB = parseInt(keyB.split('-')[0]);
              return numA - numB;
            })
            .map(([key, lessons]) => {
              // Группируем по предмету, типу, преподавателю и аудитории
              // Это позволяет различать занятия с разными преподавателями/аудиториями
              const subjectGroups = new Map<string, typeof lessons>();

              lessons.forEach(lesson => {
                const subKey = `${lesson.subject}-${lesson.type}-${lesson.teacher || ''}-${lesson.room || ''}`;
                if (!subjectGroups.has(subKey)) {
                  subjectGroups.set(subKey, []);
                }
                subjectGroups.get(subKey)!.push(lesson);
              });

              // Если есть несколько разных предметов в одно время - создаем занятие с вариантами
              if (subjectGroups.size > 1) {
                const allLessons = Array.from(subjectGroups.values()).flat();
                const firstLesson = allLessons[0];

                const variants = Array.from(subjectGroups.entries()).map(([subKey, group]) => {
                  const lesson = group[0];
                  const type = TYPE_MAP[lesson.type] || 'seminar';
                  const subgroups = [...new Set(group.map(l => l.subgroup))].filter(s => s !== 0);

                  return {
                    subgroup: subgroups[0] || 0,
                    subject: lesson.subject,
                    teacher: lesson.teacher || 'Не указан',
                    room: lesson.room || 'Не указана',
                    type: type,
                  };
                });

                return {
                  id: firstLesson.id.toString(),
                  subject: 'По подгруппам',
                  type: TYPE_MAP[firstLesson.type] || 'seminar',
                  teacher: '',
                  room: '',
                  building: '',
                  startTime: formatScheduleTime(firstLesson.time_start),
                  endTime: formatScheduleTime(firstLesson.time_end),
                  color: SUBJECT_COLORS[TYPE_MAP[firstLesson.type] || 'seminar'],
                  hasSubgroups: true,
                  subgroupVariants: variants,
                };
              } else {
                // Одно занятие для всех или для конкретной подгруппы
                const group = Array.from(subjectGroups.values())[0];
                const lesson = group[0];
                const type = TYPE_MAP[lesson.type] || 'seminar';
                const subgroups = [...new Set(group.map(l => l.subgroup))].filter(s => s !== 0);

                let subgroupInfo = '';
                if (subgroups.length > 0 && subgroups.length < 2) {
                  subgroupInfo = ` (подгр. ${subgroups.join(', ')})`;
                }

                return {
                  id: lesson.id.toString(),
                  subject: lesson.subject + subgroupInfo,
                  type: type,
                  teacher: lesson.teacher || 'Не указан',
                  room: lesson.room || 'Не указана',
                  building: '',
                  startTime: formatScheduleTime(lesson.time_start),
                  endTime: formatScheduleTime(lesson.time_end),
                  color: SUBJECT_COLORS[type],
                };
              }
            });

          daySchedules.push({
            dayIndex,
            dayName: DAY_NAMES[dayIndex],
            dayShort: DAY_SHORTS[dayIndex],
            classes,
          });
        }

        const weekSchedule: WeekSchedule = {
          weekType,
          days: daySchedules,
        };

        // Проверяем снова перед обновлением состояния
        if (controller.signal.aborted) return;

        // Очищаем старый кэш перед добавлением нового
        cleanupCache();

        // Сохраняем в кэш
        scheduleCache.set(cacheKey, {
          schedule: weekSchedule,
          timestamp: Date.now()
        });

        setSchedule(weekSchedule);
      } catch (err) {
        if (controller.signal.aborted) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to load schedule';
        setError(errorMessage);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchSchedule();

    if (!groupId) {
      return () => controller.abort();
    }

    const poll = window.setInterval(() => {
      scheduleCache.delete(`${groupId}-even`);
      scheduleCache.delete(`${groupId}-odd`);
      refresh();
    }, 60_000);

    return () => {
      controller.abort();
      window.clearInterval(poll);
    };
  }, [groupId, weekType, refreshKey, refresh, tableName]);

  return { schedule, loading, error, refresh };
}

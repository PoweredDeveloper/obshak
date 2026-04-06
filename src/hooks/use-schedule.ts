import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WeekSchedule, DaySchedule, ClassSession, SubgroupVariant } from '@/lib/schedule-data';

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
            console.log('Using cached schedule for:', cacheKey);
            setSchedule(cached.schedule);
            setLoading(false);
            return;
          }
        }

        console.log('Fetching schedule for group:', groupId, 'week:', weekType);

        // Определяем какой тип недели искать в БД
        const dbWeekType = weekType === 'even' ? 'Чет' : 'Неч';
        
        // Текущая дата для фильтрации занятий с start_date
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Загружаем занятия для группы
        // Берем занятия которые либо для конкретной недели, либо для обеих недель
        // И фильтруем по датам: показываем только если start_date <= today (или null)
        // И end_date >= today (или null)
        let query = supabase
          .from(tableName)
          .select('id, subject, type, teacher, room, day_of_week, lesson_number, time_start, time_end, subgroup, start_date, end_date')
          .eq('group_id', groupId)
          .in('week_type', [dbWeekType, 'Обе'])
          .order('day_of_week')
          .order('lesson_number');
        
        const { data: allData, error: fetchError } = await query;
        
        if (fetchError) {
          console.error('Supabase error:', fetchError);
          throw fetchError;
        }
        
        // Фильтруем на клиенте по датам (так как Supabase .or() работает не так как нужно)
        const data = allData?.filter(lesson => {
          const startOk = !lesson.start_date || lesson.start_date <= today;
          const endOk = !lesson.end_date || lesson.end_date >= today;
          return startOk && endOk;
        });

        if (fetchError) {
          console.error('Supabase error:', fetchError);
          throw fetchError;
        }

        console.log('Loaded lessons:', data?.length);

        // Группируем по дням недели
        const daySchedules: DaySchedule[] = [];
        
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const dayLessons = (data || []).filter(l => l.day_of_week === dayIndex + 1);
          
          // Группируем занятия по номеру пары и времени
          const lessonGroups = new Map<string, any[]>();
          
          dayLessons.forEach((lesson: any) => {
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
              const subjectGroups = new Map<string, any[]>();
              
              lessons.forEach(lesson => {
                const subKey = `${lesson.subject}-${lesson.type}-${lesson.teacher || ''}-${lesson.room || ''}`;
                if (!subjectGroups.has(subKey)) {
                  subjectGroups.set(subKey, []);
                }
                subjectGroups.get(subKey)!.push(lesson);
              });
              
              console.log(`Day ${dayIndex}, Lesson ${key}: ${subjectGroups.size} unique variants`);
              
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
                
                console.log(`  - Multiple subjects: ${variants.map(v => `${v.subject} (подгр.${v.subgroup})`).join(', ')}`);
                
                return {
                  id: firstLesson.id.toString(),
                  subject: 'По подгруппам',
                  type: TYPE_MAP[firstLesson.type] || 'seminar',
                  teacher: '',
                  room: '',
                  building: '',
                  startTime: firstLesson.time_start.substring(0, 5),
                  endTime: firstLesson.time_end.substring(0, 5),
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
                
                console.log(`  - ${lesson.subject} (${lesson.type}), subgroups: ${subgroups.join(',') || 'all'}`);
                
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
                  startTime: lesson.time_start.substring(0, 5),
                  endTime: lesson.time_end.substring(0, 5),
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

        console.log('Formatted schedule:', weekSchedule);
        
        // Очищаем старый кэш перед добавлением нового
        cleanupCache();
        
        // Сохраняем в кэш
        scheduleCache.set(cacheKey, {
          schedule: weekSchedule,
          timestamp: Date.now()
        });
        
        setSchedule(weekSchedule);
      } catch (err) {
        console.error('Error fetching schedule:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load schedule';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchSchedule();

    // Подписываемся на изменения в таблице lessons/lessons_test для этой группы
    if (!groupId) return;

    const channel = supabase
      .channel(`${tableName}-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          console.log('Schedule changed, invalidating cache for group:', groupId);
          // Инвалидируем кэш для этой группы (обе недели)
          scheduleCache.delete(`${groupId}-even`);
          scheduleCache.delete(`${groupId}-odd`);
          // Перезагружаем расписание
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, weekType, refreshKey, refresh]);

  return { schedule, loading, error, refresh };
}

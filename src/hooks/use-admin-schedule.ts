import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lesson {
  id: number;
  subject: string;
  type: string;
  teacher: string;
  room: string;
  day_of_week: number;
  lesson_number: number;
  time_start: string;
  time_end: string;
  week_type: string;
  subgroup: number;
  group_id: string;
  semester: string;
  start_date: string | null;
  end_date: string | null;
}

interface SubgroupVariant {
  subgroup: number;
  subject: string;
  teacher: string;
  room: string;
  type: string;
  lessonId: number;
}

export interface GroupedLesson {
  id: string;
  subject: string;
  type: string;
  teacher: string;
  room: string;
  time_start: string;
  time_end: string;
  lesson_number: number;
  hasSubgroups: boolean;
  subgroupVariants?: SubgroupVariant[];
  // Для редактирования - храним все исходные записи
  rawLessons: Lesson[];
}

export function useAdminSchedule(groupId: string | null, weekType: 'even' | 'odd') {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groupedLessons, setGroupedLessons] = useState<GroupedLesson[]>([]);
  const [loading, setLoading] = useState(false);

  // Определяем какую таблицу использовать (lessons или lessons_test)
  const tableName = import.meta.env.VITE_TEST_MODE === 'true' ? 'lessons_test' : 'lessons';

  useEffect(() => {
    if (!groupId) {
      setLessons([]);
      setGroupedLessons([]);
      return;
    }

    loadLessons();
  }, [groupId, weekType]);

  async function loadLessons() {
    if (!groupId) return;

    setLoading(true);
    const dbWeekType = weekType === 'even' ? 'Чет' : 'Неч';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('group_id', groupId)
      .in('week_type', [dbWeekType, 'Обе'])
      .order('day_of_week')
      .order('lesson_number');

    if (error) {
      console.error('Error loading lessons:', error);
      setLoading(false);
      return;
    }

    setLessons(data || []);
    groupLessons(data || []);
    setLoading(false);
  }

  function groupLessons(rawLessons: Lesson[]) {
    // Группируем по дню, номеру пары и времени
    const lessonGroups = new Map<string, Lesson[]>();
    
    rawLessons.forEach((lesson) => {
      const key = `${lesson.day_of_week}-${lesson.lesson_number}-${lesson.time_start}`;
      if (!lessonGroups.has(key)) {
        lessonGroups.set(key, []);
      }
      lessonGroups.get(key)!.push(lesson);
    });

    const grouped: GroupedLesson[] = [];

    lessonGroups.forEach((lessons, key) => {
      // Группируем по предмету, типу, преподавателю и аудитории
      const subjectGroups = new Map<string, Lesson[]>();
      
      lessons.forEach(lesson => {
        const subKey = `${lesson.subject}-${lesson.type}-${lesson.teacher || ''}-${lesson.room || ''}`;
        if (!subjectGroups.has(subKey)) {
          subjectGroups.set(subKey, []);
        }
        subjectGroups.get(subKey)!.push(lesson);
      });

      // Если есть несколько разных вариантов (разные предметы/преподаватели/аудитории)
      if (subjectGroups.size > 1) {
        const allLessons = Array.from(subjectGroups.values()).flat();
        const firstLesson = allLessons[0];
        
        const variants: SubgroupVariant[] = Array.from(subjectGroups.entries()).map(([subKey, group]) => {
          const lesson = group[0];
          const subgroups = [...new Set(group.map(l => l.subgroup))].filter(s => s !== 0);
          
          return {
            subgroup: subgroups[0] || 0,
            subject: lesson.subject,
            teacher: lesson.teacher || 'Не указан',
            room: lesson.room || 'Не указана',
            type: lesson.type,
            lessonId: lesson.id,
          };
        });

        grouped.push({
          id: `group-${key}`,
          subject: 'По подгруппам',
          type: firstLesson.type,
          teacher: '',
          room: '',
          time_start: firstLesson.time_start,
          time_end: firstLesson.time_end,
          lesson_number: firstLesson.lesson_number,
          hasSubgroups: true,
          subgroupVariants: variants,
          rawLessons: allLessons,
        });
      } else {
        // Одно занятие (может быть для всех или для конкретной подгруппы)
        const group = Array.from(subjectGroups.values())[0];
        const lesson = group[0];
        const subgroups = [...new Set(group.map(l => l.subgroup))].filter(s => s !== 0);
        
        let subgroupInfo = '';
        if (subgroups.length > 0 && subgroups.length < 2) {
          subgroupInfo = ` (подгр. ${subgroups.join(', ')})`;
        }

        grouped.push({
          id: lesson.id.toString(),
          subject: lesson.subject + subgroupInfo,
          type: lesson.type,
          teacher: lesson.teacher || 'Не указан',
          room: lesson.room || 'Не указана',
          time_start: lesson.time_start,
          time_end: lesson.time_end,
          lesson_number: lesson.lesson_number,
          hasSubgroups: false,
          rawLessons: group,
        });
      }
    });

    // Сортируем по дню и номеру пары
    grouped.sort((a, b) => {
      const dayA = a.rawLessons[0].day_of_week;
      const dayB = b.rawLessons[0].day_of_week;
      if (dayA !== dayB) return dayA - dayB;
      return a.lesson_number - b.lesson_number;
    });

    setGroupedLessons(grouped);
  }

  function refresh() {
    loadLessons();
  }

  return {
    lessons,
    groupedLessons,
    loading,
    refresh,
  };
}

export interface SubgroupVariant {
  subgroup: number;
  subject: string;
  teacher: string;
  room: string;
  type: 'lecture' | 'seminar' | 'lab' | 'practice';
}

export interface ClassSession {
  id: string;
  subject: string;
  type: 'lecture' | 'seminar' | 'lab' | 'practice';
  teacher: string;
  room: string;
  building: string;
  startTime: string;
  endTime: string;
  color: string;
  // Для занятий с разными вариантами по подгруппам
  hasSubgroups?: boolean;
  subgroupVariants?: SubgroupVariant[];
}

export interface DaySchedule {
  dayIndex: number;
  dayName: string;
  dayShort: string;
  classes: ClassSession[];
}

export interface WeekSchedule {
  weekType: 'even' | 'odd';
  days: DaySchedule[];
}

export interface Group {
  id: string;
  name: string;
  institute: string;
  direction?: string;
  course: number;
  semester: number;
}

export interface Semester {
  name: string;
  type: 'autumn' | 'spring';
  startDate: string;
  endDate: string;
  firstWeekType: 'even' | 'odd';
}

export const SUBJECT_COLORS: Record<string, string> = {
  lecture: 'hsl(199, 85%, 55%)',
  seminar: 'hsl(270, 60%, 60%)',
  lab: 'hsl(152, 60%, 48%)',
  practice: 'hsl(38, 92%, 55%)',
};

export const MOCK_GROUPS: Group[] = [
  { id: '1', name: 'ИУ7-43Б', institute: 'ИУ', course: 2, semester: 4 },
  { id: '2', name: 'ИУ7-44Б', institute: 'ИУ', course: 2, semester: 4 },
  { id: '3', name: 'ИУ5-31Б', institute: 'ИУ', course: 2, semester: 3 },
  { id: '4', name: 'РК6-51Б', institute: 'РК', course: 3, semester: 5 },
  { id: '5', name: 'МТ1-21Б', institute: 'МТ', course: 1, semester: 2 },
  { id: '6', name: 'СМ7-11Б', institute: 'СМ', course: 1, semester: 1 },
  { id: '7', name: 'ИУ7-45Б', institute: 'ИУ', course: 2, semester: 4 },
  { id: '8', name: 'РЛ2-32Б', institute: 'РЛ', course: 2, semester: 3 },
];

export const CURRENT_SEMESTER: Semester = {
  name: 'Весна 2026',
  type: 'spring',
  startDate: '2026-02-02',
  endDate: '2026-06-20',
  firstWeekType: 'odd',
};

const MOCK_CLASSES_ODD: DaySchedule[] = [
  {
    dayIndex: 0, dayName: 'Понедельник', dayShort: 'Пн',
    classes: [
      { id: '1', subject: 'Algorithms & Data Structures', type: 'lecture', teacher: 'Prof. Ivanov A.B.', room: '501', building: 'ГУК', startTime: '08:30', endTime: '10:05', color: SUBJECT_COLORS.lecture },
      { id: '2', subject: 'Operating Systems', type: 'seminar', teacher: 'Dr. Petrov K.L.', room: '305л', building: 'УЛК', startTime: '10:15', endTime: '11:50', color: SUBJECT_COLORS.seminar },
      { id: '3', subject: 'Database Design', type: 'lab', teacher: 'Assoc. Prof. Sidorova M.N.', room: '111', building: 'УЛК', startTime: '12:00', endTime: '13:35', color: SUBJECT_COLORS.lab },
    ],
  },
  {
    dayIndex: 1, dayName: 'Вторник', dayShort: 'Вт',
    classes: [
      { id: '4', subject: 'Linear Algebra', type: 'lecture', teacher: 'Prof. Kuznetsov D.V.', room: '601', building: 'ГУК', startTime: '10:15', endTime: '11:50', color: SUBJECT_COLORS.lecture },
      { id: '5', subject: 'Physics', type: 'practice', teacher: 'Dr. Morozova E.A.', room: '201', building: 'ГУК', startTime: '12:00', endTime: '13:35', color: SUBJECT_COLORS.practice },
    ],
  },
  {
    dayIndex: 2, dayName: 'Среда', dayShort: 'Ср',
    classes: [
      { id: '6', subject: 'English Language', type: 'seminar', teacher: 'Smith J.R.', room: '412', building: 'УЛК', startTime: '08:30', endTime: '10:05', color: SUBJECT_COLORS.seminar },
      { id: '7', subject: 'Algorithms & Data Structures', type: 'lab', teacher: 'Prof. Ivanov A.B.', room: '506л', building: 'УЛК', startTime: '10:15', endTime: '11:50', color: SUBJECT_COLORS.lab },
      { id: '8', subject: 'Computer Architecture', type: 'lecture', teacher: 'Prof. Volkov S.P.', room: '301', building: 'ГУК', startTime: '12:00', endTime: '13:35', color: SUBJECT_COLORS.lecture },
      { id: '9', subject: 'Database Design', type: 'seminar', teacher: 'Assoc. Prof. Sidorova M.N.', room: '111', building: 'УЛК', startTime: '13:50', endTime: '15:25', color: SUBJECT_COLORS.seminar },
    ],
  },
  {
    dayIndex: 3, dayName: 'Четверг', dayShort: 'Чт',
    classes: [
      { id: '10', subject: 'Operating Systems', type: 'lab', teacher: 'Dr. Petrov K.L.', room: '305л', building: 'УЛК', startTime: '10:15', endTime: '11:50', color: SUBJECT_COLORS.lab },
    ],
  },
  {
    dayIndex: 4, dayName: 'Пятница', dayShort: 'Пт',
    classes: [
      { id: '11', subject: 'Physics', type: 'lecture', teacher: 'Dr. Morozova E.A.', room: '501', building: 'ГУК', startTime: '08:30', endTime: '10:05', color: SUBJECT_COLORS.lecture },
      { id: '12', subject: 'Linear Algebra', type: 'practice', teacher: 'Prof. Kuznetsov D.V.', room: '305', building: 'ГУК', startTime: '10:15', endTime: '11:50', color: SUBJECT_COLORS.practice },
      { id: '13', subject: 'Computer Architecture', type: 'lab', teacher: 'Prof. Volkov S.P.', room: '201л', building: 'УЛК', startTime: '12:00', endTime: '13:35', color: SUBJECT_COLORS.lab },
    ],
  },
  { dayIndex: 5, dayName: 'Суббота', dayShort: 'Сб', classes: [] },
  { dayIndex: 6, dayName: 'Воскресенье', dayShort: 'Вс', classes: [] },
];

export const MOCK_WEEK_ODD: WeekSchedule = { weekType: 'odd', days: MOCK_CLASSES_ODD };

export function getCurrentWeekType(semester: Semester): 'even' | 'odd' {
  const start = new Date(semester.startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  if (semester.firstWeekType === 'odd') {
    return diffWeeks % 2 === 0 ? 'odd' : 'even';
  }
  return diffWeeks % 2 === 0 ? 'even' : 'odd';
}

export function getTodayDayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

export function parseTime(time: string): { hours: number; minutes: number } | null {
  if (!time || time === '—') return null;
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) {
    return null;
  }
  return { hours, minutes };
}

/** Нормализует время из БД (HH:MM:SS, ISO и т.д.) в HH:MM для UI. */
export function formatScheduleTime(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—';
  const s = String(value).trim();
  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return '—';
}

export function isCurrentClass(cls: ClassSession, dayIndex?: number): boolean {
  const now = new Date();
  const todayIndex = getTodayDayIndex();
  
  // Всегда проверяем день недели
  // Если dayIndex передан - используем его, иначе считаем что это сегодняшний день
  const checkDayIndex = dayIndex !== undefined ? dayIndex : todayIndex;
  
  // Если это не сегодняшний день - не текущая пара
  if (checkDayIndex !== todayIndex) {
    return false;
  }
  
  const start = parseTime(cls.startTime);
  const end = parseTime(cls.endTime);
  if (!start || !end) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

export function getNextClass(classes: ClassSession[]): ClassSession | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const cls of classes) {
    const start = parseTime(cls.startTime);
    if (!start) continue;
    const startMinutes = start.hours * 60 + start.minutes;
    if (startMinutes > nowMinutes) return cls;
  }
  return null;
}

export function getTimeLeftMinutes(endTime: string): number {
  const now = new Date();
  const end = parseTime(endTime);
  if (!end) return 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = end.hours * 60 + end.minutes;
  return Math.max(0, endMinutes - nowMinutes);
}

export function getClassProgress(cls: ClassSession): number {
  const now = new Date();
  const start = parseTime(cls.startTime);
  const end = parseTime(cls.endTime);
  if (!start || !end) return 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const total = endMinutes - startMinutes;
  const elapsed = nowMinutes - startMinutes;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function getDaySummaryEmoji(classCount: number): string {
  if (classCount === 0) return '🏖️';
  if (classCount <= 2) return '😎';
  if (classCount <= 3) return '📚';
  return '💀';
}

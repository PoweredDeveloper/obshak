import type { ClassSession } from './schedule-data';

export interface Teacher {
  id: string;
  name: string;
  department: string;
  subjects: string[];
  rating: number;
  reviewCount: number;
  photo?: string;
  email?: string;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  groupName: string;
  avatar?: string;
  todayClasses: number;
  totalWeekClasses: number;
  sharedClasses: string[];
}

export const MOCK_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Prof. Ivanov A.B.', department: 'Computer Science', subjects: ['Algorithms & Data Structures'], rating: 4.8, reviewCount: 124 },
  { id: 't2', name: 'Dr. Petrov K.L.', department: 'Computer Science', subjects: ['Operating Systems'], rating: 4.5, reviewCount: 89 },
  { id: 't3', name: 'Assoc. Prof. Sidorova M.N.', department: 'Information Systems', subjects: ['Database Design'], rating: 4.6, reviewCount: 67 },
  { id: 't4', name: 'Prof. Kuznetsov D.V.', department: 'Mathematics', subjects: ['Linear Algebra'], rating: 4.2, reviewCount: 156 },
  { id: 't5', name: 'Dr. Morozova E.A.', department: 'Physics', subjects: ['Physics'], rating: 4.7, reviewCount: 98 },
  { id: 't6', name: 'Smith J.R.', department: 'Linguistics', subjects: ['English Language'], rating: 4.9, reviewCount: 203 },
  { id: 't7', name: 'Prof. Volkov S.P.', department: 'Computer Engineering', subjects: ['Computer Architecture'], rating: 4.3, reviewCount: 112 },
];

export const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Alexei Smirnov', username: '@alexei_s', groupName: 'ИУ7-44Б', todayClasses: 2, totalWeekClasses: 14, sharedClasses: ['Algorithms & Data Structures', 'Linear Algebra'] },
  { id: 'f2', name: 'Maria Volkova', username: '@masha_v', groupName: 'ИУ7-43Б', todayClasses: 3, totalWeekClasses: 16, sharedClasses: ['Algorithms & Data Structures', 'Database Design', 'Physics'] },
  { id: 'f3', name: 'Dmitry Kozlov', username: '@dima_k', groupName: 'ИУ5-31Б', todayClasses: 4, totalWeekClasses: 18, sharedClasses: ['Physics'] },
  { id: 'f4', name: 'Olga Ivanova', username: '@olya_iv', groupName: 'ИУ7-45Б', todayClasses: 1, totalWeekClasses: 12, sharedClasses: ['Linear Algebra', 'English Language'] },
];

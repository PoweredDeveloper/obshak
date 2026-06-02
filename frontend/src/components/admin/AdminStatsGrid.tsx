import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import type { UserStats } from '@/hooks/use-users-stats';
import {
  Users,
  TrendingUp,
  Calendar,
  UserPlus,
  Repeat,
  Ban,
  Bug,
} from 'lucide-react';

export function AdminStatsGrid({ stats }: { stats: UserStats }) {
  const cell = (
    icon: ReactNode,
    value: ReactNode,
    label: string,
    iconWrapClass: string
  ) => (
    <Card className="p-2.5 min-w-[7.25rem] shrink-0 snap-start">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md shrink-0 ${iconWrapClass}`}>{icon}</div>
        <div className="min-w-0 leading-tight">
          <p className="text-base font-bold tabular-nums truncate">{value}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{label}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-5 md:overflow-visible">
      {cell(
        <Users className="w-4 h-4 text-primary" />,
        stats.totalUsers,
        'Всего',
        'bg-primary/10'
      )}
      {cell(
        <TrendingUp className="w-4 h-4 text-green-500" />,
        stats.activeToday,
        'Сегодня',
        'bg-green-500/10'
      )}
      {cell(
        <UserPlus className="w-4 h-4 text-emerald-500" />,
        stats.newUsersToday,
        'Новые за день',
        'bg-emerald-500/10'
      )}
      {cell(
        <Calendar className="w-4 h-4 text-blue-500" />,
        stats.activeWeek,
        'За неделю',
        'bg-blue-500/10'
      )}
      {cell(
        <Calendar className="w-4 h-4 text-orange-500" />,
        stats.activeMonth,
        'За месяц',
        'bg-orange-500/10'
      )}
      {cell(
        <Repeat className="w-4 h-4 text-indigo-500" />,
        `${stats.day1RetentionPct}%`,
        'D+1 retention',
        'bg-indigo-500/10'
      )}
      {cell(
        <Repeat className="w-4 h-4 text-violet-500" />,
        `${stats.week1RetentionPct}%`,
        'W+1 retention',
        'bg-violet-500/10'
      )}
      {cell(
        <Ban className="w-4 h-4 text-red-500" />,
        stats.blockedUsers,
        `Блок (${stats.blockedUsersPct}%)`,
        'bg-red-500/10'
      )}
      {cell(
        <Bug className="w-4 h-4 text-amber-500" />,
        stats.unrecognizedRequests,
        'Нераспозн. запросы',
        'bg-amber-500/10'
      )}
      {cell(
        <Bug className="w-4 h-4 text-rose-500" />,
        stats.botCrashes,
        'Падения бота',
        'bg-rose-500/10'
      )}
    </div>
  );
}

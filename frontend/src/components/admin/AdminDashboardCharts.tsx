import { Card } from '@/components/ui/card';
import type { UserStats } from '@/hooks/use-users-stats';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PRIMARY_STROKE = 'hsl(var(--primary))';
const MUTED_STROKE = 'hsl(var(--muted-foreground) / 0.2)';

function truncateLabel(s: string, max = 14) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

const chartWrap = 'h-[132px] w-full';

export function AdminDashboardCharts({ stats }: { stats: UserStats }) {
  const instituteChart = stats.byInstitute.slice(0, 8).map((r) => ({
    name: truncateLabel(r.institute, 12),
    full: r.institute,
    count: r.count,
  }));

  const groupChart = stats.byGroup.slice(0, 8).map((r) => ({
    name: truncateLabel(r.group_name, 10),
    full: r.group_name,
    count: r.count,
  }));

  const funnel = [
    { name: 'Всего', value: stats.totalUsers },
    { name: 'Сегодня', value: stats.activeToday },
    { name: 'Неделя', value: stats.activeWeek },
    { name: 'Месяц', value: stats.activeMonth },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="p-3">
        <h3 className="font-semibold mb-0.5 text-sm">По институтам (топ-8)</h3>
        <p className="text-xs text-muted-foreground mb-2">Распределение пользователей</p>
        <div className={chartWrap}>
          {instituteChart.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={instituteChart} margin={{ top: 4, right: 4, left: -12, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MUTED_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v, 'Пользователей']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.full ? String(payload[0].payload.full) : ''
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={PRIMARY_STROKE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PRIMARY_STROKE }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="font-semibold mb-0.5 text-sm">Топ групп (топ-8)</h3>
        <p className="text-xs text-muted-foreground mb-2">По числу пользователей в профиле</p>
        <div className={chartWrap}>
          {groupChart.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={groupChart} margin={{ top: 4, right: 4, left: -12, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MUTED_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-18} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v, 'Пользователей']}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.full ? String(payload[0].payload.full) : ''
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={PRIMARY_STROKE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PRIMARY_STROKE }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-3 lg:col-span-2">
        <h3 className="font-semibold mb-0.5 text-sm">Активность (воронка)</h3>
        <p className="text-xs text-muted-foreground mb-2">Всего vs активные по last_active</p>
        <div className={`${chartWrap} max-w-xl`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={funnel} margin={{ top: 4, right: 8, left: -12, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MUTED_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={PRIMARY_STROKE}
                strokeWidth={2}
                dot={{ r: 3, fill: PRIMARY_STROKE }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

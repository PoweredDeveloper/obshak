import { motion } from 'framer-motion';

interface WeekToggleProps {
  weekType: 'even' | 'odd';
  onToggle: () => void;
}

export function WeekToggle({ weekType, onToggle }: WeekToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-card text-sm font-medium transition-colors"
    >
      <motion.div
        className={`absolute inset-0 rounded-full ${weekType === 'even' ? 'bg-even-week-bg' : 'bg-odd-week-bg'}`}
        layoutId="week-bg"
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
      <span className="relative z-10 flex items-center gap-1.5">
        {weekType === 'even' ? (
          <>🔵 <span className="text-even-week font-semibold">Чётная</span></>
        ) : (
          <>🟣 <span className="text-odd-week font-semibold">Нечётная</span></>
        )}
        <span className="text-muted-foreground text-xs">неделя</span>
      </span>
    </button>
  );
}

import { useState, useMemo, useDeferredValue } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, GraduationCap, Sparkles, Loader2 } from 'lucide-react';
import { useGroups } from '@/hooks/use-groups';
import type { Group } from '@/lib/schedule-data';

interface OnboardingProps {
  onComplete: (profile: {
    groupId: string;
    groupName: string;
    institute: string;
    course: number;
    semester: number;
  }) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // Используем useDeferredValue вместо debounce
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [step, setStep] = useState(0);
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Отслеживаем фокус
  
  const { groups, loading, error } = useGroups();

  const filtered = useMemo(() => {
    if (!deferredQuery.trim()) return [];
    return groups
      .filter(g =>
        g.name.toLowerCase().includes(deferredQuery.toLowerCase()) ||
        g.institute.toLowerCase().includes(deferredQuery.toLowerCase())
      )
      .slice(0, 20); // Ограничиваем результаты
  }, [deferredQuery, groups]);

  const institutes = useMemo(() => [...new Set(groups.map(g => g.institute))].sort(), [groups]);
  const instituteGroups = useMemo(
    () => groups.filter(g => g.institute === selectedInstitute).sort((a, b) => a.name.localeCompare(b.name)),
    [selectedInstitute, groups]
  );

  const selectGroup = (group: Group) => {
    // Убираем фокус перед выбором
    setIsSearchFocused(false);
    onComplete({
      groupId: group.id,
      groupName: group.name,
      institute: group.institute,
      course: group.course,
      semester: group.semester,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - компактный при фокусе, но не сразу */}
      <div className={`text-center transition-all duration-200 ${isSearchFocused ? 'pt-4 pb-2' : 'pt-12 pb-6'} px-6`}>
        <div className={`rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-3 transition-all duration-200 ${isSearchFocused ? 'w-10 h-10' : 'w-16 h-16'}`}>
          <GraduationCap className={`text-primary transition-all duration-200 ${isSearchFocused ? 'w-5 h-5' : 'w-8 h-8'}`} />
        </div>
        {!isSearchFocused && (
          <>
            <h1 className="text-xl font-bold text-foreground mb-1">
              Выберите свою группу
            </h1>
            <p className="text-sm text-muted-foreground">
              Найдите свою группу, чтобы увидеть расписание
            </p>
          </>
        )}
      </div>

      {/* Mode toggle - без sticky, проще */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'search' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Умный поиск
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'manual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Выбор вручную
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Загрузка групп...</p>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center px-6"
          >
            <div className="text-center">
              <p className="text-destructive mb-2">Ошибка загрузки групп</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </motion.div>
        ) : mode === 'search' ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 px-6"
          >
            {/* Поиск - простой, без сложных анимаций */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  // Задержка чтобы клик по кнопке успел сработать
                  setTimeout(() => setIsSearchFocused(false), 150);
                }}
                placeholder="Введите название группы (например, 25СЖ01)"
                className="w-full pl-12 pr-4 py-3.5 bg-card rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                style={{ boxShadow: 'var(--shadow-card)' }}
              />
            </div>

            <div className="space-y-2">
              {filtered.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group)}
                  className="w-full schedule-card flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-semibold text-card-foreground">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.institute} · Курс {group.course} · Семестр {group.semester}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
              {query && filtered.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Группы не найдены. Попробуйте другой запрос.
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 px-6"
          >
            {step === 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Выберите институт</p>
                {institutes.map((inst) => (
                  <button
                    key={inst}
                    onClick={() => { setSelectedInstitute(inst); setStep(1); }}
                    className="w-full schedule-card flex items-center justify-between"
                  >
                    <span className="font-semibold text-card-foreground">{inst}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setStep(0)}
                  className="text-sm text-primary font-medium mb-3 flex items-center gap-1"
                >
                  ← Назад к институтам
                </button>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Группы в {selectedInstitute}
                </p>
                {instituteGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => selectGroup(group)}
                    className="w-full schedule-card flex items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-card-foreground">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Курс {group.course} · Семестр {group.semester}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, User, BookOpen, MapPin } from 'lucide-react';
import { MOCK_WEEK_ODD } from '@/lib/schedule-data';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const allClasses = useMemo(
    () => MOCK_WEEK_ODD.days.flatMap(d => d.classes),
    []
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allClasses.filter(
      c =>
        c.subject.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q) ||
        c.room.toLowerCase().includes(q)
    );
  }, [query, allClasses]);

  const uniqueResults = useMemo(() => {
    const seen = new Set<string>();
    return results.filter(c => {
      const key = c.subject + c.teacher + c.room;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [results]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">Search</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Subject, teacher, or room..."
            className="w-full pl-12 pr-4 py-3.5 bg-card rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ boxShadow: 'var(--shadow-card)' }}
          />
        </div>
      </div>

      <div className="px-5 space-y-2">
        {uniqueResults.map((cls, i) => (
          <motion.div
            key={cls.id + i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="schedule-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-card-foreground">{cls.subject}</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{cls.teacher}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cls.room} {cls.building}</span>
            </div>
          </motion.div>
        ))}

        {query && uniqueResults.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">No results found</p>
        )}

        {!query && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Search for subjects, teachers, or rooms</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Initialize theme from storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-6">Настройки</h1>

        <div className="space-y-2">
          {/* Dark mode */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsDark(!isDark)}
            className="w-full schedule-card flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="w-5 h-5 text-accent" />
              ) : (
                <Sun className="w-5 h-5 text-warning" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-card-foreground">Тема</p>
                <p className="text-xs text-muted-foreground">{isDark ? 'Темная' : 'Светлая'}</p>
              </div>
            </div>
            <div
              className={`w-12 h-7 rounded-full p-0.5 transition-colors ${isDark ? 'bg-primary' : 'bg-secondary'}`}
            >
              <motion.div
                className="w-6 h-6 rounded-full bg-card shadow-sm"
                animate={{ x: isDark ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

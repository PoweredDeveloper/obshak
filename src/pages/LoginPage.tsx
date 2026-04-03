import { motion } from 'framer-motion';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { isLoading, error, login } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-8"
      >
        <GraduationCap className="w-12 h-12 text-primary" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-foreground mb-2 text-center"
      >
        Obshak
      </motion.h1>

      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mt-6"
        >
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-muted-foreground">Авторизация...</span>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center max-w-xs"
        >
          <div className="flex items-center justify-center gap-2 text-destructive mb-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Откройте приложение через Telegram бота
          </p>
          <button
            onClick={login}
            className="schedule-card px-6 py-2.5 font-semibold text-card-foreground"
          >
            Попробовать снова
          </button>
        </motion.div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-center mt-6 max-w-xs text-sm"
        >
          Откройте приложение через Telegram бота для входа
        </motion.p>
      )}
    </div>
  );
}

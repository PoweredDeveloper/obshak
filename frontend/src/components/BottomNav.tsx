import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, Users, GraduationCap, User, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeatureFlagState } from '@/hooks/use-app-settings';

type NavItem = { path: string; icon: LucideIcon; label: string };

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enabled: servicesOn, isReady: servicesFlagReady } = useFeatureFlagState('features.services_enabled');

  const navItems = useMemo((): NavItem[] => {
    const showServices = servicesFlagReady && servicesOn;
    return [
      { path: '/', icon: Home, label: 'Сегодня' },
      ...(showServices ? [{ path: '/services', icon: Store, label: 'Услуги' }] : []),
      { path: '/friends', icon: Users, label: 'Избранное' },
      { path: '/teachers', icon: GraduationCap, label: 'Препод.' },
      { path: '/profile', icon: User, label: 'Профиль' },
    ];
  }, [servicesFlagReady, servicesOn]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around max-w-lg mx-auto px-1 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive =
            path === '/services'
              ? location.pathname === '/services' || location.pathname.startsWith('/service/')
              : location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

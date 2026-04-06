import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, GraduationCap, Building2, BookOpen, ChevronRight, LogOut, Settings, Shield, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile } from '@/lib/user-store';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileProps {
  user: UserProfile;
  onChangeGroup: () => void;
  onLogout: () => void;
}

export default function Profile({ user, onChangeGroup, onLogout }: ProfileProps) {
  const navigate = useNavigate();
  const { profile, notifications, isAdmin } = useAuth();

  const initials = profile?.first_name?.[0] + (profile?.last_name?.[0] || '');
  const bugReportNotification = notifications['bug_report'];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-6">Профиль</h1>

        {/* Avatar + name */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="schedule-card flex items-center gap-4 mb-4"
        >
          <Avatar className="w-14 h-14">
            <AvatarImage src={profile?.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials || <User className="w-7 h-7" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-card-foreground text-lg">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.groupName}</p>
          </div>
        </motion.div>

        {/* Info cards */}
        <div className="space-y-2 mb-6">
          {[
            { icon: Building2, label: 'Институт', value: user.institute },
            { icon: GraduationCap, label: 'Курс', value: `${user.course}` },
            { icon: BookOpen, label: 'Семестр', value: `${user.semester}` },
          ].map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="schedule-card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <span className="text-sm font-semibold text-card-foreground">{value}</span>
            </motion.div>
          ))}
        </div>

        {/* Navigation links */}
        <div className="space-y-2 mb-6">
          {isAdmin && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => navigate('/admin')}
              className="w-full schedule-card flex items-center justify-between bg-primary/5 border-primary/20"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Админ-панель</span>
              </div>
              <ChevronRight className="w-5 h-5 text-primary" />
            </motion.button>
          )}

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isAdmin ? 0.2 : 0.15 }}
            onClick={() => navigate('/settings')}
            className="w-full schedule-card flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">Настройки</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          {bugReportNotification?.link && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isAdmin ? 0.25 : 0.2 }}
              onClick={() => {
                if (window.Telegram?.WebApp) {
                  window.Telegram.WebApp.openTelegramLink(bugReportNotification.link!);
                } else {
                  window.open(bugReportNotification.link!, '_blank');
                }
              }}
              className="w-full schedule-card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-card-foreground">{bugReportNotification.text}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isAdmin ? 0.3 : 0.25 }}
            onClick={onChangeGroup}
            className="w-full schedule-card flex items-center justify-between"
          >
            <span className="text-sm font-medium text-primary">Сменить группу</span>
            <ChevronRight className="w-5 h-5 text-primary" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

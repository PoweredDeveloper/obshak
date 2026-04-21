import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MaintenanceMode from "@/components/MaintenanceMode";
import Index from "./pages/Index.tsx";
import WeekView from "./pages/WeekView.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import Profile from "./pages/Profile.tsx";
import FriendsPage from "./pages/FriendsPage.tsx";
import TeachersPage from "./pages/TeachersPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminSchedulePage from "./pages/AdminSchedulePage.tsx";
import AdminUsersPage from "./pages/AdminUsersPage.tsx";
import AdminNotificationsPage from "./pages/AdminNotificationsPage.tsx";
import AdminServicesPage from "./pages/AdminServicesPage.tsx";
import ServiceDetailPage from "./pages/ServiceDetailPage.tsx";

const queryClient = new QueryClient();

// Проверка режима технических работ
const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function AppContent() {
  const { profile, isAuthenticated, isOnboarded, isLoading, updateProfile, logout } = useAuth();
  const location = useLocation();
  
  // Проверяем, находимся ли мы на админской странице
  const isAdminPage = location.pathname.startsWith('/admin');

  // Показываем заглушку техработ (кроме админов)
  if (isMaintenanceMode && !isAdmin) {
    return <MaintenanceMode />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (!isOnboarded) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <Onboarding
              onComplete={async (userProfile) => {
                await updateProfile({
                  group_id: userProfile.groupId,
                  group_name: userProfile.groupName,
                  institute: userProfile.institute,
                  course: userProfile.course,
                  semester: userProfile.semester,
                  onboarded: true,
                });
              }}
            />
          }
        />
      </Routes>
    );
  }

  // Map DB profile to UserProfile for legacy components
  const userProfile = {
    name: profile!.first_name + (profile!.last_name ? ` ${profile!.last_name}` : ''),
    groupId: profile!.group_id || '',
    groupName: profile!.group_name || '',
    institute: profile!.institute || '',
    course: profile!.course || 1,
    semester: profile!.semester || 1,
    onboarded: true,
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/week" element={<WeekView />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/service/:id" element={<ServiceDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<Navigate to="/admin/schedule" replace />} />
        <Route path="/admin/schedule" element={<AdminSchedulePage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/services" element={<AdminServicesPage />} />
        <Route
          path="/profile"
          element={
            <Profile
              user={userProfile}
              onChangeGroup={async () => {
                await updateProfile({ onboarded: false, group_id: null, group_name: null });
              }}
              onLogout={logout}
            />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAdminPage && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

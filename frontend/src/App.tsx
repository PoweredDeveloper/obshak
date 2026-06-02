import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MaintenanceMode from "@/components/MaintenanceMode";

const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const WeekView = lazy(() => import("./pages/WeekView.tsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const FriendsPage = lazy(() => import("./pages/FriendsPage.tsx"));
const TeachersPage = lazy(() => import("./pages/TeachersPage.tsx"));
const ServicesPage = lazy(() => import("./pages/ServicesPage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.tsx"));
const AdminSchedulePage = lazy(() => import("./pages/AdminSchedulePage.tsx"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage.tsx"));
const AdminServicesPage = lazy(() => import("./pages/AdminServicesPage.tsx"));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage.tsx"));

const queryClient = new QueryClient();

const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function PageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const { profile, isAuthenticated, isOnboarded, isLoading, isAdmin, updateProfile, logout } = useAuth();
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin');

  if (isMaintenanceMode && !isAdmin) {
    return <MaintenanceMode />;
  }

  if (isLoading) {
    return <PageFallback />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>
    );
  }

  if (!isOnboarded) {
    return (
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    );
  }

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
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/week" element={<WeekView />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/service/:id" element={<ServiceDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/schedule" element={<AdminSchedulePage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/notifications" element={<Navigate to="/admin" replace />} />
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
    </Suspense>
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

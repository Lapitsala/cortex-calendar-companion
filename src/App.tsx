import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import BottomNav from "@/components/BottomNav";
import ChatPage from "./pages/ChatPage";
import CalendarPage from "./pages/CalendarPage";
import InsightsPage from "./pages/InsightsPage";
import ClassroomPage from "./pages/ClassroomPage";
import SettingsPage from "./pages/SettingsPage";
import GroupsPage from "./pages/GroupsPage";
import SharingPage from "./pages/SharingPage";
import WantToDoPage from "./pages/WantToDoPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading, isPreviewMode } = useAuth();
  const { needsOnboarding, checking } = useOnboardingCheck();

  if (loading || checking) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isPreviewMode) {
    return <Navigate to="/auth" replace />;
  }

  if (needsOnboarding && !isPreviewMode) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/classroom" element={<ClassroomPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/sharing" element={<SharingPage />} />
        <Route path="/want-to-do" element={<WantToDoPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
};

const AuthGate = () => {
  const { user, loading, isPreviewMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user || isPreviewMode) {
    return <Navigate to="/" replace />;
  }

  return <AuthPage />;
};

const OnboardingGate = () => {
  const { user, loading, isPreviewMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isPreviewMode) {
    return <Navigate to="/auth" replace />;
  }

  return <OnboardingPage />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthGate />} />
    <Route path="/onboarding" element={<OnboardingGate />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/*" element={<ProtectedRoutes />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

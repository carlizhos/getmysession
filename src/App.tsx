import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import useDarkMode from "@/hooks/useDarkMode";

// Eager imports — lightweight, needed on first load
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy imports — each becomes its own chunk, loaded on demand
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const AgendaPage = lazy(() => import("./pages/Agenda"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Notes = lazy(() => import("./pages/Notes"));
const Finance = lazy(() => import("./pages/Finance"));
const TestsLibrary = lazy(() => import("./pages/TestsLibrary"));
const PatientTestView = lazy(() => import("./pages/PatientTestView"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Settings = lazy(() => import("./pages/Settings"));
const Consents = lazy(() => import("./pages/Consents"));
const Messages = lazy(() => import("./pages/Messages"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PortalLogin = lazy(() => import("./pages/PortalLogin"));
const Portal = lazy(() => import("./pages/Portal"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const StripeCallback = lazy(() => import("./pages/StripeCallback"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Onboarding = lazy(() => import("./pages/Onboarding"));


const queryClient = new QueryClient();

// Suspense fallback — minimal spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Si el usuario existe pero no ha completado el onboarding, obligarlo a ir.
  if (profile && profile.onboarding_completed === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  useDarkMode(); // Ensure theme is applied globally, including on Auth pages
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Analytics />
          <SpeedInsights />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reservar/:slug" element={<BookingPage />} />
            <Route path="/perfil/:slug" element={<PublicProfile />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <Patients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <AgendaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-assistant"
              element={
                <ProtectedRoute>
                  <AIAssistant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute>
                  <Notes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute>
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute>
                  <Pipeline />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consents"
              element={
                <ProtectedRoute>
                  <Consents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests"
              element={
                <ProtectedRoute>
                  <TestsLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />

            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <HelpCenter />
                </ProtectedRoute>
              }
            />

            {/* Public Patient Routes */}
            <Route path="/t/:token" element={<PatientTestView />} />
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={<Portal />} />

            {/* Public Info Routes */}
            <Route path="/politicas" element={<PrivacyPolicy />} />
            <Route path="/terminos" element={<TermsOfService />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/auth/microsoft/callback" element={<AuthCallback />} />
            <Route path="/auth/zoom/callback" element={<AuthCallback />} />
            <Route path="/auth/stripe/callback" element={<StripeCallback />} />
            <Route path="/auth/v1/verify" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;

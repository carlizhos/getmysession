import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import * as Sentry from "@sentry/react";
import useDarkMode from "@/hooks/useDarkMode";

// Eager imports — lightweight, needed on first load
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Error401 from "./pages/Error401";
import Error402 from "./pages/Error402";
import Error403 from "./pages/Error403";
// Helper to automatically retry lazy loading if a chunk fails (e.g. after a new deployment)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload_ts') || '0', 10);
      const now = Date.now();
      if (now - lastReload > 3000) {
        sessionStorage.setItem('last_chunk_reload_ts', now.toString());
        window.location.reload();
        return new Promise(() => {}); // Keep in pending state while page reloads
      }
      throw error;
    }
  });

// Lazy imports — each becomes its own chunk, loaded on demand with auto-retry
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Patients = lazyWithRetry(() => import("./pages/Patients"));
const AgendaPage = lazyWithRetry(() => import("./pages/Agenda"));
const AIAssistant = lazyWithRetry(() => import("./pages/AIAssistant"));
const Notes = lazyWithRetry(() => import("./pages/Notes"));
const Finance = lazyWithRetry(() => import("./pages/Finance"));
const TestsLibrary = lazyWithRetry(() => import("./pages/TestsLibrary"));
const PatientTestView = lazyWithRetry(() => import("./pages/PatientTestView"));
const Pipeline = lazyWithRetry(() => import("./pages/Pipeline"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Consents = lazyWithRetry(() => import("./pages/Consents"));
const TelehealthSession = lazyWithRetry(() => import("./pages/TelehealthSession"));
const JoinSession = lazyWithRetry(() => import("./pages/JoinSession"));
const Messages = lazyWithRetry(() => import("./pages/Messages"));
const BookingPage = lazyWithRetry(() => import("./pages/BookingPage"));
const PublicProfile = lazyWithRetry(() => import("./pages/PublicProfile"));
const PortalLogin = lazyWithRetry(() => import("./pages/PortalLogin"));
const Portal = lazyWithRetry(() => import("./pages/Portal"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback"));
const StripeCallback = lazyWithRetry(() => import("./pages/StripeCallback"));
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const SubscriptionSuccess = lazyWithRetry(() => import("./pages/SubscriptionSuccess"));


import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

if (typeof window !== 'undefined') {
  const triggerReloadForChunkError = () => {
    const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload_ts') || '0', 10);
    const now = Date.now();
    if (now - lastReload > 3000) {
      sessionStorage.setItem('last_chunk_reload_ts', now.toString());
      window.location.reload();
    }
  };

  // Vite native event when a dynamic chunk import fails
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerReloadForChunkError();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '');
    if (
      reason.includes('Failed to fetch dynamically imported module') ||
      reason.includes('Failed to load module script') ||
      reason.includes('MIME type') ||
      reason.includes('Expected a JavaScript-or-Wasm module script') ||
      reason.includes('404')
    ) {
      triggerReloadForChunkError();
    }
  });
}

class ChunkLoadErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    const errStr = `${error?.name || ''} ${error?.message || ''} ${error?.stack || ''} ${String(error?.cause || '')} ${String(error || '')}`;
    const isChunkLoadFailed =
      /Loading chunk/i.test(errStr) || 
      /Failed to fetch dynamically imported module/i.test(errStr) ||
      /Importing a module script failed/i.test(errStr) ||
      /Failed to load module script/i.test(errStr) ||
      /MIME type/i.test(errStr) ||
      /Unexpected token/i.test(errStr) ||
      /ReferenceError/i.test(errStr) ||
      /is not defined/i.test(errStr);
                              
    if (isChunkLoadFailed) {
      const lastReload = parseInt(sessionStorage.getItem('chunk_last_reload') || '0', 10);
      const now = Date.now();
      if (now - lastReload > 10000) {
        sessionStorage.setItem('chunk_last_reload', now.toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Nueva versión detectada</h3>
              <p className="text-xs text-muted-foreground">Estamos cargando la versión más reciente de la aplicación.</p>
            </div>
            <Button
              onClick={() => {
                sessionStorage.removeItem('chunk_last_reload');
                window.location.reload();
              }}
              variant="default"
              size="sm"
            >
              Cargar actualización
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

import { ProductTourProvider } from '@/contexts/ProductTourContext';

// Inject user context into Sentry for better error reporting
const SentryUserContext = () => {
  const { user, profile } = useAuth();
  
  React.useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: profile?.full_name || undefined,
      });
      if (profile?.organization_id) {
        Sentry.setTag("organization_id", profile.organization_id);
      }
      if (profile?.role) {
        Sentry.setTag("role", profile.role);
      }
    } else {
      Sentry.setUser(null);
    }
  }, [user, profile]);

  return null;
};

// Wrap Routes to extract parametrized routes for transactions (e.g., /reservar/:slug)
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const AppContent = () => {
  useDarkMode(); // Ensure theme is applied globally, including on Auth pages
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ProductTourProvider>
            <SentryUserContext />
          <Analytics />
          <SpeedInsights />
          <ChunkLoadErrorBoundary>
          <Sentry.ErrorBoundary fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3 max-w-md text-center p-6 bg-card rounded-xl border shadow-sm">
                <h2 className="text-xl font-bold">Algo salió mal</h2>
                <p className="text-sm text-muted-foreground">
                  Ha ocurrido un error inesperado. Nuestro equipo técnico ha sido notificado automáticamente y ya está trabajando en solucionarlo.
                </p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                  Recargar la página
                </button>
              </div>
            </div>
          }>
          <Suspense fallback={<PageLoader />}>
          <SentryRoutes>
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
              path="/session/:id"
              element={
                <ProtectedRoute>
                  <TelehealthSession />
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

            <Route
              path="/subscription/success"
              element={
                <ProtectedRoute>
                  <SubscriptionSuccess />
                </ProtectedRoute>
              }
            />

            {/* Public Patient Routes */}
            <Route path="/t/:token" element={<PatientTestView />} />
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/join/:id" element={<JoinSession />} />

            {/* Public Info Routes */}
            <Route path="/politicas" element={<PrivacyPolicy />} />
            <Route path="/terminos" element={<TermsOfService />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/auth/microsoft/callback" element={<AuthCallback />} />
            <Route path="/auth/zoom/callback" element={<AuthCallback />} />
            <Route path="/auth/stripe/callback" element={<StripeCallback />} />
            <Route path="/auth/v1/verify" element={<Navigate to="/" replace />} />
            <Route path="/401" element={<Error401 />} />
            <Route path="/402" element={<Error402 />} />
            <Route path="/403" element={<Error403 />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </SentryRoutes>
          </Suspense>
          </Sentry.ErrorBoundary>
          </ChunkLoadErrorBoundary>
          </ProductTourProvider>
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

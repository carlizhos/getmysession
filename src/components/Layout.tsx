import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Brain,
  FileText,
  DollarSign,
  Moon,
  Sun,
  Menu,
  X,
  Heart,
  Settings,
  LogOut,
  Kanban,
  FileSignature
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useCallback, useEffect } from 'react';
import useDarkMode from '@/hooks/useDarkMode';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import useInactivityTimer from '@/hooks/useInactivityTimer';
import InactivityModal from '@/components/auth/InactivityModal';
import { supabase } from '@/lib/supabase';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  { name: 'IA Asistente', href: '/ai-assistant', icon: Brain },
  { name: 'Notas Clínicas', href: '/notes', icon: FileText },
  { name: 'Consentimientos', href: '/consents', icon: FileSignature },
  { name: 'Finanzas', href: '/finance', icon: DollarSign },
];

interface LayoutProps {
  children: React.ReactNode;
}

const INACTIVITY_SECONDS = 30;
const COUNTDOWN_SECONDS = 30;

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleWarning = useCallback(() => {
    setShowInactivityModal(true);
  }, []);

  const handleTimeout = useCallback(async () => {
    setShowInactivityModal(false);
    await signOut('timeout');
    toast.error('Sesión cerrada por inactividad', { duration: 5000 });
  }, [signOut]);

  const { extendSession } = useInactivityTimer({
    inactivitySeconds: INACTIVITY_SECONDS,
    countdownSeconds: COUNTDOWN_SECONDS,
    onWarning: handleWarning,
    onTimeout: handleTimeout,
  });

  const handleContinueSession = useCallback(async () => {
    setShowInactivityModal(false);
    extendSession();
    if (user) {
      await supabase.from('session_logs').insert({
        user_id: user.id,
        email: user.email ?? '',
        event: 'session_extended',
        user_agent: navigator.userAgent.slice(0, 300),
      });
    }
  }, [extendSession, user]);

  // Contar campos del perfil pendientes por llenar
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, cedula_profesional, especialidad, institucion_formadora')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const fields = [
          data?.full_name,
          data?.cedula_profesional,
          data?.especialidad,
          data?.institucion_formadora,
        ];
        setPendingCount(fields.filter(v => !v || v.trim() === '').length);
      });
  }, [user, location.pathname]); // re-evaluar cuando sale de /settings

  // Tracking de páginas visitadas
  useEffect(() => {
    if (!user) return;
    const PAGE_NAMES: Record<string, string> = {
      '/': 'Dashboard',
      '/patients': 'Pacientes',
      '/pipeline': 'Pipeline',
      '/calendar': 'Calendario',
      '/ai-assistant': 'IA Asistente',
      '/notes': 'Notas Clínicas',
      '/finance': 'Finanzas',
      '/settings': 'Configuración',
    };
    const pageName = PAGE_NAMES[location.pathname] ?? location.pathname;
    supabase.from('page_views').insert({
      user_id: user.id,
      email: user.email ?? '',
      page_path: location.pathname,
      page_name: pageName,
    }).then(({ error }) => {
      if (error) console.warn('[page_views] Error al registrar vista:', error.message);
    });
  }, [location.pathname, user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-300 ease-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">MindCare</h1>
              <p className="text-xs text-muted-foreground">Pro</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-5 w-5 text-warning" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5 text-zen-lavender" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </Button>


            {/* Settings Button */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => {
                setSidebarOpen(false);
                navigate('/settings');
              }}
            >
              <div className="relative">
                <Settings className="h-5 w-5 text-muted-foreground" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span>Configuración</span>
              {pendingCount > 0 && (
                <span className="ml-auto text-[10px] font-medium text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5 leading-none">
                  Incompleto
                </span>
              )}
            </Button>

            {/* User Info */}
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.user_metadata?.full_name || 'Usuario'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Logout Button - At the bottom */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await signOut();
                toast.success('Sesión cerrada correctamente');
              }}
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">MindCare Pro</span>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:min-h-screen lg:p-8">
          {children}
        </main>
      </div>

      {/* Modal HIPAA de inactividad */}
      <InactivityModal
        open={showInactivityModal}
        countdownSeconds={COUNTDOWN_SECONDS}
        onContinue={handleContinueSession}
        onLogout={() => { setShowInactivityModal(false); signOut('logout'); }}
      />
    </div>
  );
};

export default Layout;

import { NavLink, useLocation } from 'react-router-dom';
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
  Kanban,
  FileSignature,
  PanelLeftClose,
  PanelLeftOpen,
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
import AppLauncher from '@/components/AppLauncher';
import UserMenu from '@/components/UserMenu';

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
const COLLAPSED_KEY = 'sidebar_collapsed';

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user, signOut } = useAuth();
  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const handleWarning = useCallback(() => setShowInactivityModal(true), []);
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

  // Pending profile fields badge
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, cedula_profesional, especialidad, institucion_formadora')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const fields = [data?.full_name, data?.cedula_profesional, data?.especialidad, data?.institucion_formadora];
        setPendingCount(fields.filter(v => !v || v.trim() === '').length);
      });
  }, [user, location.pathname]);

  // Page-view tracking
  useEffect(() => {
    if (!user) return;
    const PAGE_NAMES: Record<string, string> = {
      '/': 'Dashboard', '/patients': 'Pacientes', '/pipeline': 'Pipeline',
      '/calendar': 'Calendario', '/ai-assistant': 'IA Asistente',
      '/notes': 'Notas Clínicas', '/finance': 'Finanzas', '/settings': 'Configuración',
    };
    supabase.from('page_views').insert({
      user_id: user.id, email: user.email ?? '',
      page_path: location.pathname,
      page_name: PAGE_NAMES[location.pathname] ?? location.pathname,
    }).then(({ error }) => { if (error) console.warn('[page_views]', error.message); });
  }, [location.pathname, user]);

  const sidebarW = collapsed ? 'w-16' : 'w-64';
  const contentPl = collapsed ? 'lg:pl-16' : 'lg:pl-64';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={cn(
        'fixed top-14 bottom-0 left-0 z-50 transform bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0',
        sidebarW,
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* Mobile close */}
          <div className="flex h-10 items-center justify-end border-b border-sidebar-border px-3 lg:hidden">
            <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation links */}
          <nav className={cn('flex-1 space-y-1 py-4', collapsed ? 'px-2' : 'px-3')}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <div key={item.name} className="relative group/nav">
                  <NavLink
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center rounded-lg transition-all duration-200 overflow-hidden',
                      collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-soft'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    <item.icon className={cn(
                      'flex-shrink-0 transition-colors',
                      collapsed ? 'h-5 w-5' : 'h-5 w-5',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                    )}
                  </NavLink>

                  {/* Tooltip in collapsed mode */}
                  {collapsed && (
                    <div className={cn(
                      'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100]',
                      'rounded-lg bg-popover border border-border px-2.5 py-1.5 shadow-lg',
                      'text-xs font-medium text-popover-foreground whitespace-nowrap',
                      'opacity-0 translate-x-1 group-hover/nav:opacity-100 group-hover/nav:translate-x-0',
                      'transition-all duration-150'
                    )}>
                      {item.name}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Settings link — bottom of sidebar */}
          <div className={cn('border-t border-sidebar-border pt-2 pb-1', collapsed ? 'px-2' : 'px-3')}>
            <div className="relative group/nav">
              <NavLink
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center rounded-lg transition-all duration-200 overflow-hidden',
                  collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-3 py-2.5',
                  location.pathname === '/settings'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-soft'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Settings className={cn(
                    'h-5 w-5 transition-colors',
                    location.pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive text-[7px] font-bold text-white leading-none">
                      {pendingCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">Configuración</span>
                )}
              </NavLink>
              {collapsed && (
                <div className={cn(
                  'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100]',
                  'rounded-lg bg-popover border border-border px-2.5 py-1.5 shadow-lg',
                  'text-xs font-medium text-popover-foreground whitespace-nowrap',
                  'opacity-0 translate-x-1 group-hover/nav:opacity-100 group-hover/nav:translate-x-0',
                  'transition-all duration-150'
                )}>
                  Configuración
                </div>
              )}
            </div>
          </div>

          {/* Collapse toggle — desktop only */}
          <div className={cn(
            'border-sidebar-border py-3 hidden lg:flex',
            collapsed ? 'justify-center px-2' : 'justify-end px-3'
          )}>
            <button
              onClick={toggleCollapsed}
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-150"
            >
              {collapsed
                ? <PanelLeftOpen className="h-4 w-4" />
                : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-[60] h-14 flex items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <AppLauncher />
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2 lg:justify-start">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Heart className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">MindCare Pro</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={toggleDarkMode} title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}>
            {isDarkMode ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-zen-lavender" />}
          </Button>

          <UserMenu pendingCount={pendingCount} />
        </div>
      </header>

      {/* Main content */}
      <div className={cn('pt-14 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]', contentPl)}>
        <main className="min-h-[calc(100vh-3.5rem)] p-4 lg:p-8">
          {children}
        </main>
      </div>

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

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
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  BrainCircuit,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import NotificationBell from '@/components/notifications/NotificationBell';
import MessageBell from '@/components/notifications/MessageBell';
import { useOrganization } from '@/hooks/useOrganization';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'IA Asistente', href: '/ai-assistant', icon: Brain },
  { name: 'Notas Clínicas', href: '/notes', icon: FileText },
  { name: 'Pruebas', href: '/tests', icon: BrainCircuit },
  { name: 'Consentimientos', href: '/consents', icon: FileSignature },
  { name: 'Finanzas', href: '/finance', icon: DollarSign },
  { name: 'WhatsApp', href: '/messages', icon: MessageCircle },
];

interface LayoutProps {
  children: React.ReactNode;
}

const INACTIVITY_SECONDS = 300;
const COUNTDOWN_SECONDS = 30;
const COLLAPSED_KEY = 'sidebar_collapsed';

const Layout = ({ children }: LayoutProps) => {
    const { organization } = useOrganization();
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadWa, setUnreadWa] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      .select('full_name, avatar_url, cedula_profesional, especialidad, institucion_formadora')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const fields = [data?.full_name, data?.cedula_profesional, data?.especialidad, data?.institucion_formadora];
        setPendingCount(fields.filter(v => !v || v.trim() === '').length);
        setAvatarUrl(data?.avatar_url || null);
      });
  }, [user, location.pathname]);

  // Unread WhatsApp messages count
  useEffect(() => {
    if (!organization?.id) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('direction', 'inbound')
        .is('read_at', null);
      setUnreadWa(count || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel('wa-unread-sidebar')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `organization_id=eq.${organization.id}`,
      }, () => { fetchUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organization?.id]);

  // Page-view tracking
  useEffect(() => {
    if (!user) return;
    const PAGE_NAMES: Record<string, string> = {
      '/': 'Dashboard', '/patients': 'Pacientes', '/pipeline': 'Pipeline',
      '/agenda': 'Agenda', '/ai-assistant': 'IA Asistente',
      '/notes': 'Notas Clínicas', '/finance': 'Finanzas', '/settings': 'Configuración',
    };
    supabase.from('page_views').insert({
      user_id: user.id, email: user.email ?? '',
      page_path: location.pathname,
      page_name: PAGE_NAMES[location.pathname] ?? location.pathname,
    }).then(({ error }) => { if (error) console.warn('[page_views]', error.message); });
  }, [location.pathname, user]);

  const sidebarW = collapsed ? 'w-16' : 'w-52';
  const contentPl = collapsed ? 'lg:pl-24' : 'lg:pl-[calc(13rem+2rem)]';

  return (
    <div className="min-h-screen bg-transparent">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={cn(
        'fixed z-40 transform transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:translate-x-0',
        'backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/5 shadow-soft rounded-[24px]',
        'top-14 bottom-0 left-0 lg:top-[5.25rem] lg:bottom-4 lg:left-4',
        sidebarW,
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* Sidebar Header (Mobile: Close only) */}
          <div className="flex h-12 items-center px-3 border-b border-white/10 lg:hidden">
            <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Floating Desktop Toggle (Aligned with Dashboard - "por fuera") */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={cn(
                "absolute -right-3 top-24 hidden lg:flex h-6 w-6 items-center justify-center rounded-full",
                "border border-border bg-background shadow-md hover:bg-muted text-muted-foreground/60 hover:text-foreground",
                "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] z-50 group/toggle"
            )}
          >
            {collapsed ? (
                <PanelLeftOpen className="h-3 w-3 transition-transform group-active/toggle:scale-95" />
            ) : (
                <PanelLeftClose className="h-3 w-3 transition-transform group-active/toggle:scale-95" />
            )}
          </button>

          {/* Navigation links */}
          <nav className={cn('flex-1 space-y-1.5', collapsed ? 'px-2 py-5' : 'px-3 py-5')}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <div key={item.name} className="relative group/nav">
                  <NavLink
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center rounded-xl transition-all duration-200 overflow-hidden',
                      collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-4 py-2.5',
                      isActive
                        ? 'bg-primary text-white shadow-[0_4px_16px_-3px_rgba(129,159,157,0.35)]'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                    )}
                  >
                    <item.icon className={cn(
                      'flex-shrink-0 transition-colors',
                      collapsed ? 'h-5 w-5' : 'h-5 w-5',
                      isActive ? 'text-white' : 'text-muted-foreground',
                      item.name === 'WhatsApp' && isActive && 'text-white'
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium whitespace-nowrap flex-1">{item.name}</span>
                    )}
                    {!collapsed && item.name === 'WhatsApp' && unreadWa > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-success text-[10px] font-bold text-white px-1">
                        {unreadWa > 99 ? '99+' : unreadWa}
                      </span>
                    )}
                    {collapsed && item.name === 'WhatsApp' && unreadWa > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[8px] font-bold text-white">
                        {unreadWa > 9 ? '9+' : unreadWa}
                      </span>
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
          <div className={cn('border-t border-white/15 dark:border-white/5 pt-4 pb-6 mt-auto', collapsed ? 'px-2' : 'px-3')}>
            <div className="relative group/nav">
              <NavLink
                to="/settings"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center rounded-xl transition-all duration-200 overflow-hidden',
                  collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-4 py-2.5',
                  location.pathname === '/settings'
                    ? 'bg-primary text-white shadow-[0_4px_16px_-3px_rgba(129,159,157,0.35)]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Settings className={cn(
                    'h-5 w-5 transition-colors',
                    location.pathname === '/settings' ? 'text-white' : 'text-muted-foreground'
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
        </div>
      </aside>

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className={cn(
        "fixed top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4 right-2 sm:right-3 lg:right-4 z-40 h-14 flex items-center justify-between gap-2 sm:gap-4",
        "border border-white/20 dark:border-white/5 backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 px-3 sm:px-4 shadow-soft rounded-[16px] sm:rounded-[20px]"
      )}>
        {/* Left: Brand */}
        <div className="flex items-center gap-2 w-max">
          <AppLauncher />
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90 leading-none">Saudade</span>
          <Button variant="ghost" size="icon-sm" className="lg:hidden ml-1" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Center: Search Bar (Hidden on mobile) */}
        <div className="flex-1 hidden md:flex justify-center max-w-2xl">
          <div className="relative w-full max-w-md group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground/70 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md outline-none transition-all",
                "focus:bg-white/20 focus:border-primary/30 focus:ring-4 focus:ring-primary/10 text-sm placeholder:text-muted-foreground/60"
              )}
            />
            <div className="absolute inset-y-0 right-3 hidden sm:flex items-center">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 w-1/4 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={toggleDarkMode} title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'} className="hidden sm:inline-flex">
            {isDarkMode ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-zen-lavender" />}
          </Button>

          <MessageBell count={2} />
          <NotificationBell />
          
          <div className="w-px h-6 bg-white/20 mx-1 lg:mx-2" />
          
          <UserMenu avatarUrl={avatarUrl} />
        </div>
      </header>

      {/* Main content — Glassmorphism card container */}
      <div className={cn('transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]', contentPl)}>
        <main className="min-h-screen p-2 sm:p-3 lg:p-4 flex flex-col pt-14 lg:pt-[5.25rem]">
          <div className="flex-1 backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 rounded-[18px] sm:rounded-[24px] border border-white/30 dark:border-white/5 shadow-elevated p-4 sm:p-6 lg:p-8">
            {children}
          </div>
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

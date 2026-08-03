import { NavLink, useLocation } from 'react-router-dom';
import SubscriptionBanner from '@/components/subscription/SubscriptionBanner';
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
  CheckSquare,
  ChevronDown,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  BrainCircuit,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  Activity,
  TrendingUp,
  Paperclip,
  User,
  Sparkles
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
import { useProductTour } from '@/contexts/ProductTourContext';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { useOrganization } from '@/hooks/useOrganization';
import HelpWidget from '@/components/HelpWidget';
import SystemAgentWidget from '@/components/ai/SystemAgentWidget';
import CommandPalette from '@/components/CommandPalette';
import PricingModal from '@/components/subscription/PricingModal';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const navigationGroups = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Pacientes', href: '/patients', icon: Users },
      { name: 'Agenda', href: '/agenda', icon: Calendar },
    ]
  },
  {
    label: 'Clínica & IA',
    items: [
      { name: 'Asistente IA', href: '/ai-assistant', icon: Brain },
      { name: 'Notas Clínicas', href: '/notes', icon: FileText },
      { name: 'Pruebas', href: '/tests', icon: BrainCircuit },
      { name: 'Consentimientos', href: '/consents', icon: FileSignature },
    ]
  },
  {
    label: 'Administración y Soporte',
    items: [
      { name: 'Finanzas', href: '/finance', icon: DollarSign },
      { name: 'WhatsApp', href: '/messages', icon: MessageCircle },
      { name: 'Centro de Ayuda', href: '/help', icon: HelpCircle },
    ]
  }
];


interface LayoutProps {
  children: React.ReactNode;
  activePatient?: { id: string; name: string };
  activePatientTab?: string;
  onPatientTabChange?: (tab: string) => void;
}

const INACTIVITY_SECONDS = 300;
const COUNTDOWN_SECONDS = 30;
const COLLAPSED_KEY = 'sidebar_collapsed';

const Layout = ({ children, activePatient, activePatientTab, onPatientTabChange }: LayoutProps) => {
  useOfflineSync();
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
  const { startTour, hasTourForModule } = useProductTour();

  const getModuleKey = (pathname: string) => {
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/patients')) return 'patients';
    if (pathname.startsWith('/agenda')) return 'agenda';
    if (pathname.startsWith('/finance')) return 'finance';
    if (pathname.startsWith('/ai-assistant')) return 'aiAssistant';
    if (pathname.startsWith('/notes')) return 'notes';
    if (pathname.startsWith('/tests')) return 'tests';
    if (pathname.startsWith('/consents')) return 'consents';
    if (pathname.startsWith('/messages')) return 'messages';
    if (pathname.startsWith('/settings')) return 'settings';
    return '';
  };
  const moduleKey = getModuleKey(location.pathname);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [badgesSettled, setBadgesSettled] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [canShowBadges, setCanShowBadges] = useState(false);

  // Synchronize badges: Start timers once on mount
  useEffect(() => {
    // 1. Wait a moment for data fetching (NotificationBell) to be ready
    const showTimer = setTimeout(() => {
      setCanShowBadges(true);
    }, 1000);

    // 2. Settle all badges in unison after 10s
    const settleTimer = setTimeout(() => {
      setBadgesSettled(true);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(settleTimer);
    };
  }, []);

  // ⌘K / Ctrl+K — Open Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smart Header Logic: Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY) {
        setShowHeader(false); // Scrolling down
      } else {
        setShowHeader(true); // Scrolling up
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch (A5)
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch(e) { console.warn("Audio error:", e) }
    };

    const channel = supabase
      .channel('wa-unread-sidebar')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `organization_id=eq.${organization.id}`,
      }, (payload: any) => { 
        if (payload.eventType === 'INSERT' && payload.new?.direction === 'inbound') {
          playNotificationSound();
        }
        fetchUnread(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organization?.id]);

  // Page-view tracking
  useEffect(() => {
    if (!user) return;
    const PAGE_NAMES: Record<string, string> = {
      '/': 'Dashboard', '/patients': 'Pacientes', '/pipeline': 'Pipeline',
      '/agenda': 'Agenda', '/ai-assistant': 'Asistente IA',
      '/notes': 'Notas Clínicas', '/finance': 'Finanzas', '/settings': 'Configuración',
    };
    supabase.from('page_views').insert({
      user_id: user.id, email: user.email ?? '',
      page_path: location.pathname,
      page_name: PAGE_NAMES[location.pathname] ?? location.pathname,
    }).then(({ error }) => { if (error) console.warn('[page_views]', error.message); });
  }, [location.pathname, user]);

  const sidebarW = collapsed ? 'w-16' : 'w-64';
  const contentPl = collapsed ? 'lg:pl-24' : 'lg:pl-[calc(16rem+2rem)]';
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
        'fixed z-50 transform transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:z-40 lg:translate-x-0',
        'backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/20 dark:border-white/5 shadow-soft rounded-[24px]',
        'top-[4.5rem] bottom-2 left-2 lg:top-[5.25rem] lg:bottom-4 lg:left-4',
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
          <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden pb-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]', collapsed ? 'px-2 py-5' : 'px-3 py-5')}>
            {navigationGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1.5">
                {!collapsed && (
                  <div className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 mt-2">
                    {group.label}
                  </div>
                )}
                {collapsed && groupIdx > 0 && (
                  <div className="w-8 h-px bg-border/50 mx-auto my-4" />
                )}
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <div key={item.name} className="relative group/nav">
                      <NavLink
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center rounded-xl transition-all duration-300 overflow-hidden relative',
                          collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-3 px-4 py-2.5 hover:translate-x-1',
                          isActive
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                      >
                        {isActive && !collapsed && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-r-full" />
                        )}
                        <item.icon className={cn(
                          'flex-shrink-0 transition-colors z-10',
                          collapsed ? 'h-5 w-5' : 'h-5 w-5',
                          isActive ? 'text-white drop-shadow-sm' : 'text-muted-foreground group-hover/nav:text-primary/70',
                          item.name === 'WhatsApp' && isActive && 'text-white'
                        )} />
                        {!collapsed && (
                          <span className="text-sm font-medium whitespace-nowrap flex-1 z-10">{item.name}</span>
                        )}
                        {!collapsed && item.name === 'WhatsApp' && unreadWa > 0 && canShowBadges && (
                          <NotificationBadge 
                            count={unreadWa} 
                            className="ml-auto bg-success shadow-success/40" 
                            forceSettled={badgesSettled}
                            delay={10000}
                          />
                        )}
                        {collapsed && item.name === 'WhatsApp' && unreadWa > 0 && canShowBadges && (
                          <NotificationBadge 
                            count={unreadWa} 
                            className="absolute -top-1 -right-1 bg-success shadow-success/40" 
                            forceSettled={badgesSettled}
                            delay={10000}
                          />
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
              </div>
            ))}
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
                  {pendingCount > 0 && canShowBadges && (
                    <NotificationBadge 
                      count={pendingCount} 
                      className="absolute -top-1 -right-1 bg-destructive shadow-destructive/40" 
                      forceSettled={badgesSettled}
                      delay={10000}
                    />
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

      {/* Premium Fade — Solo se activa al hacer scroll para no ensuciar el estado inicial */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-[35] h-12 pointer-events-none bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-transparent dark:from-slate-950/90 dark:via-slate-950/40 dark:to-transparent transition-opacity duration-500",
        lastScrollY > 10 ? "opacity-100" : "opacity-0"
      )} />

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className={cn(
        "fixed top-2 sm:top-3 lg:top-4 left-2 sm:left-3 lg:left-4 right-2 sm:right-3 lg:right-4 z-40 h-14 flex items-center justify-between gap-2 sm:gap-4",
        "border border-white/20 dark:border-white/5 backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 px-3 sm:px-4 shadow-soft rounded-[16px] sm:rounded-[20px]",
        "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        showHeader ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0"
      )}>
        {/* Left: Brand */}
        <div className="flex items-center gap-2 w-max">
          {/* <AppLauncher /> - Ocultado temporalmente por solicitud del usuario */}
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground/90 leading-none">Saudade</span>
          <Button variant="ghost" size="icon-sm" className="lg:hidden ml-1" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Center: Search Trigger (Opens Command Palette) */}
        <div className="flex-1 hidden md:flex justify-center max-w-2xl">
          <button
            onClick={() => setCommandOpen(true)}
            className={cn(
              "relative w-full max-w-md h-10 pl-10 pr-4 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md outline-none transition-all",
              "hover:bg-white/20 hover:border-primary/20 focus:bg-white/20 focus:border-primary/30 focus:ring-4 focus:ring-primary/10",
              "text-sm text-muted-foreground/60 text-left cursor-pointer group"
            )}
          >
            <div className="absolute inset-y-0 left-3 flex items-center">
              <Search className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
            </div>
            <span>Buscar...</span>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 w-auto justify-end">
          {hasTourForModule(moduleKey) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startTour(moduleKey)}
              title="Iniciar Recorrido Guiado de este módulo"
              className="gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-all duration-200"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="hidden md:inline">Recorrido Guiado</span>
            </Button>
          )}
          <MessageBell count={unreadWa} forceSettled={badgesSettled} canShow={canShowBadges} />
          <NotificationBell forceSettled={badgesSettled} canShow={canShowBadges} />
          
          <div className="w-px h-6 bg-white/20 mx-1 lg:mx-2" />
          
          <UserMenu avatarUrl={avatarUrl} />
        </div>
      </header>

      {/* Subscription Banner */}
      <div className={cn('transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] fixed top-14 lg:top-16 left-0 right-0 z-40', contentPl)}>
        <SubscriptionBanner />
      </div>

      {/* Main content — Glassmorphism card container */}
      <div className={cn('transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]', contentPl)}>
        <main className="min-h-screen p-2 sm:p-3 lg:p-4 flex flex-col pt-20 lg:pt-[5.25rem]">
          <div className="flex-1 backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 rounded-[18px] sm:rounded-[24px] border border-white/30 dark:border-white/5 shadow-elevated p-4 sm:p-6 lg:p-8">
            {children}

            {/* Footer Information */}
            <footer className="mt-12 pt-8 border-t border-border/50 flex flex-col gap-6 text-[10px] sm:text-xs text-muted-foreground/60 font-medium">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 uppercase tracking-widest">
                <p>© {new Date().getFullYear()} Saudade · Todos los derechos reservados</p>
                <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                  <a 
                    href="/politicas" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    Políticas de uso
                  </a>
                  <a 
                    href="/terminos" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    Términos y condiciones
                  </a>
                </div>
              </div>
              <div className="text-center sm:text-left text-[9px] sm:text-[10px] opacity-70 max-w-5xl leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/30">
                <strong>Aviso Regulatorio (NOM-024):</strong> Saudade desarrolla su infraestructura y funcionalidades de expediente clínico en estricto apego y alineación a los lineamientos y estándares tecnológicos de la NOM-024-SSA3-2012 (Sistemas de Información de Registro Electrónico para la Salud), promoviendo las mejores prácticas de privacidad, seguridad e interoperabilidad. Se hace de conocimiento que Saudade no cuenta actualmente con la certificación oficial emitida por la Dirección General de Información en Salud (DGIS).
              </div>
            </footer>
          </div>
        </main>
      </div>

      <InactivityModal
        open={showInactivityModal}
        countdownSeconds={COUNTDOWN_SECONDS}
        onContinue={handleContinueSession}
        onLogout={() => { setShowInactivityModal(false); signOut('logout'); }}
      />

      {/* Floating Help Widget — available on every page */}
      <HelpWidget />

      {/* Floating AI System Agent — Ocultado temporalmente por solicitud del usuario */}
      {/* <SystemAgentWidget /> */}

      {/* Global Command Palette (⌘K) */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Global Pricing Modal */}
      <PricingModal />
    </div>
  );
};

export default Layout;

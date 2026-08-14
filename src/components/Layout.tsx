import { NavLink, useLocation } from 'react-router-dom';
import SubscriptionBanner from '@/components/subscription/SubscriptionBanner';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Brain,
  FileText,
  DollarSign,
  Menu,
  X,
  Settings,
  FileSignature,
  Search,
  BrainCircuit,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  User,
  Sparkles,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useState, useCallback, useEffect } from 'react';
import useDarkMode from '@/hooks/useDarkMode';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import useInactivityTimer from '@/hooks/useInactivityTimer';
import InactivityModal from '@/components/auth/InactivityModal';
import { supabase } from '@/lib/supabase';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessageBell from '@/components/notifications/MessageBell';
import { useProductTour } from '@/contexts/ProductTourContext';
import NotificationBadge from '@/components/ui/NotificationBadge';
import { useOrganization } from '@/hooks/useOrganization';
import HelpWidget from '@/components/HelpWidget';
import CommandPalette from '@/components/CommandPalette';
import PricingModal from '@/components/subscription/PricingModal';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Agenda', href: '/agenda', icon: Calendar },
  { name: 'Asistente IA', href: '/ai-assistant', icon: Brain },
  { name: 'Notas Clínicas', href: '/notes', icon: FileText },
  { name: 'Pruebas', href: '/tests', icon: BrainCircuit },
  { name: 'Consentimientos', href: '/consents', icon: FileSignature },
  { name: 'Finanzas', href: '/finance', icon: DollarSign },
  { name: 'WhatsApp', href: '/messages', icon: MessageCircle },
  { name: 'Centro de Ayuda', href: '/help', icon: HelpCircle },
];

interface LayoutProps {
  children: React.ReactNode;
  activePatient?: { id: string; name: string };
  activePatientTab?: string;
  onPatientTabChange?: (tab: string) => void;
}

const INACTIVITY_SECONDS = 300;
const COUNTDOWN_SECONDS = 30;

const Layout = ({ children, activePatient, activePatientTab, onPatientTabChange }: LayoutProps) => {
  useOfflineSync();
  const { organization } = useOrganization();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [showNomModal, setShowNomModal] = useState(false);
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
    if (pathname.startsWith('/notifications')) return 'notifications';
    if (pathname.startsWith('/consents')) return 'consents';
    if (pathname.startsWith('/messages')) return 'messages';
    if (pathname.startsWith('/settings')) return 'settings';
    return '';
  };
  const moduleKey = getModuleKey(location.pathname);
  
  const [badgesSettled, setBadgesSettled] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [canShowBadges, setCanShowBadges] = useState(false);

  // Synchronize badges: Start timers once on mount
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setCanShowBadges(true);
    }, 1000);

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
        osc.frequency.setValueAtTime(880, ctx.currentTime);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e2e8f0] via-[#f3e8ff] to-[#fce7f3] dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Canva-style Dual Sidebar ────────────────────────────────────────── */}
      
      {/* 1. Thin Rail (Always visible on Desktop) */}
      <aside className="fixed z-50 h-screen flex-col items-center py-4 bg-transparent hidden lg:flex w-[72px] left-0 top-0 bottom-0 border-r border-slate-200/50 dark:border-slate-800/50">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-300 mb-4"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-sm shrink-0 mb-4">
          <img src="/icono.jpg" alt="Logo" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>

        <NavLink to="/agenda" className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 mb-6">
          <Plus className="w-5 h-5 shrink-0" />
        </NavLink>

        <nav className="flex-1 flex flex-col items-center gap-2 overflow-y-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center h-[52px] w-[60px] rounded-lg relative group transition-all',
                  isActive ? 'bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'
                )}
                title={item.name}
              >
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-slate-900 dark:text-white' : 'group-hover:text-slate-800 dark:group-hover:text-slate-300')} />
                  {item.name === 'WhatsApp' && unreadWa > 0 && canShowBadges && (
                    <NotificationBadge count={unreadWa} className="absolute -top-1.5 -right-1.5 bg-red-500 scale-75 origin-top-right" forceSettled={badgesSettled} delay={10000} />
                  )}
                </div>
                <span className={cn("text-[9px] mt-1 text-center w-full truncate px-1", isActive ? "font-bold" : "font-medium")}>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-2 w-full pt-4">
          <NavLink to="/settings" className={cn('flex flex-col items-center justify-center h-[52px] w-[60px] rounded-lg relative group transition-all', location.pathname === '/settings' ? 'bg-black/5 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10')} title="Ajustes">
            <div className="relative">
              <Settings className={cn('h-5 w-5', location.pathname === '/settings' ? 'text-slate-900 dark:text-white' : 'group-hover:text-slate-800 dark:group-hover:text-slate-300')} />
              {pendingCount > 0 && canShowBadges && <NotificationBadge count={pendingCount} className="absolute -top-1.5 -right-1.5 bg-red-500 scale-75 origin-top-right" forceSettled={badgesSettled} delay={10000} />}
            </div>
            <span className="text-[9px] mt-1 font-medium">Ajustes</span>
          </NavLink>
        </div>
      </aside>

      {/* 2. Submenu Panel (Slides out next to the Rail) */}
      <aside className={cn(
        'fixed z-40 h-screen flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
        'top-0 bottom-0 left-0 lg:left-[72px] w-[260px]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-4 lg:hidden">
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100 logo-font">GetMySession</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="px-4 pt-6 pb-2 hidden lg:block">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Menú Principal</h2>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                )}
              >
                <div className="relative flex shrink-0">
                  <item.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-violet-600 dark:text-violet-400' : '')} />
                  {item.name === 'WhatsApp' && unreadWa > 0 && canShowBadges && (
                    <NotificationBadge count={unreadWa} className="absolute -top-1 -right-1 bg-red-500 shadow-red-500/40" forceSettled={badgesSettled} delay={10000} />
                  )}
                </div>
                <span className={cn('text-sm truncate', isActive ? 'font-semibold' : 'font-medium')}>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content Area ──────────────── */}
      <div className={cn(
        "flex-1 flex flex-col h-screen overflow-hidden lg:py-2 lg:pr-2 transition-all duration-300",
        "lg:pl-[72px]"
      )}>
        
        {/* Rounded white content container — exactly like Canva */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1b26] lg:rounded-[12px] shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.2)] overflow-y-auto overflow-x-hidden relative">

          {/* Floating Top Actions inside content area */}
          <div className="sticky top-0 z-30 flex items-center justify-between lg:justify-end px-4 sm:px-6 py-4 bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-md">
            
            {/* Mobile Header (only visible on mobile) */}
            <div className="flex items-center gap-3 lg:hidden">
              <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <span className="font-bold tracking-tight text-slate-800 dark:text-slate-100">GetMySession</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Compact Search Trigger */}
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Buscar (⌘K)"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
              </button>

              {hasTourForModule(moduleKey) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTour(moduleKey)}
                  title="Iniciar Recorrido Guiado"
                  className="gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-all duration-200 hidden sm:flex h-10 rounded-full px-4"
                >
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span>Recorrido</span>
                </Button>
              )}
              
              <div className="flex items-center gap-1">
                <MessageBell count={unreadWa} forceSettled={badgesSettled} canShow={canShowBadges} />
                <NotificationBell forceSettled={badgesSettled} canShow={canShowBadges} />
              </div>
              
              <div className="ml-1 sm:ml-2">
                <UserMenu avatarUrl={avatarUrl} />
              </div>
            </div>
          </div>

          {/* Subscription Banner */}
          <div className="w-full z-20 px-4 sm:px-6">
            <SubscriptionBanner />
          </div>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:px-10 lg:py-6 flex flex-col">
          <div className="flex-1 w-full max-w-[1400px] mx-auto">
            {children}
          </div>

          {/* Footer Information */}
          <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-4 text-[11px] text-muted-foreground font-medium max-w-7xl mx-auto w-full pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} GetMySession. Todos los derechos reservados.</p>
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
                <button
                  onClick={() => setShowNomModal(true)}
                  className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-primary/80"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Aviso Regulatorio (NOM-024)</span>
                </button>
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
          </footer>
        </main>
        </div> {/* End rounded content container */}
      </div>

      {/* Modal de Aviso Regulatorio NOM-024 */}
      <Dialog open={showNomModal} onOpenChange={setShowNomModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-[#1e1e2e]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Aviso Regulatorio (NOM-024)</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Cumplimiento normativo y marco de registro clínico electrónico
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <p>
              <strong>Aviso Regulatorio (NOM-024):</strong> GetMySession desarrolla su infraestructura y funcionalidades de expediente clínico en estricto apego y alineación a los lineamientos y estándares tecnológicos de la <strong>NOM-024-SSA3-2012</strong> (Sistemas de Información de Registro Electrónico para la Salud), promoviendo las mejores prácticas de privacidad, seguridad e interoperabilidad.
            </p>
            <p>
              Se hace de conocimiento que GetMySession no cuenta actualmente con la certificación oficial emitida por la Dirección General de Información en Salud (DGIS).
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="default" onClick={() => setShowNomModal(false)} className="rounded-lg px-6 font-semibold">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InactivityModal
        open={showInactivityModal}
        countdownSeconds={COUNTDOWN_SECONDS}
        onContinue={handleContinueSession}
        onLogout={() => { setShowInactivityModal(false); signOut('logout'); }}
      />

      {/* Floating Help Widget */}
      <HelpWidget />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Global Pricing Modal */}
      <PricingModal />
    </div>
  );
};

export default Layout;

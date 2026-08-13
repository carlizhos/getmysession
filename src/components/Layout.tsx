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
    <div className="min-h-screen bg-white dark:bg-[#1e1e2e] flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Canva-style Sidebar ──────────────────────────────────────────────── */}
      <aside className={cn(
        'fixed z-50 lg:z-40 h-full flex flex-col',
        'bg-white dark:bg-[#1e1e2e] border-r border-gray-200 dark:border-gray-800',
        'top-0 bottom-0 left-0 transition-transform duration-300',
        'w-[240px] lg:w-[72px]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Mobile close button */}
          <div className="flex h-12 items-center justify-end px-3 lg:hidden">
            <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Top Logo */}
          <div className="pt-4 pb-4 flex flex-col items-center gap-4">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800 shrink-0">
              <img src="/icono.jpg" alt="Logo" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>

            {/* Prominent Create Button */}
            <NavLink
              to="/agenda"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-primary/80 text-white shadow-md hover:shadow-lg transition-all hover:scale-105 shrink-0"
              title="Crear nueva cita"
            >
              <Plus className="w-5 h-5" />
            </NavLink>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-6 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center transition-all duration-200 relative',
                    'lg:flex-col lg:justify-center lg:h-14 lg:w-[60px] lg:mx-auto lg:rounded-lg',
                    'flex-row gap-3 px-4 py-3 rounded-lg',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10'
                  )}
                >
                  <div className="relative flex shrink-0 items-center justify-center">
                    <item.icon className={cn(
                      'transition-colors',
                      'h-[22px] w-[22px] lg:h-5 lg:w-5',
                      isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                    )} />
                    {item.name === 'WhatsApp' && unreadWa > 0 && canShowBadges && (
                      <NotificationBadge 
                        count={unreadWa} 
                        className="absolute -top-1.5 -right-1.5 bg-success shadow-success/40 scale-75 lg:scale-90 origin-top-right" 
                        forceSettled={badgesSettled}
                        delay={10000}
                      />
                    )}
                  </div>
                  <span className={cn(
                    'whitespace-nowrap transition-all',
                    'lg:text-[10px] lg:mt-1 lg:leading-tight',
                    'text-sm font-medium',
                    isActive ? 'font-bold' : ''
                  )}>
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3 pb-4 px-2 flex flex-col gap-2 mt-auto">
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center transition-all duration-200 relative',
                'lg:flex-col lg:justify-center lg:h-14 lg:w-[60px] lg:mx-auto lg:rounded-lg',
                'flex-row gap-3 px-4 py-3 rounded-lg',
                location.pathname === '/settings'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10'
              )}
            >
              <div className="relative flex shrink-0 items-center justify-center">
                <Settings className={cn(
                  'transition-colors',
                  'h-[22px] w-[22px] lg:h-5 lg:w-5',
                  location.pathname === '/settings' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                )} />
                {pendingCount > 0 && canShowBadges && (
                  <NotificationBadge 
                    count={pendingCount} 
                    className="absolute -top-1.5 -right-1.5 bg-destructive shadow-destructive/40 scale-75 lg:scale-90 origin-top-right" 
                    forceSettled={badgesSettled}
                    delay={10000}
                  />
                )}
              </div>
              <span className={cn(
                'whitespace-nowrap transition-all',
                'lg:text-[10px] lg:mt-1 lg:leading-tight',
                'text-sm font-medium'
              )}>
                Ajustes
              </span>
            </NavLink>

            {/* Avatar below settings */}
            <div className="flex justify-center mt-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-2 ring-transparent hover:ring-primary/30 transition-all cursor-pointer">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area (to the right of sidebar) ──────────────── */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-[72px] transition-all">
        
        {/* Rounded content container — like Canva */}
        <div className="flex-1 flex flex-col min-h-screen bg-[#f0f0f0] dark:bg-slate-950 lg:rounded-tl-[20px] overflow-hidden">

          {/* Top Bar inside rounded content */}
          <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-[#f0f0f0] dark:bg-slate-950 z-30 sticky top-0">
            
            {/* Left: Mobile Menu Toggle & Title */}
            <div className="flex items-center gap-3 w-max">
              <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-semibold tracking-tight text-foreground/90 lg:text-base">
                GetMySession
              </span>
            </div>

            {/* Center: Search Trigger (Command Palette) */}
            <div className="flex-1 hidden md:flex justify-center max-w-xl mx-4">
              <button
                onClick={() => setCommandOpen(true)}
                className={cn(
                  "relative w-full h-9 pl-10 pr-4 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none transition-all shadow-sm",
                  "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow focus:border-primary/30 focus:ring-2 focus:ring-primary/20",
                  "text-sm text-muted-foreground text-left cursor-pointer group"
                )}
              >
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="opacity-80">Buscar en GetMySession...</span>
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-gray-100 dark:bg-black/20 px-1.5 font-mono text-[10px] font-medium text-muted-foreground border border-gray-200 dark:border-gray-700">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {hasTourForModule(moduleKey) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTour(moduleKey)}
                  title="Iniciar Recorrido Guiado de este módulo"
                  className="gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-all duration-200 hidden sm:flex"
                >
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span>Recorrido</span>
                </Button>
              )}
              <MessageBell count={unreadWa} forceSettled={badgesSettled} canShow={canShowBadges} />
              <NotificationBell forceSettled={badgesSettled} canShow={canShowBadges} />
              
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1 lg:mx-2" />
              
              <UserMenu avatarUrl={avatarUrl} />
            </div>
          </header>

          {/* Subscription Banner */}
          <div className="w-full z-20">
            <SubscriptionBanner />
          </div>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
          <div className="flex-1 w-full max-w-7xl mx-auto">
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

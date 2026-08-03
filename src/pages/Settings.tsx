import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Clock, 
  LayoutGrid, 
  HelpCircle, 
  FileText, 
  Building2, 
  Plug, 
  CreditCard, 
  ShieldCheck,
  Share2 
} from 'lucide-react';

// Subcomponents
import ProfileSettings from '@/components/settings/ProfileSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import ScheduleSettings from '@/components/settings/ScheduleSettings';
import ServiceSettings from '@/components/settings/ServiceSettings';
import BookingQuestionsSettings from '@/components/settings/BookingQuestionsSettings';
import NoteTemplatesSettings from '@/components/settings/NoteTemplatesSettings';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import IntegrationSettings from '@/components/settings/IntegrationSettings';
import SubscriptionTab from '@/components/settings/SubscriptionTab';
import SecuritySettings from '@/components/settings/SecuritySettings';
import ReferralsSettings from '@/components/settings/ReferralsSettings';

type TabId = 'perfil' | 'horarios' | 'servicios' | 'preguntas' | 'plantillas' | 'seguridad' | 'organizacion' | 'suscripcion' | 'integraciones' | 'apariencia' | 'referidos';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'perfil', label: 'Perfil Profesional', icon: User },
  { id: 'horarios', label: 'Horarios y Comisiones', icon: Clock },
  { id: 'servicios', label: 'Servicios de Agenda', icon: LayoutGrid },
  { id: 'preguntas', label: 'Preguntas de Reserva', icon: HelpCircle },
  { id: 'plantillas', label: 'Plantillas de Notas', icon: FileText },
  { id: 'organizacion', label: 'Mi Organización', icon: Building2 },
  { id: 'integraciones', label: 'Integraciones', icon: Plug },
  { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
  { id: 'seguridad', label: 'Seguridad y Notificaciones', icon: ShieldCheck },
  { id: 'referidos', label: 'Recomendar Saudade', icon: Share2 },
];

const TAB_GROUPS = [
  {
    title: "Especialista",
    tabs: ['perfil', 'horarios', 'seguridad']
  },
  {
    title: "Herramientas Clínicas",
    tabs: ['servicios', 'preguntas', 'plantillas']
  },
  {
    title: "Administración",
    tabs: ['organizacion', 'integraciones', 'suscripcion', 'referidos']
  }
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const queryTab = searchParams.get('tab') as TabId;
    if (queryTab && TABS.some(t => t.id === queryTab)) {
      return queryTab;
    }
    return 'perfil';
  });

  useEffect(() => {
    const queryTab = searchParams.get('tab') as TabId;
    if (queryTab && TABS.some(t => t.id === queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <Layout>
      <div className="space-y-6 w-full">
        {/* Header Section (Island Style) */}
        <div id="tour-settings-header" className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">Configuración</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Gestión de Cuenta · Perfil Profesional</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation (Swipeable horizontal pill tabs) */}
        <div className="lg:hidden w-full overflow-x-auto scrollbar-none flex gap-2 pb-1.5 -mx-4 px-4 mask-image-horizontal">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all border",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-card/80"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start w-full">
          {/* Desktop Sidebar Navigation */}
          <div className="hidden lg:flex flex-col gap-6 bg-card border border-border p-5 rounded-2xl shadow-soft shrink-0 w-full animate-in fade-in duration-500">
            {TAB_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3">{group.title}</h3>
                <div className="space-y-1">
                  {group.tabs.map((tabId) => {
                    const tab = TABS.find(t => t.id === tabId);
                    if (!tab) return null;
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as TabId)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative overflow-hidden group/btn text-left",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {/* Active indicator bar */}
                        {active && (
                          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-full" />
                        )}
                        <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:scale-110", active ? "text-primary" : "text-muted-foreground")} />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Content Section */}
          <div className="w-full min-w-0">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {activeTab === 'perfil' && <ProfileSettings />}
              {activeTab === 'horarios' && <ScheduleSettings />}
              {activeTab === 'servicios' && <ServiceSettings />}
              {activeTab === 'preguntas' && <BookingQuestionsSettings />}
              {activeTab === 'plantillas' && <NoteTemplatesSettings />}
              {activeTab === 'organizacion' && <OrganizationSettings />}
              {activeTab === 'integraciones' && <IntegrationSettings />}
              {activeTab === 'suscripcion' && <SubscriptionTab />}
              {activeTab === 'seguridad' && <SecuritySettings />}
              {activeTab === 'referidos' && <ReferralsSettings />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

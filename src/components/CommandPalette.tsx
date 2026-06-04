import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Brain,
  FileText,
  DollarSign,
  FileSignature,
  BrainCircuit,
  MessageCircle,
  HelpCircle,
  Settings,
  UserPlus,
  CalendarPlus,
  FilePlus,
  Video,
  Search,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/hooks/useOrganization';

// ── Types ─────────────────────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PatientResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

// ── Static Data ───────────────────────────────────────────────────────────
const PAGES = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'inicio panel principal' },
  { name: 'Pacientes', href: '/patients', icon: Users, keywords: 'expedientes lista clientes' },
  { name: 'Agenda', href: '/agenda', icon: Calendar, keywords: 'calendario citas horario' },
  { name: 'IA Asistente', href: '/ai-assistant', icon: Brain, keywords: 'inteligencia artificial chat gpt' },
  { name: 'Notas Clínicas', href: '/notes', icon: FileText, keywords: 'sesion apuntes registros' },
  { name: 'Pruebas Psicométricas', href: '/tests', icon: BrainCircuit, keywords: 'tests evaluacion cuestionario' },
  { name: 'Consentimientos', href: '/consents', icon: FileSignature, keywords: 'firmas informados documentos' },
  { name: 'Finanzas', href: '/finance', icon: DollarSign, keywords: 'pagos cobros facturacion ingresos' },
  { name: 'WhatsApp', href: '/messages', icon: MessageCircle, keywords: 'mensajes chat comunicacion' },
  { name: 'Ajustes', href: '/settings', icon: Settings, keywords: 'configuracion perfil preferencias cuenta' },
  { name: 'Centro de Ayuda', href: '/help', icon: HelpCircle, keywords: 'soporte faq preguntas' },
];

const QUICK_ACTIONS = [
  { name: 'Nuevo Paciente', href: '/patients', icon: UserPlus, keywords: 'crear agregar registrar paciente', action: 'new-patient' },
  { name: 'Agendar Cita', href: '/agenda', icon: CalendarPlus, keywords: 'nueva cita agendar programar', action: 'new-appointment' },
  { name: 'Nueva Nota Clínica', href: '/notes', icon: FilePlus, keywords: 'crear nota sesion registro', action: 'new-note' },
  { name: 'Nuevo Consentimiento', href: '/consents', icon: FilePlus, keywords: 'crear consentimiento firma', action: 'new-consent' },
  { name: 'Iniciar Teleconsulta', href: '/agenda', icon: Video, keywords: 'videollamada sesion virtual jitsi', action: 'new-telehealth' },
  { name: 'Consultar IA', href: '/ai-assistant', icon: Sparkles, keywords: 'preguntar ia asistente inteligencia', action: 'ai-query' },
];

// ── Component ─────────────────────────────────────────────────────────────
const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ── Debounced patient search ────────────────────────────────────────────
  useEffect(() => {
    if (!query || query.length < 2 || !organization?.id) {
      setPatients([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name, email, phone')
          .eq('organization_id', organization.id)
          .is('deleted_at', null)
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(6);

        if (!error && data) {
          setPatients(data as PatientResult[]);
        }
      } catch {
        // silently ignore search errors
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, organization?.id]);

  // ── Reset state on close ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      // Small delay to avoid visual flash during close animation
      const t = setTimeout(() => {
        setQuery('');
        setPatients([]);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSelect = useCallback((href: string) => {
    onOpenChange(false);
    // Small delay so the dialog close animation plays
    setTimeout(() => navigate(href), 150);
  }, [navigate, onOpenChange]);

  const handleSelectPatient = useCallback((patientId: string) => {
    onOpenChange(false);
    setTimeout(() => navigate('/patients', { state: { selectPatientId: patientId } }), 150);
  }, [navigate, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar pacientes, páginas, acciones..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No se encontraron resultados para <span className="font-semibold">"{query}"</span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              Intenta buscar por nombre de paciente, página o acción
            </p>
          </div>
        </CommandEmpty>

        {/* ── Patients (live search) ──────────────────────────────────── */}
        {(patients.length > 0 || (isSearching && query.length >= 2)) && (
          <>
            <CommandGroup heading="Pacientes">
              {isSearching && patients.length === 0 && (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando pacientes...
                </div>
              )}
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`patient-${patient.name}`}
                  onSelect={() => handleSelectPatient(patient.id)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{patient.name}</span>
                    {(patient.email || patient.phone) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {patient.email || patient.phone}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <CommandGroup heading="Acciones Rápidas">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.action}
              value={`${action.name} ${action.keywords}`}
              onSelect={() => handleSelect(action.href)}
              className="cursor-pointer"
            >
              <action.icon className="mr-3 h-4 w-4 text-primary/70" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Pages / Navigation ──────────────────────────────────────── */}
        <CommandGroup heading="Páginas">
          {PAGES.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.name} ${page.keywords}`}
              onSelect={() => handleSelect(page.href)}
              className="cursor-pointer"
            >
              <page.icon className="mr-3 h-4 w-4 text-muted-foreground" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

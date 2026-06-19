import Layout from '@/components/Layout';
import FeatureGate from '@/components/subscription/FeatureGate';
import {
  ShieldCheck,
  Brain,
  FileText,
  ShoppingCart,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  User,
  MessageCircle,
  MapPin,
  Loader2,
  Clock,
  Pencil,
  Save,
  Trash2,
  Users,
  Download,
  ClipboardList,
  TrendingUp,
  Activity,
  DollarSign,
  LineChart as LucideLineChart,
  Send,
  ExternalLink,
  ArrowLeft,
  X,
  Paperclip,
  Upload,
  File,
  Image,
  Sparkles,
  FolderOpen,
  FileSignature,
  Edit3,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import PatientWhatsAppLink from '@/components/patients/PatientWhatsAppLink';
import {
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { psychometricTests } from '@/lib/psychometricTests';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mockPatients, tagColors } from '@/lib/mockData';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import NewPatientDialog from '@/components/patients/NewPatientDialog';
import AssignTestDialog from '@/components/patients/AssignTestDialog';
import { useOrganization } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { generateExpedientePDF, generateSessionNotePDF } from '@/lib/generateExpedientePDF';
import NoteEditorSheet from '@/components/patients/NoteEditorSheet';
import { getAvatarTheme, getInitials } from '@/lib/avatar-utils';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Patient, SessionNote, PatientTest, Appointment } from '@/types';
import { decryptText } from '@/lib/encryption';

// Enriched patient type with appointment metadata
interface EnrichedPatient extends Patient {
    _next_appointment?: string | null;
    _next_appointment_modality?: string | null;
    _next_appointment_location?: string | null;
    _last_appointment?: string | null;
}

const PATIENT_TABS = [
    { id: 'timeline', label: 'Línea de Tiempo', icon: Clock },
    { id: 'evolution', label: 'Evolución', icon: Activity },
    { id: 'history', label: 'Historia Clínica', icon: ClipboardList },
    { id: 'notes', label: 'Notas de Sesión', icon: FileText },
    { id: 'tests', label: 'Pruebas', icon: Brain },
    { id: 'info', label: 'Datos Personales', icon: User },
    { id: 'documents', label: 'Documentos', icon: FolderOpen },
    { id: 'whatsapp', label: 'Mensajes WA', icon: MessageCircle },
    { id: 'economy', label: 'Finanzas', icon: DollarSign },
];

const TAB_GROUPS = [
    {
        title: 'CLÍNICO',
        tabs: ['timeline', 'evolution', 'history']
    },
    {
        title: 'SESIONES Y HERRAMIENTAS',
        tabs: ['notes', 'tests']
    },
    {
        title: 'GESTIÓN',
        tabs: ['info', 'documents', 'economy', 'whatsapp']
    }
];

// Swipeable Patient Card for Mobile Swipe-to-Action
interface SwipeablePatientCardProps {
  patient: EnrichedPatient;
  onSelect: (id: string) => void;
  swipedPatientId: string | null;
  setSwipedPatientId: (id: string | null) => void;
}

const SwipeablePatientCard = ({ patient, onSelect, swipedPatientId, setSwipedPatientId }: SwipeablePatientCardProps) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const isSwiped = swipedPatientId === patient.id;

  // Sync state if another card is swiped
  useEffect(() => {
    if (!isSwiped) {
      setCurrentOffset(0);
    } else {
      setCurrentOffset(150); // 150px reveals three 50px buttons
    }
  }, [isSwiped]);

  const onTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX === null || startY === null) return;
    const diffX = startX - e.touches[0].clientX;
    const diffY = startY - e.touches[0].clientY;

    // Ignore if vertical scroll is dominant
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // We only care about swipe left (diffX > 0)
    if (diffX > 0) {
      const offset = isSwiped ? 150 + diffX : diffX;
      setCurrentOffset(Math.min(offset, 180));
    } else {
      // Swiping back to close
      const offset = isSwiped ? 150 + diffX : 0;
      setCurrentOffset(Math.max(offset, 0));
    }
  };

  const onTouchEnd = () => {
    setStartX(null);
    setStartY(null);
    if (currentOffset > 75) {
      setSwipedPatientId(patient.id);
      setCurrentOffset(150);
    } else {
      setSwipedPatientId(null);
      setCurrentOffset(0);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    // If swiped, click closes it
    if (isSwiped || currentOffset > 10) {
      e.stopPropagation();
      setSwipedPatientId(null);
      setCurrentOffset(0);
    } else {
      onSelect(patient.id);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl w-full select-none touch-pan-y">
      {/* Quick Action Buttons (Behind the card) */}
      <div className="absolute inset-y-0 right-0 w-[150px] flex items-center justify-end z-0 pr-1">
        {/* Action: WhatsApp */}
        <a
          href={patient.phone ? `https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="h-full w-[50px] bg-success hover:bg-success/90 text-white flex flex-col items-center justify-center transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSwipedPatientId(null);
          }}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[8px] font-bold mt-1 uppercase">WhatsApp</span>
        </a>

        {/* Action: Agenda / Cita */}
        <button
          type="button"
          className="h-full w-[50px] bg-secondary hover:bg-secondary/90 text-white flex flex-col items-center justify-center transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setSwipedPatientId(null);
            toast.info(`Programar cita para ${patient.name}`);
          }}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[8px] font-bold mt-1 uppercase">Cita</span>
        </button>

        {/* Action: Ver Expediente */}
        <button
          type="button"
          className="h-full w-[50px] bg-primary hover:bg-primary/95 text-white flex flex-col items-center justify-center transition-colors rounded-r-2xl"
          onClick={(e) => {
            e.stopPropagation();
            setSwipedPatientId(null);
            onSelect(patient.id);
          }}
        >
          <ExternalLink className="h-5 w-5" />
          <span className="text-[8px] font-bold mt-1 uppercase">Ficha</span>
        </button>
      </div>

      {/* Main Card Element */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleSelect}
        style={{
          transform: `translateX(-${currentOffset}px)`,
          transition: startX === null ? 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        className="w-full z-10 relative"
      >
        <Card className="group border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                getAvatarTheme(patient.name)
              )}>
                {getInitials(patient.name)}
              </div>
              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter opacity-60">
                {patient.status?.replace(/_/g, ' ') || 'Activo'}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-bold text-base tracking-tight group-hover:text-primary transition-colors truncate">
                {patient.name}
              </h3>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {patient.last_session 
                    ? `Última: ${format(new Date(patient.last_session), 'd MMM, yyyy', { locale: es })}`
                    : 'Sin sesiones registradas'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/40">
              <div className="flex -space-x-2">
                {patient._next_appointment ? (
                  <div className="h-6 w-6 rounded-full bg-success/10 border-2 border-background flex items-center justify-center" title="Próxima cita programada">
                    <Clock className="h-3 w-3 text-success" />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted/20 border-2 border-background flex items-center justify-center" title="Sin citas pendientes">
                    <Clock className="h-3 w-3 text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                <span className="text-[9px] font-black uppercase tracking-widest">Ver Expediente</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>
      </div>
    </div>
  );
};

const Patients = () => {
  const { organization } = useOrganization();
  const { canUse, navigateToUpgrade } = useSubscription();
  const navigate = useNavigate();

  // ── States ──────────────────────────────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [activePatientTab, setActivePatientTab] = useState<string>('info');
  const [patients, setPatients] = useState<EnrichedPatient[]>([]);
  const [patientNotes, setPatientNotes] = useState<SessionNote[]>([]);
  const [patientTests, setPatientTests] = useState<PatientTest[]>([]);
  const [patientPayments, setPatientPayments] = useState<any[]>([]);
  const [patientConsents, setPatientConsents] = useState<any[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('pacientes');
  const [leads, setLeads] = useState<any[]>([]);
  const [isLeadsLoading, setIsLeadsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [confirmDeletePatient, setConfirmDeletePatient] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  
  const [viewMode, setViewMode] = useState<'mosaic' | 'list'>(() => (localStorage.getItem('patientsViewMode') as 'mosaic' | 'list') || 'mosaic');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'newest' | 'oldest'>(() => (localStorage.getItem('patientsSortBy') as any) || 'name_asc');
  const [searchRefreshTrigger, setSearchRefreshTrigger] = useState(0);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingNoteId, setIsExportingNoteId] = useState<string | null>(null);
  
  const [viewingTest, setViewingTest] = useState<PatientTest | null>(null);
  const [isAssignTestOpen, setIsAssignTestOpen] = useState(false);
  const [swipedPatientId, setSwipedPatientId] = useState<string | null>(null);

  // Note editing sheet states
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [editingNoteData, setEditingNoteData] = useState<SessionNote | null>(null);
  const [noteSheetMode, setNoteSheetMode] = useState<'manual' | 'ai'>('manual');

  // Document upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);


  // ── Helpers ─────────────────────────────────────────────────────────────
  const selectPatient = (id: string) => {
    setSelectedPatient(id);
    setConfirmDeletePatient(false);
  };

  // Cargar pacientes desde Supabase
  const fetchPatients = useCallback(async () => {
    try {
      if (!organization?.id) return;
      setIsLoading(true);
      const now = new Date().toISOString();

      const { data: patientsData, error: pErr } = await supabase
        .from('patients')
        .select('*, patient_clinical_data(*), patient_fiscal_data(*)')
        .eq('organization_id', organization?.id)
        .is('deleted_at', null)
        .order('name');
      
      if (pErr) throw pErr;

      // Traer citas
      const { data: aptsData } = await supabase
        .from('appointments')
        .select('patient_id, start_time, status, modality, location')
        .eq('organization_id', organization?.id)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      const apts = aptsData || [];
      interface EnrichedApt {
        start_time: string;
        modality?: string | null;
        location?: string | null;
      }
      const nextByPatient: Record<string, EnrichedApt> = {};
      const lastByPatient: Record<string, string> = {};

      apts.forEach((apt: any) => {
        if (!apt.patient_id) return;
        if (apt.start_time >= now) {
          if (!nextByPatient[apt.patient_id]) {
            nextByPatient[apt.patient_id] = {
              start_time: apt.start_time,
              modality: apt.modality,
              location: apt.location
            };
          }
        } else {
          lastByPatient[apt.patient_id] = apt.start_time;
        }
      });

      const enriched: EnrichedPatient[] = (patientsData || []).map((p: Patient) => {
        // Map the array relationship if present (Supabase returns arrays for one-to-many/one-to-one joins)
        const getRelation = (data: any) => Array.isArray(data) ? data[0] : data;
        const fiscalData = getRelation(p.patient_fiscal_data) || {};
        const clinicalData = getRelation(p.patient_clinical_data) || {};

        return {
          ...p,
          curp: decryptText(p.curp),
          rfc: decryptText(fiscalData.rfc) || undefined,
          tax_name: fiscalData.tax_name || undefined,
          tax_zip_code: fiscalData.tax_zip_code || undefined,
          tax_regime: fiscalData.tax_regime || undefined,
          cfdi_use: fiscalData.cfdi_use || undefined,
          notes: clinicalData.notes || undefined,
          _next_appointment: nextByPatient[p.id] ? nextByPatient[p.id].start_time : null,
          _next_appointment_modality: nextByPatient[p.id] ? nextByPatient[p.id].modality : null,
          _next_appointment_location: nextByPatient[p.id] ? nextByPatient[p.id].location : null,
          _last_appointment: lastByPatient[p.id] || null,
        };
      });

      setPatients(enriched);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al cargar pacientes:', error);
      setPatients(mockPatients);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  const fetchLeads = useCallback(async () => {
    try {
      if (!organization?.id) return;
      setIsLeadsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'nuevo_lead')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsLeadsLoading(false);
    }
  }, [organization?.id]);

  const handleConvertLead = async (lead: any) => {
    try {
      if (!organization?.id) return;
      toast.loading('Convirtiendo a paciente...', { id: `convert-${lead.id}` });
      
      // 1. Create Patient
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({
          organization_id: organization.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: 'activo',
        })
        .select()
        .single();
        
      if (patientError) throw patientError;
      
      // 2. Create Patient Clinical Data for age and reason
      const { error: clinicalError } = await supabase
        .from('patient_clinical_data')
        .insert({
          patient_id: newPatient.id,
          notes: lead.reason_for_consultation ? `Motivo de consulta (Lead): ${lead.reason_for_consultation}` : null
        });
        
      if (clinicalError) console.error("Error creating clinical data:", clinicalError);

      // 3. Link existing appointments
      // We look for appointments in this org where patient_name, email, or phone matches the lead
      const { error: aptError } = await supabase
        .from('appointments')
        .update({ patient_id: newPatient.id })
        .eq('organization_id', organization.id)
        .is('patient_id', null)
        .ilike('patient_name', lead.name);

      if (aptError) console.error("Error linking appointments:", aptError);

      // 4. Update Lead status
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', lead.id);
        
      if (leadUpdateError) throw leadUpdateError;

      toast.success('¡Prospecto convertido exitosamente!', { id: `convert-${lead.id}` });
      
      // 5. Refresh data
      fetchPatients();
      fetchLeads();
      setActiveMainTab('pacientes');
      
    } catch (err: any) {
      toast.error('Error al convertir prospecto: ' + err.message, { id: `convert-${lead.id}` });
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchLeads();
  }, [fetchPatients, fetchLeads]);

  useEffect(() => {
    if (location.state?.selectPatientId) {
      setSelectedPatient(location.state.selectPatientId);
      // Clean up location state to avoid re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const fetchPatientDetails = useCallback(async (patientId: string) => {
    if (!organization?.id) return;
    setDataLoading(true);
    setNotesLoading(true);
    try {
      // 1. Fetch Clinical Notes
      const { data: notesData, error: notesErr } = await supabase
        .from('session_notes')
        .select('id, date, session_number, agenda, mood, created_at, cie10_code, cie10_description, diagnostico_principal, bridge, transcript_summary')
        .eq('patient_id', patientId)
        .eq('organization_id', organization?.id)
        .is('deleted_at', null)
        .order('date', { ascending: false });
      if (notesErr) throw notesErr;
      setPatientNotes((notesData as SessionNote[]) || []);

      // 2. Fetch Tests
      const { data: testsData, error: testsErr } = await supabase
        .from('patient_tests')
        .select('id, test_type, status, score, interpretation, created_at, completed_at, answers')
        .eq('patient_id', patientId)
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });
      if (testsErr) throw testsErr;
      setPatientTests(testsData as PatientTest[] || []);

      // 3. Fetch Payments
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payments')
        .select(`
            id, amount, method, status, paid_at, created_at,
            appointments!inner (
                patient_id,
                start_time,
                organization_id
            )
        `)
        .eq('appointments.patient_id', patientId)
        .eq('appointments.organization_id', organization?.id)
        .order('created_at', { ascending: false });
      if (paymentsErr) throw paymentsErr;
      setPatientPayments(paymentsData || []);

      // 4. Fetch Consents
      const { data: consentsData, error: consentsErr } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('patient_id', patientId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (consentsErr) throw consentsErr;
      setPatientConsents(consentsData || []);

      // 5. Fetch Documents
      const { data: docsData, error: docsErr } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('organization_id', organization?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (docsErr) throw docsErr;
      setPatientDocuments(docsData || []);


    } catch (err: unknown) {
      const error = err as Error;
      toast.error('Error al cargar expediente: ' + error.message);
    } finally {
      setDataLoading(false);
      setNotesLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientDetails(selectedPatient);
    } else {
      setPatientNotes([]);
      setPatientTests([]);
      setPatientPayments([]);
      setPatientConsents([]);
      setPatientDocuments([]);
    }
  }, [selectedPatient, fetchPatientDetails]);

  // Reset scroll to top when selecting/deselecting a patient to avoid layout cutoff on mobile
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedPatient]);

  const handleIntegratedSend = async (phone: string, message: string, templateId: string) => {
    if (!organization) return;
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp', {
        body: {
          action: 'send',
          phone,
          body: message,
          organization_id: organization.id,
          patient_id: selectedPatientData?.id,
          template_id: templateId
        }
      });
      if (error) throw error;
      toast.success('Mensaje enviado exitosamente');
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);
      toast.error('Error al enviar mensaje: ' + err.message);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedPatientData) return;
    setIsExportingPDF(true);
    try {
      // Fetch professional profile for signature
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('full_name, prefix, cedulas, signature_data')
        .eq('id', user.id)
        .single();
      
      if (profErr) throw profErr;

      generateExpedientePDF(
        selectedPatientData,
        patientNotes,
        patientConsents,
        prof
      );
      toast.success('Expediente generado con éxito');
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      toast.error('Error al generar PDF: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadNote = async (note: SessionNote) => {
    if (!selectedPatientData) return;
    setIsExportingNoteId(note.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, prefix, cedulas, signature_data')
        .eq('id', user.id)
        .single();

      generateSessionNotePDF(
        { 
          name: selectedPatientData.name, 
          id: selectedPatientData.id, 
          date_of_birth: selectedPatientData.date_of_birth 
        },
        note as any,
        prof || undefined
      );
      toast.success('Nota generada con éxito');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar PDF: ' + err.message);
    } finally {
      setIsExportingNoteId(null);
    }
  };


  // Timeline consolidation
  const timelineItems = [
    ...patientNotes.map(n => ({ 
      type: 'note', 
      date: n.date, 
      title: `Sesión #${n.session_number}`,
      data: n 
    })),
    ...patientTests.filter(t => t.completed_at).map(t => ({ 
      type: 'test', 
      date: t.completed_at!, 
      title: psychometricTests[t.test_type]?.name || t.test_type,
      score: t.score,
      data: t 
    })),
    ...patientPayments.filter(p => p.paid_at).map(p => ({ 
      type: 'payment', 
      date: p.paid_at!, 
      title: `Pago Recibido: $${p.amount}`,
      data: p 
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const [generalNotes, setGeneralNotes] = useState('');
  const [isSavingGeneralNotes, setIsSavingGeneralNotes] = useState(false);

  useEffect(() => {
    if (selectedPatientData) {
      setGeneralNotes(selectedPatientData.notes || '');
    }
  }, [selectedPatientData]);

  const handleSaveGeneralNotes = async () => {
    if (!selectedPatientData || !organization?.id) return;
    setIsSavingGeneralNotes(true);
    try {
      const { error } = await supabase
        .from('patient_clinical_data')
        .upsert({
          patient_id: selectedPatientData.id,
          organization_id: organization.id,
          notes: generalNotes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'patient_id' });

      if (error) throw error;
      toast.success('Resumen clínico general actualizado.');
      fetchPatients();
    } catch (err: any) {
      console.error('Error saving clinical notes:', err);
      toast.error('Error al guardar resumen clínico: ' + err.message);
    } finally {
      setIsSavingGeneralNotes(false);
    }
  };

  const filteredPatientsList = patients
    .filter(p => {
      if (!searchFilter) return true;
      const search = searchFilter.toLowerCase().replace(/[^a-z0-9]/g, '');
      const name = (p.name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const phone = (p.phone || '').replace(/[^0-9]/g, '');
      
      // If search has letters, check name/email. If only numbers, check phone too.
      const hasLetters = /[a-z]/i.test(searchFilter);
      
      if (hasLetters) {
        return name.includes(searchFilter.toLowerCase()) || email.includes(searchFilter.toLowerCase());
      }
      
      // If it's mainly numbers or symbols, match normalized phone or name
      return phone.includes(search) || name.includes(searchFilter.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return 0;
    });

  const handleFileUpload = async (files: File[]) => {
    if (!selectedPatient || !organization?.id) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');

      let uploadedCount = 0;
      for (const file of files) {
        // Validate size (50MB)
        if (file.size > 52428800) {
          toast.error(`"${file.name}" excede el límite de 50MB.`);
          continue;
        }

        const ext = file.name.split('.').pop() || 'bin';
        const safeName = file.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove accents
          .replace(/[^a-zA-Z0-9._-]/g, '_');                // replace spaces & special chars
        const storagePath = `${organization.id}/${selectedPatient}/${Date.now()}_${safeName}`;

        // Upload to Storage
        const { error: uploadErr } = await supabase.storage
          .from('patient-documents')
          .upload(storagePath, file);

        if (uploadErr) {
          toast.error(`Error al subir "${file.name}": ${uploadErr.message}`);
          continue;
        }

        // Create metadata record
        const { error: insertErr } = await supabase
          .from('patient_documents')
          .insert({
            patient_id: selectedPatient,
            organization_id: organization.id,
            file_name: file.name,
            file_type: file.type || `application/${ext}`,
            file_size: file.size,
            storage_path: storagePath,
            uploaded_by: user.id,
          });

        if (insertErr) {
          toast.error(`Error al registrar "${file.name}": ${insertErr.message}`);
          continue;
        }
        uploadedCount++;
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} ${uploadedCount === 1 ? 'archivo subido' : 'archivos subidos'} con éxito.`);
        // Refresh documents list
        fetchPatientDetails(selectedPatient);
      }
    } catch (err: any) {
      toast.error('Error al subir archivos: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient || !organization?.id) return;
    setIsDeletingPatient(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('patients')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
        .eq('id', selectedPatient)
        .eq('organization_id', organization?.id);
      if (updErr) throw updErr;
      toast.success('Expediente eliminado con éxito');
      setSelectedPatient(null);
      fetchPatients();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error('Error al eliminar: ' + error.message);
    } finally {
      setIsDeletingPatient(false);
      setConfirmDeletePatient(false);
    }
  };

  const handleExportCSV = async () => {
    if (patients.length === 0) {
      toast.error('No hay pacientes para exportar');
      return;
    }

    if (!organization?.id) {
      toast.error('Error de sesión. Intente recargar.');
      return;
    }

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      // 2. Log to audit_logs
      const { error: auditErr } = await supabase
        .from('audit_logs')
        .insert({
          organization_id: organization.id,
          profile_id: user.id,
          action: 'export_patients_csv',
          resource_type: 'patients',
          details: { count: patients.length, non_sensitive_only: true }
        });
      
      if (auditErr) throw auditErr;

      // 3. Define headers for export (Sensitive fields like notes, curp, rfc removed for security)
      const headers = [
        'name', 'email', 'phone', 'date_of_birth', 'gender', 
        'occupation', 'emergency_contact_name', 'emergency_contact_phone', 
        'status'
      ];

      const csvContent = [
        headers.join(','),
        ...patients.map(p => headers.map(h => {
          let val = (p as any)[h] || '';
          
          // Special formatting for phone: only digits
          if (h === 'phone') {
            val = String(val).replace(/\D/g, '');
          }

          // Escape quotes and wrap in quotes to handle commas/newlines
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `pacientes_saudade_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Lista de pacientes exportada con éxito. Acción auditada.');
    } catch (err: any) {
      toast.error('Error al exportar: ' + (err.message || 'Intente de nuevo.'));
      console.error('Export error:', err);
    }
  };

  const handleImportCSV = async (file: File) => {
    if (!organization?.id) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
        toast.error('El archivo CSV está vacío o no tiene el formato correcto');
        return;
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const newPatients = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Basic CSV parser that handles quoted values with commas
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const patient: any = {
          organization_id: organization.id,
          status: 'activo'
        };

        headers.forEach((header, index) => {
          // Avoid overwriting IDs or organization IDs to prevent conflicts
          if (header !== 'id' && header !== 'organization_id' && header.length > 0) {
            patient[header] = values[index] || null;
          }
        });

        if (patient.name && patient.name !== 'name') {
          newPatients.push(patient);
        }
      }

      if (newPatients.length === 0) {
        toast.error('No se encontraron pacientes válidos para importar');
        return;
      }

      try {
        const { error } = await supabase.from('patients').insert(newPatients);
        if (error) throw error;
        toast.success(`${newPatients.length} pacientes importados correctamente`);
        fetchPatients();
        setSearchRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        console.error('Error importing:', err);
        toast.error('Error al importar: ' + (err.message || 'Error desconocido'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Layout 
        activePatient={selectedPatientData ? { id: selectedPatientData.id, name: selectedPatientData.name } : undefined} 
        activePatientTab={activePatientTab} 
        onPatientTabChange={setActivePatientTab}
      >
        {!canUse('core_patients') && (
          <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top fade-in duration-500">
            <div className="flex items-center gap-3 text-warning-foreground">
              <Lock className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Modo de Solo Lectura</p>
                <p className="text-xs opacity-90">Tu periodo de prueba ha expirado. Estás en modo de solo lectura. Para agregar pacientes o usar funciones avanzadas, necesitas un plan activo.</p>
              </div>
            </div>
            <Button size="sm" onClick={navigateToUpgrade} className="shrink-0 bg-warning text-warning-foreground hover:bg-warning/90 font-bold shadow-sm">
              <Sparkles className="h-3 w-3 mr-2" />
              Actualizar Plan
            </Button>
          </div>
        )}
        <div className="space-y-6">
          {/* Unified Header: Title, Search & Actions */}
          {!selectedPatientData && (
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {selectedPatient && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 -ml-2 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => setSelectedPatient(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <h1 className="text-2xl font-black tracking-tight">
                    {selectedPatient ? 'Expediente' : 'Pacientes'}
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">
                  {selectedPatient ? 'Vista 360° del Paciente' : 'Expediente Clínico 360°'}
                </p>
              </div>
            </div>

            <div className="w-full lg:max-w-md">
              <PatientAutocomplete
                value={selectedPatient || ''}
                onSelect={(id) => {
                  setSelectedPatient(id);
                }}
                placeholder="Selecciona un paciente..."
                refreshTrigger={searchRefreshTrigger}
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto justify-end">
              <input
                type="file"
                ref={importFileInputRef}
                className="hidden"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportCSV(file);
                  e.target.value = '';
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 text-[10px] font-bold uppercase tracking-widest px-4 border-primary/20 hover:bg-primary/5 transition-all"
                onClick={() => importFileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Importar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-10 text-[10px] font-bold uppercase tracking-widest px-4 border-primary/20 hover:bg-primary/5 transition-all"
                onClick={handleExportCSV}
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Exportar
              </Button>
              <FeatureGate feature="core_patients" inline>
                <Button variant="zen" size="sm" className="h-10 text-[10px] font-bold uppercase tracking-widest px-4 shadow-lg shadow-primary/20" onClick={() => setIsNewPatientOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Nuevo Paciente
                </Button>
              </FeatureGate>
            </div>
          </div>
          )}
{/* Full-Width Content Area */}
          <div className="w-full">
            {selectedPatientData ? (
              <>
                <Tabs value={activePatientTab} onValueChange={setActivePatientTab} className="h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                <TabsList className="hidden">
                    {PATIENT_TABS.map(tab => (
                        <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
                    ))}
                </TabsList>

                {/* Header Section (Island Style) */}
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft mb-6">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 -ml-2 hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                          onClick={() => setSelectedPatient(null)}
                          title="Volver a lista de pacientes"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="relative group shrink-0">
                          <div className={cn(
                            "h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold border-2 border-primary/20 transition-all",
                            getAvatarTheme(selectedPatientData.name)
                          )}>
                            {getInitials(selectedPatientData.name)}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black tracking-tight text-foreground">{selectedPatientData.name}</h1>
                                <Badge className="bg-primary text-white hover:bg-primary-dark uppercase text-[9px] px-2 py-0.5 whitespace-nowrap shadow-sm">
                                  {selectedPatientData.status === 'activo' ? 'Activo' : 
                                   selectedPatientData.status === 'primer_contacto' ? 'Primer Contacto' : 
                                   selectedPatientData.status === 'seguimiento' ? 'Seguimiento' : 
                                   selectedPatientData.status === 'alta' ? 'Alta Clínica' : 
                                   selectedPatientData.status?.replace(/_/g, ' ')}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">ID: {selectedPatientData.id.slice(0,8)}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Contact Info Pills */}
                        {selectedPatientData.phone && (
                            <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span>{selectedPatientData.phone}</span>
                                <a
                                  href={`https://wa.me/${selectedPatientData.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 p-1 rounded hover:bg-success/10 text-success transition-all"
                                  title="Enviar WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        )}
                        {selectedPatientData.email && (
                            <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate max-w-[150px]">{selectedPatientData.email}</span>
                            </div>
                        )}
                        {selectedPatientData.last_session && (
                            <div className="flex items-center gap-2 text-sm bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs">Última: {format(new Date(selectedPatientData.last_session), 'd MMM', { locale: es })}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation (iOS-Style Bottom Sheet Selector) - Moved below Patient Header Card */}
                <div className="lg:hidden w-full mb-6">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between rounded-2xl h-11 border-border dark:border-slate-800 shadow-soft bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const activeTabObj = PATIENT_TABS.find(t => t.id === activePatientTab);
                            const Icon = activeTabObj?.icon || User;
                            return (
                              <>
                                <Icon className="h-4 w-4 text-primary" />
                                <span>{activeTabObj?.label || 'Seleccionar sección'}</span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="p-6 pb-8 bg-background border-t border-border">
                      <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 mb-6" />
                      <DrawerHeader className="p-0 pb-3 text-left">
                        <DrawerTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                          Secciones del Expediente
                        </DrawerTitle>
                      </DrawerHeader>
                      <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-zen">
                        {TAB_GROUPS.map((group) => (
                          <div key={group.title} className="space-y-1">
                            <h4 className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest px-4 py-1">
                              {group.title}
                            </h4>
                            <div className="grid grid-cols-1 gap-1">
                              {group.tabs.map((tabId) => {
                                const tab = PATIENT_TABS.find(t => t.id === tabId);
                                if (!tab) return null;
                                const Icon = tab.icon;
                                const active = activePatientTab === tab.id;
                                return (
                                  <DrawerClose asChild key={tab.id}>
                                    <button
                                      type="button"
                                      onClick={() => setActivePatientTab(tab.id)}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
                                        active
                                          ? "bg-primary/10 text-primary font-bold shadow-sm"
                                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
                                      )}
                                    >
                                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-slate-400")} />
                                      <span>{tab.label}</span>
                                    </button>
                                  </DrawerClose>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start w-full">
                    {/* Desktop Sidebar Navigation */}
                    <div className="hidden lg:flex flex-col bg-card border border-border p-5 rounded-2xl shadow-soft shrink-0 w-full animate-in fade-in duration-500">
                      <TabsList className="flex flex-col items-stretch justify-start gap-6 w-full bg-transparent h-auto p-0 border-none">
                          {TAB_GROUPS.map((group) => (
                              <div key={group.title} className="space-y-2.5">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3">{group.title}</h3>
                                  <div className="space-y-1">
                                      {group.tabs.map((tabId) => {
                                          const tab = PATIENT_TABS.find(t => t.id === tabId);
                                          if (!tab) return null;
                                          const Icon = tab.icon;
                                          const active = activePatientTab === tab.id;
                                          return (
                                              <TabsTrigger
                                                  key={tab.id}
                                                  value={tab.id}
                                                  className={cn(
                                                      "w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative overflow-hidden group/btn text-left",
                                                      active
                                                          ? "bg-primary/10 text-primary !shadow-none data-[state=active]:shadow-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=inactive]:bg-transparent data-[state=active]:shadow-none data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                                  )}
                                              >
                                                  {active && (
                                                      <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-full" />
                                                  )}
                                                  <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:scale-110", active ? "text-primary" : "text-muted-foreground")} />
                                                  <span className="truncate">{tab.label}</span>
                                              </TabsTrigger>
                                          );
                                      })}
                                  </div>
                              </div>
                          ))}
                      </TabsList>

                      <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-1 gap-2">
                        <Button 
                          variant="zen" 
                          size="sm" 
                          className="w-full h-10 shadow-sm mb-2 gap-2 text-xs"
                          onClick={handleExportPDF}
                          disabled={isExportingPDF}
                        >
                          {isExportingPDF ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Exportar Expediente
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-9 border-primary/20 hover:bg-primary/5 text-xs"
                          onClick={() => {
                            setEditingPatient(selectedPatientData);
                            setIsNewPatientOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1.5" /> Editar Perfil
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-9 text-destructive hover:bg-destructive/10 border-destructive/20 text-xs"
                          onClick={() => {
                            if (window.confirm('¿Estás seguro de que deseas eliminar este expediente? Esta acción lo archivará según la NOM-024.')) {
                              handleDeletePatient();
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1.5" /> Eliminar
                        </Button>
                      </div>
                    </div>

                    {/* Right: Modern Tabbed Layout Content */}
                    <div className="w-full min-w-0 bg-card rounded-2xl shadow-soft border border-border overflow-hidden relative min-h-[500px]">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                      <div className="relative z-10 h-full p-6 sm:p-8">
                          <TabsContent value="info" className="m-0 space-y-6 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <section className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                                  <User className="h-5 w-5 text-primary" /> Datos Personales
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Edad</p>
                                    <p className="font-medium">
                                      {selectedPatientData.date_of_birth 
                                        ? `${differenceInYears(new Date(), parseISO(selectedPatientData.date_of_birth))} años` 
                                        : 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Género</p>
                                    <p className="font-medium">
                                      {selectedPatientData.gender === 'F' ? 'Femenino' : 
                                       selectedPatientData.gender === 'M' ? 'Masculino' : 
                                       selectedPatientData.gender === 'otro' ? 'Otro' : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Ocupación</p>
                                    <p className="font-medium">{selectedPatientData.occupation || 'N/A'}</p>
                                  </div>
                                </div>
                              </section>

                              <section className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                                  <Brain className="h-5 w-5 text-secondary" /> Motivo de Consulta
                                </h3>
                                <div className="bg-muted/30 p-4 rounded-xl text-sm leading-relaxed min-h-[100px]">
                                  {selectedPatientData.notes || 'No hay notas registradas para este paciente.'}
                                </div>
                              </section>
                            </div>
                          </TabsContent>

                          <TabsContent value="timeline" className="m-0 animate-in fade-in duration-500">
                            <div className="max-w-4xl mx-auto py-4">
                              <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold">Línea de Tiempo Integral</h3>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  Total: {timelineItems.length} eventos
                                </Badge>
                              </div>

                              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
                                {dataLoading ? (
                                  <div className="flex justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                  </div>
                                ) : timelineItems.length === 0 ? (
                                  <div className="text-center p-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                    <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                                    <p className="text-muted-foreground font-medium">No hay actividad registrada aún.</p>
                                  </div>
                                ) : (
                                  timelineItems.map((item, idx) => {
                                    const iconMap: Record<string, JSX.Element> = {
                                      note: <FileText className="h-4 w-4 text-primary" />,
                                      test: <Brain className="h-4 w-4 text-accent" />,
                                      payment: <ShoppingCart className="h-4 w-4 text-secondary" />
                                    };
                                    const bgMap: Record<string, string> = {
                                      note: 'bg-primary/15',
                                      test: 'bg-accent/15',
                                      payment: 'bg-secondary/15'
                                    };

                                    const score = (item as { score?: number }).score;
                                    return (
                                      <div key={idx} className="relative flex items-center gap-6 group">
                                        <div className={cn("flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center z-10 shadow-sm transition-transform duration-300 group-hover:scale-110", bgMap[item.type])}>
                                          {iconMap[item.type]}
                                        </div>
                                        <div className="flex-1 bg-white p-5 rounded-2xl border border-border shadow-soft hover:shadow-medium transition-all group-hover:-translate-y-1">
                                          <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                                              {item.type === 'note' ? 'Sesión Clínica' : item.type === 'test' ? 'Prueba Aplicada' : 'Pago Recibido'}
                                            </span>
                                            <span className="text-[10px] font-mono opacity-40">{format(parseISO(item.date), 'dd/MM/yyyy HH:mm')}</span>
                                          </div>
                                          <p className="text-sm font-semibold text-foreground/90">{item.title}</p>
                                          {item.type === 'test' && score !== undefined && (
                                            <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">Puntaje: {score}</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="evolution" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-8">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-bold">Progreso Terapéutico</h3>
                                  <p className="text-sm text-muted-foreground">Evolución de síntomas basada en pruebas estandarizadas.</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* GAD-7 Chart */}
                                <Card className="p-6 border-border/50 shadow-soft">
                                  <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-sm uppercase tracking-wide text-primary">Ansiedad (GAD-7)</h4>
                                    <Activity className="h-4 w-4 text-primary opacity-30" />
                                  </div>
                                  <div className="h-[280px] w-full">
                                    {patientTests.filter(t => t.test_type === 'gad7' && t.status === 'completed').length >= 2 ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart data={patientTests.filter(t => t.test_type === 'gad7' && t.status === 'completed').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                          <XAxis dataKey="created_at" tickFormatter={(val) => format(parseISO(val), 'd MMM')} fontSize={10} tick={{fill: '#888'}} />
                                          <YAxis fontSize={10} domain={[0, 21]} tick={{fill: '#888'}} />
                                          <RechartsTooltip
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                            labelFormatter={(val) => format(parseISO(val), 'd MMMM, yyyy')}
                                          />
                                          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </RechartsLineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed">
                                        <LucideLineChart className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                                        <p className="text-xs text-muted-foreground">Se necesitan al menos 2 pruebas completadas para generar la gráfica.</p>
                                      </div>
                                    )}
                                  </div>
                                </Card>

                                {/* PHQ-9 Chart */}
                                <Card className="p-6 border-border/50 shadow-soft">
                                  <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-sm uppercase tracking-wide text-accent">Depresión (PHQ-9)</h4>
                                    <Activity className="h-4 w-4 text-accent opacity-30" />
                                  </div>
                                  <div className="h-[280px] w-full">
                                    {patientTests.filter(t => t.test_type === 'phq9' && t.status === 'completed').length >= 2 ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart data={patientTests.filter(t => t.test_type === 'phq9' && t.status === 'completed').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                          <XAxis dataKey="created_at" tickFormatter={(val) => format(parseISO(val), 'd MMM')} fontSize={10} tick={{fill: '#888'}} />
                                          <YAxis fontSize={10} domain={[0, 27]} tick={{fill: '#888'}} />
                                          <RechartsTooltip
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                            labelFormatter={(val) => format(parseISO(val), 'd MMMM, yyyy')}
                                          />
                                          <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--accent))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </RechartsLineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed">
                                        <LucideLineChart className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                                        <p className="text-xs text-muted-foreground">Se necesitan al menos 2 pruebas completadas para generar la gráfica.</p>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="tests" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Historial de Psicometría</h3>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-8 border-primary/20 text-primary"
                                  onClick={() => setIsAssignTestOpen(true)}
                                >
                                  Asignar Nueva
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {patientTests.map((t) => (
                                  <Card key={t.id} className="p-4 border-border/40 hover:border-primary/30 transition-all hover:shadow-medium cursor-default group">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center group-hover:bg-accent/10 transition-all">
                                        <Brain className="h-5 w-5 text-accent" />
                                      </div>
                                      <Badge className={t.status === 'completed' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                                        {t.status === 'completed' ? 'Completada' : 'Pendiente'}
                                      </Badge>
                                    </div>
                                    <h4 className="font-bold text-sm mb-1">{psychometricTests[t.test_type]?.name || t.test_type}</h4>
                                    <p className="text-[10px] text-muted-foreground mb-4">{format(parseISO(t.created_at), 'd MMMM, yyyy', { locale: es })}</p>

                                    {t.status === 'completed' && (
                                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                        <div className="text-xs font-bold text-accent">Score: {t.score}</div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-[10px] uppercase font-bold tracking-wider px-2 hover:bg-black/5"
                                          onClick={() => setViewingTest(t)}
                                        >
                                          Ver Respuestas
                                        </Button>
                                      </div>
                                    )}
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="notes" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Cronología de Sesiones</h3>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="zen"
                                    className="text-xs h-8 gap-1.5 shadow-sm font-bold"
                                    onClick={() => {
                                      navigate(`/notes?patientId=${selectedPatient}&newNote=true`);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Nueva Nota
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs h-8 border-primary/20 text-primary">Exportar Historial</Button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {patientNotes.length === 0 ? (
                                  <div className="text-center p-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                    <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                                    <p className="text-muted-foreground font-medium">No hay notas de sesión registradas aún.</p>
                                  </div>
                                ) : (
                                  patientNotes.map((note) => (
                                    <div key={note.id} className="p-6 rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/30 shadow-sm transition-all duration-300 hover:shadow-medium hover:border-slate-200/50">
                                      <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-primary" />
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase opacity-50">Sesión Clínica</p>
                                            <p className="text-sm font-bold">{format(new Date(note.date), 'd MMMM, yyyy', { locale: es })}</p>
                                          </div>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary border-primary/20 rounded-md px-2.5 py-0.5">{note.session_number}</Badge>
                                      </div>
                                      <div className="line-clamp-3 text-sm text-slate-600 leading-relaxed border-l-2 border-primary/30 bg-primary/5 pl-4 py-3 pr-4 rounded-r-xl italic">
                                        "{Array.isArray(note.agenda) ? note.agenda.map(a => a.topic).join(', ') : 'Resumen de sesión'}"
                                      </div>
                                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/60">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs gap-1.5 hover:bg-primary/5 transition-colors"
                                          onClick={() => {
                                            setEditingNoteData(note);
                                            setNoteSheetMode('manual');
                                            setIsNoteSheetOpen(true);
                                          }}
                                        >
                                          <Edit3 className="h-3.5 w-3.5" />
                                          Editar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 text-xs gap-1.5 hover:bg-primary/5 transition-colors"
                                          onClick={() => handleDownloadNote(note)}
                                          disabled={isExportingNoteId === note.id}
                                        >
                                          {isExportingNoteId === note.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Download className="h-3.5 w-3.5" />
                                          )}
                                          Exportar
                                        </Button>
                                      </div>

                                    </div>
                                  ))
                                 )}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="history" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div>
                                <h3 className="text-xl font-bold">Historia Clínica</h3>
                                <p className="text-sm text-muted-foreground">Información diagnóstica y resumen clínico acumulado del paciente.</p>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Resumen clínico (editable) */}
                                <div className="lg:col-span-7 space-y-4">
                                  <Card className="p-6 border-border/50 shadow-soft bg-white">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                      <h4 className="font-bold text-sm uppercase tracking-wide text-primary">Resumen Clínico General</h4>
                                      <ClipboardList className="h-4 w-4 text-primary opacity-40" />
                                    </div>
                                    <div className="space-y-4">
                                      <Textarea
                                        value={generalNotes}
                                        onChange={(e) => setGeneralNotes(e.target.value)}
                                        placeholder="Ingresa antecedentes heredofamiliares, patológicos, evolución general, diagnóstico presuntivo o notas de seguimiento a largo plazo..."
                                        className="min-h-[280px] bg-white border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed resize-none"
                                      />
                                      <div className="flex justify-end">
                                        <Button
                                          size="sm"
                                          variant="zen"
                                          disabled={isSavingGeneralNotes}
                                          onClick={handleSaveGeneralNotes}
                                          className="h-9 px-4 rounded-xl text-xs font-bold gap-2 shadow-sm"
                                        >
                                          {isSavingGeneralNotes ? (
                                            <>
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              Guardando...
                                            </>
                                          ) : (
                                            <>
                                              <Save className="h-3.5 w-3.5" />
                                              Guardar Cambios
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                </div>

                                {/* Diagnósticos y estadísticas */}
                                <div className="lg:col-span-5 space-y-6">
                                  <Card className="p-6 border-border/50 shadow-soft bg-white">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                      <h4 className="font-bold text-sm uppercase tracking-wide text-secondary">Diagnósticos Registrados</h4>
                                      <Brain className="h-4 w-4 text-secondary opacity-40" />
                                    </div>
                                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-zen">
                                      {(() => {
                                        const activeDiagnoses = Array.isArray(patientNotes) 
                                          ? patientNotes
                                              .filter(n => n.cie10_code || n.diagnostico_principal)
                                              .reduce((acc: any[], current) => {
                                                const code = current.cie10_code || 'S/C';
                                                const desc = current.cie10_description || 'Diagnóstico principal';
                                                const principal = current.diagnostico_principal || '';
                                                const exists = acc.find(item => item.code === code && item.principal === principal);
                                                if (!exists) {
                                                  acc.push({
                                                    code,
                                                    description: desc,
                                                    principal,
                                                    date: current.date,
                                                    sessionNumber: current.session_number
                                                  });
                                                }
                                                return acc;
                                              }, [])
                                          : [];
                                        
                                        if (activeDiagnoses.length === 0) {
                                          return (
                                            <p className="text-xs text-muted-foreground text-center py-6">
                                              No hay diagnósticos CIE-10 registrados en las sesiones.
                                            </p>
                                          );
                                        }

                                        return activeDiagnoses.map((diag, index) => (
                                          <div key={index} className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Badge className="bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/15 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                {diag.code}
                                              </Badge>
                                              <span className="text-[10px] text-muted-foreground">Sesión {diag.sessionNumber} ({format(new Date(diag.date), 'dd/MM/yy')})</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-800">{diag.description}</p>
                                            {diag.principal && (
                                              <p className="text-[11px] text-slate-500 mt-0.5 italic">"{diag.principal}"</p>
                                            )}
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  </Card>

                                  <Card className="p-6 border-border/50 shadow-soft bg-white">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                                      <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">Resumen del Expediente</h4>
                                      <Clock className="h-4 w-4 text-slate-500 opacity-40" />
                                    </div>
                                    <div className="space-y-3.5 text-xs">
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Total de Consultas:</span>
                                        <span className="font-bold text-slate-800">{patientNotes.length} sesiones</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Primera Sesión:</span>
                                        <span className="font-semibold text-slate-700">
                                          {patientNotes.length > 0 
                                            ? format(new Date(patientNotes[patientNotes.length - 1].date), "d 'de' MMMM, yyyy", { locale: es }) 
                                            : 'Sin registro'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-medium">Última Sesión:</span>
                                        <span className="font-semibold text-slate-700">
                                          {patientNotes.length > 0 
                                            ? format(new Date(patientNotes[0].date), "d 'de' MMMM, yyyy", { locale: es }) 
                                            : 'Sin registro'}
                                        </span>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="economy" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-8">
                              <h3 className="text-xl font-bold">Estado de Cuenta</h3>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                  <div>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Total Pagado</p>
                                    <p className="text-3xl font-black text-primary">
                                      ${patientPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + Number(p.amount), 0)}
                                    </p>
                                  </div>
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-primary" />
                                  </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-secondary/5 border border-secondary/20 flex items-center justify-between">
                                  <div>
                                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                    <p className="text-3xl font-black text-secondary">
                                      ${patientPayments.filter(p => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0)}
                                    </p>
                                  </div>
                                  <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-secondary" />
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-border overflow-hidden shadow-soft bg-white">
                                <div className="bg-muted/30 px-6 py-4 border-b border-border">
                                  <h4 className="text-sm font-bold flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                    Detalle de Transacciones
                                  </h4>
                                </div>
                                <div className="divide-y divide-border">
                                  {patientPayments.map((p) => (
                                    <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", p.status === 'paid' ? 'bg-success/10' : 'bg-warning/10')}>
                                          <DollarSign className={cn("h-4 w-4", p.status === 'paid' ? 'text-success' : 'text-warning')} />
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold">${p.amount}</p>
                                          <p className="text-[10px] text-muted-foreground">{p.method.charAt(0).toUpperCase() + p.method.slice(1)} • {format(parseISO(p.paid_at || p.created_at), 'd MMM')}</p>
                                        </div>
                                      </div>
                                      <Badge variant={p.status === 'paid' ? 'outline' : 'secondary'} className={cn("text-[9px] uppercase tracking-widest px-2", p.status === 'paid' ? 'border-success/30 text-success' : '')}>
                                        {p.status === 'paid' ? 'Cobrado' : 'Pendiente'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="documents" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Paperclip className="h-5 w-5 text-primary" /> Documentos Adjuntos
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-1">Sube y gestiona archivos del expediente clínico.</p>
                                </div>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  {patientDocuments.length} {patientDocuments.length === 1 ? 'archivo' : 'archivos'}
                                </Badge>
                              </div>

                              {/* Drag & Drop Upload Zone */}
                              <div
                                className={cn(
                                  "relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 text-center cursor-pointer group",
                                  isDragging 
                                    ? "border-primary bg-primary/10 scale-[1.02]" 
                                    : "border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-primary/5"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  setIsDragging(false);
                                  const files = Array.from(e.dataTransfer.files);
                                  if (files.length === 0) return;
                                  await handleFileUpload(files);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx"
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) await handleFileUpload(files);
                                    e.target.value = '';
                                  }}
                                />
                                <div className={cn(
                                  "h-16 w-16 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-all duration-300",
                                  isDragging ? "bg-primary/20 scale-110" : "bg-primary/5 group-hover:bg-primary/10 group-hover:scale-105"
                                )}>
                                  {isUploading ? (
                                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                  ) : (
                                    <Upload className={cn("h-8 w-8 transition-colors", isDragging ? "text-primary" : "text-primary/40 group-hover:text-primary/70")} />
                                  )}
                                </div>
                                <p className="font-bold text-foreground/80">
                                  {isUploading ? 'Subiendo archivos...' : isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí o haz clic para seleccionar'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  PDF, Imágenes, Word, Excel · Máximo 50MB por archivo
                                </p>
                              </div>

                              {/* Documents Grid */}
                              {dataLoading ? (
                                <div className="flex justify-center p-12">
                                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                </div>
                              ) : patientDocuments.length === 0 ? (
                                <div className="text-center p-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                  <Paperclip className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                                  <p className="text-muted-foreground font-medium">No hay documentos adjuntos.</p>
                                  <p className="text-xs text-muted-foreground mt-1">Sube el primer archivo para comenzar el expediente digital.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {patientDocuments.map((doc) => {
                                    const isImage = /\.(jpg|jpeg|png|webp|heic)$/i.test(doc.file_name);
                                    const isPdf = /\.pdf$/i.test(doc.file_name);
                                    const fileSize = doc.file_size < 1024 * 1024 
                                      ? `${(doc.file_size / 1024).toFixed(1)} KB` 
                                      : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`;

                                    return (
                                      <Card key={doc.id} className="group p-4 border-border/40 hover:border-primary/30 transition-all hover:shadow-medium overflow-hidden">
                                        <div className="flex items-start gap-4">
                                          <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110",
                                            isImage ? "bg-accent/10" : isPdf ? "bg-destructive/10" : "bg-primary/10"
                                          )}>
                                            {isImage ? (
                                              <Image className={cn("h-5 w-5", "text-accent")} />
                                            ) : isPdf ? (
                                              <FileText className="h-5 w-5 text-destructive" />
                                            ) : (
                                              <File className="h-5 w-5 text-primary" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors" title={doc.file_name}>
                                              {doc.file_name}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-[10px] text-muted-foreground font-medium">{fileSize}</span>
                                              <span className="text-muted-foreground/30">·</span>
                                              <span className="text-[10px] text-muted-foreground">{format(parseISO(doc.created_at), 'd MMM, yyyy', { locale: es })}</span>
                                            </div>
                                            {doc.category && doc.category !== 'general' && (
                                              <Badge variant="outline" className="mt-2 text-[8px] uppercase tracking-widest">
                                                {doc.category}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-bold uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                                            onClick={async () => {
                                              const { data } = await supabase.storage
                                                .from('patient-documents')
                                                .createSignedUrl(doc.storage_path, 300);
                                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                              else toast.error('No se pudo generar el enlace de descarga.');
                                            }}
                                          >
                                            <Download className="h-3 w-3 mr-1.5" /> Descargar
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                            onClick={async () => {
                                              if (!window.confirm(`¿Eliminar "${doc.file_name}"?`)) return;
                                              const { error: delStorageErr } = await supabase.storage
                                                .from('patient-documents')
                                                .remove([doc.storage_path]);
                                              if (delStorageErr) { toast.error('Error al eliminar archivo.'); return; }
                                              await supabase.from('patient_documents').update({ deleted_at: new Date().toISOString() }).eq('id', doc.id);
                                              setPatientDocuments(prev => prev.filter(d => d.id !== doc.id));
                                              toast.success('Documento eliminado.');
                                            }}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TabsContent>

                          <TabsContent value="whatsapp" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-bold flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5 text-success" /> Mensajes WhatsApp
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-1">Envía mensajes predefinidos con un solo clic</p>
                                </div>
                                {selectedPatientData.phone && (
                                  <Badge className="bg-success/10 text-success border-success/20">
                                    {selectedPatientData.phone}
                                  </Badge>
                                )}
                              </div>

                              <div className="mb-6 flex justify-center w-full">
                                <PatientWhatsAppLink patient={selectedPatientData} />
                              </div>

                              {!selectedPatientData.phone ? (
                                <div className="text-center p-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                  <Phone className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                                  <p className="text-muted-foreground font-medium">Este paciente aún no tiene teléfono vinculado.</p>
                                  <p className="text-xs text-muted-foreground mt-1">Usa el enlace de invitación de arriba para que el paciente vincule su número automáticamente, o edita su perfil.</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Recordatorio de Cita */}
                                  {(() => {
                                    const phone = selectedPatientData.phone.replace(/[^0-9]/g, '');
                                    const name = selectedPatientData.name?.split(' ')[0] || 'paciente';
                                    const nextApt = selectedPatientData._next_appointment;
                                    const nextModality = selectedPatientData._next_appointment_modality;
                                    const nextLocation = selectedPatientData._next_appointment_location;

                                    let formattedDate = '[Fecha]';
                                    let formattedTime = '[Hora]';
                                    if (nextApt) {
                                      const aptDateObj = parseISO(nextApt);
                                      formattedDate = format(aptDateObj, "EEEE d 'de' MMMM", { locale: es });
                                      formattedTime = format(aptDateObj, "HH:mm");
                                    }

                                    const templates = [
                                      {
                                        id: 'reminder_short',
                                        title: 'Recordatorio (Corto)',
                                        description: nextApt ? `Próxima: ${format(parseISO(nextApt), "d MMM, HH:mm", { locale: es })}` : 'Recordatorio corto de cita',
                                        icon: <Calendar className="h-5 w-5" />,
                                        color: 'primary',
                                        message: `¡Hola, ${name}! ✨ Te esperamos el ${formattedDate} a las ${formattedTime} para nuestra cita. Estamos listos para recibirte. Si necesitas cambiar algo, por favor avísanos. ¡Nos vemos pronto!`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'reminder_presential',
                                        title: 'Recordatorio Presencial',
                                        description: nextLocation ? `Ubicación: ${nextLocation}` : 'Recordatorio con ubicación física',
                                        icon: <MapPin className="h-5 w-5" />,
                                        color: 'success',
                                        message: (() => {
                                          const loc = nextLocation || '[Dirección/Lugar]';
                                          const mapLink = nextLocation 
                                            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextLocation)}`
                                            : '[Link de Google Maps]';
                                          return `¡Hola, ${name}! ✨ Te esperamos el ${formattedDate} a las ${formattedTime} en ${loc}. Puedes guiarte con este mapa: ${mapLink}. Si necesitas algo, aquí estamos. ¡Qué ganas de verte!`;
                                        })(),
                                        disabled: false,
                                      },
                                      {
                                        id: 'payment_reminder',
                                        title: 'Recordatorio de Pago',
                                        description: 'Aviso de vencimiento de pago',
                                        icon: <DollarSign className="h-5 w-5" />,
                                        color: 'warning',
                                        message: `¡Hola, ${name}! Un recordatorio amable: tu pago por sesión vence el ${formattedDate !== '[Fecha]' ? formattedDate : '[Fecha]'}. Si ya lo realizaste, ignora este mensaje. ¡Gracias por tu confianza!`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'reactivation',
                                        title: 'Reactivar / Reagendar',
                                        description: 'Invitar a retomar su espacio',
                                        icon: <Activity className="h-5 w-5" />,
                                        color: 'secondary',
                                        message: `¡Hola, ${name}! Te hemos extrañado. 😊 ¿Te gustaría retomar tu espacio con nosotros? Consulta nuestra disponibilidad aquí: https://app.saudade.mx/reservar/${organization?.slug || 'psicologo'}. ¡Será un gusto volver a coincidir!`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'task_reminder',
                                        title: 'Recordatorio de Tarea',
                                        description: 'Notificar tarea pendiente',
                                        icon: <ClipboardList className="h-5 w-5" />,
                                        color: 'accent',
                                        message: `¡Hola, ${name}! Paso a recordarte que tienes pendiente completar: [Nombre de la tarea] para el [Fecha]. ¡Cada avance cuenta! Estamos aquí para cualquier duda.`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'followup_short',
                                        title: 'Seguimiento Post-Sesión',
                                        description: 'Preguntar cómo se sintió hoy',
                                        icon: <Brain className="h-5 w-5" />,
                                        color: 'accent',
                                        message: `¡Hola, ${name}! Esperamos que hayas disfrutado tu experiencia hoy. ¿Todo bien con tu sesión? Si tienes alguna duda o comentario, nos encantaría escucharte. ¡Gracias!`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'birthday_congrats',
                                        title: 'Cumpleaños',
                                        description: 'Felicitación de cumpleaños',
                                        icon: <Sparkles className="h-5 w-5" />,
                                        color: 'success',
                                        message: `¡Feliz cumpleaños, ${name}! ✨ Celebramos tu vida y nos da mucha alegría acompañarte. Que este año sea increíble y esté lleno de momentos bonitos. ¡Disfruta mucho tu día! 🎂🤍`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'test',
                                        title: 'Prueba Psicométrica',
                                        description: 'Enviar link de test pendiente',
                                        icon: <ClipboardList className="h-5 w-5" />,
                                        color: 'accent',
                                        message: `Hola ${name}, te comparto el enlace para completar tu prueba psicológica. Es rápida y nos ayudará mucho en tu proceso. 📋`,
                                        disabled: false,
                                      },
                                      {
                                        id: 'custom',
                                        title: 'Mensaje Libre',
                                        description: 'Abre WhatsApp sin texto predefinido',
                                        icon: <Send className="h-5 w-5" />,
                                        color: 'success',
                                        message: '',
                                        disabled: false,
                                      },
                                    ];

                                    return templates.map((tpl) => (
                                      <div
                                        key={tpl.id}
                                        onClick={() => {
                                          if (tpl.id === 'custom') {
                                            window.open(`https://wa.me/${phone}`, '_blank');
                                          } else {
                                            handleIntegratedSend(phone, tpl.message, tpl.id);
                                          }
                                        }}
                                        className={cn(
                                          "group p-5 rounded-2xl border transition-all duration-200 hover:shadow-medium hover:-translate-y-1 cursor-pointer",
                                          `border-${tpl.color}/20 hover:border-${tpl.color}/40 bg-${tpl.color}/5 hover:bg-${tpl.color}/10`
                                        )}
                                      >
                                        <div className="flex items-start justify-between mb-3">
                                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", `bg-${tpl.color}/10 text-${tpl.color}`)}>
                                            {tpl.icon}
                                          </div>
                                          <Send className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <h4 className="font-bold text-sm mb-1">{tpl.title}</h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{tpl.description}</p>
                                        {tpl.message && (
                                          <div className="mt-3 p-3 rounded-xl bg-white/60 border border-border/30 text-xs text-foreground/70 leading-relaxed line-clamp-2 italic">
                                            "{tpl.message}"
                                          </div>
                                        )}
                                      </div>
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </div>
                      </div>
                    </div>
                </Tabs>
              </>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-700">
                <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                      <TabsList className="bg-muted/50 p-1 mb-4">
                        <TabsTrigger value="pacientes" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Pacientes Activos</TabsTrigger>
                        <TabsTrigger value="leads" className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          Prospectos Web
                          {leads.length > 0 && (
                            <Badge variant="zen" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary/20 text-primary border-none">
                              {leads.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="pacientes" className="m-0 space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold tracking-tight">Directorio de Pacientes</h2>
                            <p className="text-sm text-muted-foreground font-medium">Gestiona y visualiza todos tus expedientes activos.</p>
                          </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nombre, correo o teléfono..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="pl-9 h-10 bg-muted/30 border-border/50 focus:bg-background transition-all rounded-xl"
                      />
                      {searchFilter && (
                        <button 
                          onClick={() => setSearchFilter('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border/50 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                          "h-8 text-[10px] font-bold uppercase tracking-widest transition-all",
                          viewMode === 'mosaic' ? "bg-white shadow-sm text-primary" : "opacity-50"
                        )}
                        onClick={() => {
                          setViewMode('mosaic');
                          localStorage.setItem('patientsViewMode', 'mosaic');
                        }}
                      >
                        Mosaico
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                          "h-8 text-[10px] font-bold uppercase tracking-widest transition-all",
                          viewMode === 'list' ? "bg-white shadow-sm text-primary" : "opacity-50"
                        )}
                        onClick={() => {
                          setViewMode('list');
                          localStorage.setItem('patientsViewMode', 'list');
                        }}
                      >
                        Lista
                      </Button>
                    </div>

                    <div className="shrink-0">
                      <Select 
                        value={sortBy}
                        onValueChange={(value) => {
                          setSortBy(value as any);
                          localStorage.setItem('patientsSortBy', value);
                        }}
                      >
                        <SelectTrigger className="h-10 bg-muted/50 border-border/50 text-[10px] font-bold uppercase tracking-widest rounded-xl px-4 hover:bg-background transition-all min-w-[140px]">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          <SelectItem value="name_asc" className="text-[10px] font-bold uppercase tracking-widest">A - Z</SelectItem>
                          <SelectItem value="name_desc" className="text-[10px] font-bold uppercase tracking-widest">Z - A</SelectItem>
                          <SelectItem value="newest" className="text-[10px] font-bold uppercase tracking-widest">Recientes</SelectItem>
                          <SelectItem value="oldest" className="text-[10px] font-bold uppercase tracking-widest">Antiguos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/60">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20 mb-4" />
                    <p className="text-muted-foreground font-medium">Cargando directorio...</p>
                  </div>
                ) : filteredPatientsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/60">
                    <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                      <Users className="h-10 w-10 text-primary opacity-20" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground/60">
                      {searchFilter ? 'No se encontraron resultados' : 'No hay pacientes registrados'}
                    </h3>
                    <p className="text-muted-foreground mt-1 max-w-xs text-center text-sm">
                      {searchFilter 
                        ? `No hay pacientes que coincidan con "${searchFilter}".`
                        : 'Comienza agregando a tu primer paciente para ver su expediente aquí.'}
                    </p>
                    {!searchFilter && (
                      <Button variant="zen" className="mt-6" onClick={() => setIsNewPatientOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Agregar Paciente
                      </Button>
                    )}
                  </div>
                ) : viewMode === 'mosaic' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPatientsList.map((patient) => (
                      <SwipeablePatientCard
                        key={patient.id}
                        patient={patient}
                        onSelect={selectPatient}
                        swipedPatientId={swipedPatientId}
                        setSwipedPatientId={setSwipedPatientId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-[80px] text-[10px] font-bold uppercase tracking-widest">Avatar</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest">Nombre del Paciente</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest">Contacto</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest">Estado</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest">Última Sesión</TableHead>
                          <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest px-8">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPatientsList.map((patient) => (
                          <TableRow 
                            key={patient.id} 
                            className="group cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => selectPatient(patient.id)}
                          >
                            <TableCell>
                              <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold",
                                getAvatarTheme(patient.name)
                              )}>
                                {getInitials(patient.name)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-sm tracking-tight">{patient.name}</span>
                                <span className="text-[10px] text-muted-foreground opacity-60 font-mono">ID: {patient.id.slice(0,8)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <Mail className="h-3 w-3 text-primary opacity-60" />
                                  <span className="truncate max-w-[150px]">{patient.email || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Phone className="h-3 w-3 text-primary opacity-60" />
                                  <span>{patient.phone || '—'}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter bg-white">
                                {patient.status?.replace(/_/g, ' ') || 'Activo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {patient.last_session 
                                    ? format(new Date(patient.last_session), 'd MMM, yyyy', { locale: es })
                                    : <span className="text-muted-foreground opacity-40">Sin registros</span>}
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <Clock className={cn("h-2.5 w-2.5", patient._next_appointment ? "text-success" : "text-muted-foreground opacity-40")} />
                                  {patient._next_appointment 
                                    ? <span className="text-success font-bold uppercase">Cita: {format(parseISO(patient._next_appointment), 'd MMM', { locale: es })}</span>
                                    : <span className="text-muted-foreground opacity-40">Sin cita</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-8">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                              >
                                Ver Expediente
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="leads" className="m-0 space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold tracking-tight">Nuevos Prospectos Web</h2>
                    <p className="text-sm text-muted-foreground font-medium">Pacientes que agendaron online y están pendientes de confirmar.</p>
                  </div>
                </div>

                {isLeadsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/60">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20 mb-4" />
                    <p className="text-muted-foreground font-medium">Cargando prospectos...</p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border/60">
                    <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                      <Users className="h-10 w-10 text-primary opacity-20" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground/60">No hay prospectos nuevos</h3>
                    <p className="text-muted-foreground mt-1 max-w-xs text-center text-sm">
                      Los pacientes que agenden desde tu portal web público aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {leads.map((lead) => (
                      <Card key={lead.id} className="group relative overflow-hidden border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner", getAvatarTheme(lead.name))}>
                              {getInitials(lead.name)}
                            </div>
                            <Badge className="bg-warning text-warning-foreground border-none">Nuevo</Badge>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                            <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">{lead.name}</h3>
                            {lead.age && <p className="text-xs text-muted-foreground">{lead.age} años</p>}
                          </div>

                          <div className="space-y-2.5 mb-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4 text-primary/60 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-4 w-4 text-primary/60 shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                            {lead.reason_for_consultation && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                                <FileText className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 text-xs italic">"{lead.reason_for_consultation}"</span>
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            className="w-full font-bold shadow-md hover:shadow-lg transition-all"
                            onClick={() => handleConvertLead(lead)}
                          >
                            <Sparkles className="h-4 w-4 mr-2" /> Convertir en Paciente
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
        </div>
      </div>
    </Layout>

      {/* New Patient Dialog */}
      <NewPatientDialog
        open={isNewPatientOpen}
        onOpenChange={(open) => {
          setIsNewPatientOpen(open);
          if (!open) setEditingPatient(null);
        }}
        onPatientAdded={() => {
          fetchPatients();
          setSearchRefreshTrigger(prev => prev + 1);
          setEditingPatient(null);
        }}
        editingPatient={editingPatient}
      />

      {selectedPatientData && (
        <AssignTestDialog
          open={isAssignTestOpen}
          onOpenChange={setIsAssignTestOpen}
          patientId={selectedPatientData.id}
          patientName={selectedPatientData.name}
          onAssigned={() => {
            fetchPatientDetails(selectedPatientData.id); // Changed from fetchPatientSessionData to fetchPatientDetails
          }}
        />
      )}

      {/* Test Answers Dialog */}
      <Dialog open={!!viewingTest} onOpenChange={(open) => !open && setViewingTest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {viewingTest && (psychometricTests[viewingTest.test_type]?.name || viewingTest.test_type)}
            </DialogTitle>
            <DialogDescription>
              Resultados detallados y respuestas del paciente
            </DialogDescription>
          </DialogHeader>

          {viewingTest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Puntaje Total</p>
                  <p className="text-2xl font-black text-primary">{viewingTest.score} pts</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Interpretación</p>
                  <Badge variant="secondary" className="text-xs">{viewingTest.interpretation}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2 px-1">
                  <Brain className="h-4 w-4 text-primary" /> Respuestas Registradas
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {viewingTest && psychometricTests[viewingTest.test_type]?.questions.map((q) => {
                    const patientAnswerValue = viewingTest.answers?.[q.id] as number | undefined;
                    const selectedOption = psychometricTests[viewingTest.test_type].options.find(opt => opt.value === patientAnswerValue);
                    
                    return (
                      <div key={q.id} className="p-3 rounded-xl border bg-card/50 shadow-sm space-y-2">
                        <p className="text-xs font-medium leading-tight">{q.text}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {selectedOption ? selectedOption.label : 'Sin respuesta'}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {patientAnswerValue !== undefined ? `(${patientAnswerValue} pts)` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NoteEditorSheet
        isOpen={isNoteSheetOpen}
        onClose={() => {
          setIsNoteSheetOpen(false);
          setEditingNoteData(null);
        }}
        note={editingNoteData}
        patientId={selectedPatientData?.id || ''}
        patientName={selectedPatientData?.name || ''}
        patientDOB={selectedPatientData?.date_of_birth || selectedPatientData?.birth_date}
        initialMode={noteSheetMode}
        onNoteUpdated={() => {
          if (selectedPatientData?.id) {
            fetchPatientDetails(selectedPatientData.id);
          }
        }}
      />

      {/* Mobile Floating Action Button (FAB) for Patients List */}
      {!selectedPatient && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          <FeatureGate feature="core_patients" inline>
            <Button
              variant="zen"
              className="rounded-full shadow-lg shadow-primary/30 h-12 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-primary text-white border border-primary/10 transition-transform active:scale-95"
              onClick={() => setIsNewPatientOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nuevo Paciente
            </Button>
          </FeatureGate>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) for Patient Record */}
      {selectedPatientData && ['timeline', 'notes', 'history', 'evolution'].includes(activePatientTab) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Button
            variant="zen"
            className="rounded-full shadow-lg shadow-primary/30 h-12 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-primary text-white border border-primary/10 transition-transform active:scale-95"
            onClick={() => {
              setEditingNoteData(null);
              setNoteSheetMode('manual');
              setIsNoteSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Registrar Consulta
          </Button>
        </div>
      )}

    </>
  );
};

export default Patients;


import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import MFASetup from '@/components/auth/MFASetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Settings as SettingsIcon, ShieldCheck, User, Bell,
    Loader2, CheckCircle2, DollarSign, Clock, Mail, MessageSquare, CalendarOff, Plus, Trash2, Copy, CalendarPlus, Percent,
    Building2, CreditCard, Unlink, AlertTriangle, PenTool, Eraser, RotateCcw, ChevronUp, ChevronDown, ExternalLink, GraduationCap, Briefcase,
    Instagram, Linkedin, Facebook, Video, Plug, LayoutGrid, ClipboardList, BookOpen, Share2, GripVertical, HelpCircle, ToggleLeft, Type, AlignLeft, CheckSquare, CircleDot, List,
    FileText, Eye, Lock, Palette, Brain, Target, MessageCircle, Lightbulb, PenLine
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '57982623920-afu95mjoklp5pmipaejstbeq67gqgr03.apps.googleusercontent.com';

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initCodeClient: (config: {
                        client_id: string;
                        scope: string;
                        ux_mode: 'popup' | 'redirect';
                        callback: (response: { code: string }) => Promise<void>;
                    }) => { requestCode: () => void };
                };
            };
        };
    }
}
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AvatarUpload from '@/components/settings/AvatarUpload';
import SubscriptionTab from '@/components/settings/SubscriptionTab';
import useDarkMode from '@/hooks/useDarkMode';

// ── Constants ─────────────────────────────────────────────────────────────────

const PREFIJOS = [
    { value: 'none', label: 'Sin prefijo' },
    { value: 'Psic.', label: 'Psic.' },
    { value: 'Lic.', label: 'Lic.' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Dra.', label: 'Dra.' },
    { value: 'Mtro.', label: 'Mtro.' },
    { value: 'Mtra.', label: 'Mtra.' },
    { value: 'Esp.', label: 'Esp.' },
];

const TIPOS_CEDULA = [
    { value: 'licenciatura', label: 'Licenciatura' },
    { value: 'especialidad', label: 'Especialidad' },
    { value: 'maestria', label: 'Maestría' },
    { value: 'doctorado', label: 'Doctorado' },
    { value: 'otro', label: 'Otro' },
];

interface Cedula {
    id: string;
    numero: string;
    tipo: string;
    institucion: string;
}

interface Curso {
    id: string;
    nombre: string;
    institucion: string;
    anio: string;
}

interface Service {
    id?: string;
    name: string;
    description: string;
    duration: number;
    price: number;
    is_public: boolean;
    color: string;
    active: boolean;
    commission_percentage?: number | null;
    reschedule_policy_hours?: number | null;
}

interface BookingQuestion {
    id?: string;
    label: string;
    type: 'text' | 'textarea' | 'yes_no' | 'select_one' | 'select_many';
    options: string[];
    is_required: boolean;
    sort_order: number;
    active: boolean;
}

const QUESTION_TYPES = [
    { value: 'text', label: 'Texto corto', icon: Type },
    { value: 'textarea', label: 'Texto largo', icon: AlignLeft },
    { value: 'yes_no', label: 'Sí / No', icon: ToggleLeft },
    { value: 'select_one', label: 'Opción única', icon: CircleDot },
    { value: 'select_many', label: 'Opción múltiple', icon: CheckSquare },
];

interface NoteTemplate {
    id?: string;
    name: string;
    description: string;
    sections: string[];
    section_labels: Record<string, string>;
    is_system: boolean;
    color: string;
    active: boolean;
}

const TEMPLATE_SECTIONS: { key: string; label: string; icon: React.ElementType; description: string }[] = [
    { key: 'mood', label: 'Estado de Ánimo', icon: Brain, description: 'Slider 1-100 con notas' },
    { key: 'bridge', label: 'Puente Intersesión', icon: ClipboardList, description: 'Revisión de tareas previas' },
    { key: 'agenda', label: 'Agenda / Conceptualización', icon: List, description: 'Temas, pensamientos, emociones' },
    { key: 'beliefs', label: 'Creencias', icon: Lightbulb, description: 'Nucleares y alternativas' },
    { key: 'action_plan', label: 'Plan de Acción', icon: Target, description: 'Tareas y recomendaciones' },
    { key: 'free_text', label: 'Texto Libre', icon: PenLine, description: 'Campo abierto narrativo' },
    { key: 'techniques', label: 'Técnicas', icon: SettingsIcon, description: 'Intervenciones aplicadas' },
    { key: 'observations', label: 'Observaciones', icon: Eye, description: 'Notas del terapeuta' },
    { key: 'goals', label: 'Objetivos', icon: Target, description: 'Metas de la sesión' },
    { key: 'homework', label: 'Tarea para Casa', icon: BookOpen, description: 'Ejercicios para el paciente' },
];

const TEMPLATE_COLORS: { value: string; bg: string; text: string }[] = [
    { value: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
    { value: 'green', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { value: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
    { value: 'rose', bg: 'bg-rose-100', text: 'text-rose-700' },
    { value: 'violet', bg: 'bg-violet-100', text: 'text-violet-700' },
    { value: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

const DIAS_SEMANA = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
];

type TabId = 'perfil' | 'horarios' | 'servicios' | 'preguntas' | 'plantillas' | 'seguridad' | 'organizacion' | 'suscripcion' | 'integraciones' | 'apariencia';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'perfil', label: 'Perfil Profesional', icon: User },
    { id: 'apariencia', label: 'Apariencia', icon: Palette },
    { id: 'horarios', label: 'Horarios y Comisiones', icon: Clock },
    { id: 'servicios', label: 'Servicios de Agenda', icon: LayoutGrid },
    { id: 'preguntas', label: 'Preguntas de Reserva', icon: HelpCircle },
    { id: 'plantillas', label: 'Plantillas de Notas', icon: FileText },
    { id: 'organizacion', label: 'Mi Organización', icon: Building2 },
    { id: 'integraciones', label: 'Integraciones', icon: Plug },
    { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
    { id: 'seguridad', label: 'Seguridad y Notificaciones', icon: ShieldCheck },
];

const TAB_GROUPS = [
    {
        title: "Especialista",
        tabs: ['perfil', 'apariencia', 'horarios', 'seguridad']
    },
    {
        title: "Herramientas Clínicas",
        tabs: ['servicios', 'preguntas', 'plantillas']
    },
    {
        title: "Administración",
        tabs: ['organizacion', 'integraciones', 'suscripcion']
    }
];

// ── Component ─────────────────────────────────────────────────────────────────

const Settings = () => {
    const { user } = useAuth();
    const { organization, availableOrganizations, switch: switchOrg, isAdmin } = useOrganization();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('perfil');
    const { isDarkMode, toggleDarkMode } = useDarkMode();
    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
    const [hasOutlookCalendar, setHasOutlookCalendar] = useState(false);
    const [hasZoom, setHasZoom] = useState(false);
    const [hasStripeAccount, setHasStripeAccount] = useState(false);
    const [stripeStatus, setStripeStatus] = useState<'none' | 'pending' | 'active'>('none');
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [isLinkingStripe, setIsLinkingStripe] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
    const [codeClient, setCodeClient] = useState<{ requestCode: () => void } | null>(null);
    const [integrationFilter, setIntegrationFilter] = useState<'all' | 'calendar' | 'video' | 'payments'>('all');

    const [profile, setProfile] = useState({
        prefix: 'none',
        full_name: '',
        email: '',
        avatar_url: null as string | null,
        institucion_formadora: '',
        telefono_profesional: '',
        porcentaje_consultorio: 30,
        stripe_fee_percent: 5.14,
        slug: '',
        is_public: false,
        signature_data: null as string | null,
        bio: '',
        experience_years: 0,
        social_links: { instagram: '', linkedin: '', facebook: '' } as Record<string, string>,
        reschedule_policy_hours: 24,
    });

    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
    const [originalSlug, setOriginalSlug] = useState('');

    // Signature canvas refs
    const sigCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isSigDrawing, setIsSigDrawing] = useState(false);
    const [hasSigContent, setHasSigContent] = useState(false);
    const sigLastPos = useRef<{ x: number; y: number } | null>(null);

    const [cedulas, setCedulas] = useState<Cedula[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);

    const newCedulaDefault = (): Cedula => ({ id: crypto.randomUUID(), numero: '', tipo: 'licenciatura', institucion: '' });
    const newCursoDefault = (): Curso => ({ id: crypto.randomUUID(), nombre: '', institucion: '', anio: '' });

    const [newCedula, setNewCedula] = useState<Cedula>(newCedulaDefault());
    const [newCurso, setNewCurso] = useState<Curso>(newCursoDefault());
    const [showAddCedula, setShowAddCedula] = useState(false);
    const [showAddCurso, setShowAddCurso] = useState(false);

    const [horario, setHorario] = useState<{
        dias: Record<number, { activo: boolean; inicio: string; fin: string; max_sesiones?: number }>;
        dias_no_laborables: string[];
    }>({
        dias: {
            1: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
            2: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
            3: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
            4: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
            5: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
            6: { activo: false, inicio: '08:00', fin: '13:00', max_sesiones: 4 },
            0: { activo: false, inicio: '08:00', fin: '13:00', max_sesiones: 4 },
        },
        dias_no_laborables: [],
    });

    const [newNonWorkingDay, setNewNonWorkingDay] = useState('');

    const [notif, setNotif] = useState({
        psicologo_email: true,
        psicologo_whatsapp: false,
        paciente_email: true,
        paciente_whatsapp: false,
        recordatorio_24h_email: true,
        recordatorio_24h_whatsapp: false,
        recordatorio_horas: 24,
    });

    const [services, setServices] = useState<Service[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceFilter, setServiceFilter] = useState<'all' | 'public' | 'private'>('all');
    const [isSavingService, setIsSavingService] = useState(false);

    const [bookingQuestions, setBookingQuestions] = useState<BookingQuestion[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<BookingQuestion | null>(null);
    const [isSavingQuestion, setIsSavingQuestion] = useState(false);

    const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateView, setTemplateView] = useState<'system' | 'custom'>('system');

    // ── Load ──────────────────────────────────────────────────────────────────
    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('prefix, full_name, avatar_url, cedulas, cursos, institucion_formadora, telefono_profesional, porcentaje_consultorio, stripe_fee_percent, horario_atencion, notification_settings, slug, is_public, google_refresh_token, microsoft_refresh_token, zoom_refresh_token, stripe_account_id, stripe_account_status, signature_data, bio, experience_years, social_links, reschedule_policy_hours')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data?.google_refresh_token) {
                setHasGoogleCalendar(true);
            }
            if (data?.microsoft_refresh_token) {
                setHasOutlookCalendar(true);
            }
            if (data?.zoom_refresh_token) {
                setHasZoom(true);
            } else {
                setHasZoom(false);
            }
            if (data?.stripe_account_id) {
                const isActive = data.stripe_account_status === 'active';
                setHasStripeAccount(isActive);
                setStripeStatus(isActive ? 'active' : 'pending');
            } else {
                setHasStripeAccount(false);
                setStripeStatus('none');
            }

            setProfile({
                prefix: data?.prefix || 'none',
                full_name: data?.full_name || user.user_metadata?.full_name || '',
                email: user.email || '',
                avatar_url: data?.avatar_url || null,
                institucion_formadora: data?.institucion_formadora || '',
                telefono_profesional: data?.telefono_profesional || '',
                porcentaje_consultorio: data?.porcentaje_consultorio ?? 30,
                stripe_fee_percent: data?.stripe_fee_percent ?? 5.14,
                slug: data?.slug || '',
                is_public: data?.is_public || false,
                signature_data: data?.signature_data || null,
                bio: data?.bio || '',
                experience_years: data?.experience_years || 0,
                social_links: data?.social_links || { instagram: '', linkedin: '', facebook: '' },
                reschedule_policy_hours: data?.reschedule_policy_hours ?? 24,
            });
            setOriginalSlug(data?.slug || '');

            // Dynamic lists — stored as JSONB in profiles
            const d = data as { cedulas?: Cedula[]; cursos?: Curso[] };
            if (Array.isArray(d?.cedulas)) setCedulas(d.cedulas);
            if (Array.isArray(d?.cursos)) setCursos(d.cursos);

            if (data?.horario_atencion) {
                const h = data.horario_atencion;
                
                // Migración si viene en formato antiguo (array de días y horas globales)
                if (Array.isArray(h.dias)) {
                    const newDias: Record<number, { activo: boolean; inicio: string; fin: string; max_sesiones?: number }> = {};
                    [0, 1, 2, 3, 4, 5, 6].forEach(d => {
                        newDias[d] = {
                            activo: (h.dias as number[]).includes(d),
                            inicio: (h.inicio as string) || '08:00',
                            fin: (h.fin as string) || '17:00',
                            max_sesiones: 8,
                        };
                    });
                    setHorario({
                        dias: newDias,
                        dias_no_laborables: h.dias_no_laborables || [],
                    });
                } else if (h.dias) {
                    // Formato nuevo ya existe
                    setHorario(h);
                }
            }

            if (data?.notification_settings) {
                setNotif({
                    psicologo_email: data.notification_settings.psicologo_email ?? true,
                    psicologo_whatsapp: data.notification_settings.psicologo_whatsapp ?? false,
                    paciente_email: data.notification_settings.paciente_email ?? true,
                    paciente_whatsapp: data.notification_settings.paciente_whatsapp ?? false,
                    recordatorio_24h_email: data.notification_settings.recordatorio_24h_email ?? true,
                    recordatorio_24h_whatsapp: data.notification_settings.recordatorio_24h_whatsapp ?? false,
                    recordatorio_horas: data.notification_settings.recordatorio_horas ?? 24,
                });
            }
        } catch (err: unknown) {
            console.error('Error loading profile:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const fetchServices = useCallback(async () => {
        if (!user) return;
        setIsLoadingServices(true);
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setServices(data || []);
        } catch (err) {
            console.error('Error fetching services:', err);
        } finally {
            setIsLoadingServices(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'servicios') {
            fetchServices();
        }
    }, [activeTab, fetchServices]);

    const handleSaveService = async (serviceData: Service) => {
        if (!user || !organization) return;
        setIsSavingService(true);
        try {
            const payload = {
                ...serviceData,
                user_id: user.id,
                organization_id: organization.id
            };

            if (serviceData.id) {
                const { error } = await supabase
                    .from('services')
                    .update(payload)
                    .eq('id', serviceData.id);
                if (error) throw error;
                toast.success('Servicio actualizado');
            } else {
                const { error } = await supabase
                    .from('services')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Servicio creado');
            }
            setShowServiceModal(false);
            setEditingService(null);
            fetchServices();
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setIsSavingService(false);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        try {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Servicio eliminado');
            fetchServices();
        } catch (err: any) {
            toast.error('Error al eliminar: ' + err.message);
        }
    };

    // ── Booking Questions CRUD ────────────────────────────────────────────────
    const fetchBookingQuestions = useCallback(async () => {
        if (!user) return;
        setIsLoadingQuestions(true);
        try {
            const { data, error } = await supabase
                .from('booking_questions')
                .select('*')
                .eq('user_id', user.id)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            setBookingQuestions(data || []);
        } catch (err) {
            console.error('Error fetching booking questions:', err);
        } finally {
            setIsLoadingQuestions(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'preguntas') {
            fetchBookingQuestions();
        }
    }, [activeTab, fetchBookingQuestions]);


    const handleSaveQuestion = async (questionData: BookingQuestion) => {
        if (!user || !organization) return;
        setIsSavingQuestion(true);
        try {
            const payload = {
                ...questionData,
                user_id: user.id,
                organization_id: organization.id
            };

            if (questionData.id) {
                const { error } = await supabase
                    .from('booking_questions')
                    .update(payload)
                    .eq('id', questionData.id);
                if (error) throw error;
                toast.success('Pregunta actualizada');
            } else {
                // Set sort_order to the end
                payload.sort_order = bookingQuestions.length;
                const { error } = await supabase
                    .from('booking_questions')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Pregunta creada');
            }
            setShowQuestionModal(false);
            setEditingQuestion(null);
            fetchBookingQuestions();
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setIsSavingQuestion(false);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('¿Eliminar esta pregunta?')) return;
        try {
            const { error } = await supabase
                .from('booking_questions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Pregunta eliminada');
            fetchBookingQuestions();
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleToggleQuestion = async (id: string, active: boolean) => {
        try {
            const { error } = await supabase
                .from('booking_questions')
                .update({ active })
                .eq('id', id);
            if (error) throw error;
            setBookingQuestions(prev => prev.map(q => q.id === id ? { ...q, active } : q));
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleMoveQuestion = async (id: string, direction: 'up' | 'down') => {
        const idx = bookingQuestions.findIndex(q => q.id === id);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= bookingQuestions.length) return;

        const updated = [...bookingQuestions];
        [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
        // Update sort_order for both
        const updates = updated.map((q, i) => ({ ...q, sort_order: i }));
        setBookingQuestions(updates);

        try {
            await Promise.all([
                supabase.from('booking_questions').update({ sort_order: updates[idx].sort_order }).eq('id', updates[idx].id!),
                supabase.from('booking_questions').update({ sort_order: updates[swapIdx].sort_order }).eq('id', updates[swapIdx].id!),
            ]);
        } catch (err) {
            console.error('Error reordering:', err);
            fetchBookingQuestions(); // rollback
        }
    };


    // ── Note Templates CRUD ─────────────────────────────────────────────────
    const fetchNoteTemplates = useCallback(async () => {
        if (!user) return;
        setIsLoadingTemplates(true);
        try {
            const { data, error } = await supabase
                .from('note_templates')
                .select('*')
                .or(`is_system.eq.true,user_id.eq.${user.id}`)
                .order('is_system', { ascending: false })
                .order('name', { ascending: true });
            if (!error && data) setNoteTemplates(data);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setIsLoadingTemplates(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'plantillas') {
            fetchNoteTemplates();
        }
    }, [activeTab, fetchNoteTemplates]);

    const handleSaveTemplate = async (templateData: NoteTemplate) => {
        if (!user || !organization) return;
        setIsSavingTemplate(true);
        try {
            if (templateData.id) {
                const { error } = await supabase
                    .from('note_templates')
                    .update({
                        name: templateData.name,
                        description: templateData.description,
                        sections: templateData.sections,
                        section_labels: templateData.section_labels,
                        color: templateData.color,
                    })
                    .eq('id', templateData.id)
                    .eq('user_id', user.id);
                if (error) throw error;
                toast.success('Plantilla actualizada');
            } else {
                const { error } = await supabase
                    .from('note_templates')
                    .insert({
                        name: templateData.name,
                        description: templateData.description,
                        sections: templateData.sections,
                        section_labels: templateData.section_labels,
                        color: templateData.color,
                        is_system: false,
                        user_id: user.id,
                        organization_id: organization.id,
                    });
                if (error) throw error;
                toast.success('Plantilla creada');
            }
            setShowTemplateModal(false);
            setEditingTemplate(null);
            fetchNoteTemplates();
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('¿Eliminar esta plantilla?')) return;
        try {
            const { error } = await supabase.from('note_templates').delete().eq('id', id);
            if (error) throw error;
            toast.success('Plantilla eliminada');
            fetchNoteTemplates();
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    };

    const handleCodeResponse = useCallback(async (code: string) => {
        if (!user) return;
        setIsLinking(true);
        try {
            const { data, error } = await supabase.functions.invoke('google-auth-exchange', {
                body: { code, userId: user.id }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setHasGoogleCalendar(true);
            toast.success('¡Google Calendar conectado profesionalmente!');
            fetchProfile(); // Refresh profile to be sure
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error exchanging code:', error);
            toast.error('Error al vincular: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsLinking(false);
        }
    }, [user, fetchProfile]);

    const handleMicrosoftCodeResponse = useCallback(async (code: string) => {
        if (!user) return;
        setIsLinking(true);
        try {
            const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
            const { data, error } = await supabase.functions.invoke('microsoft-auth-exchange', {
                body: { code, userId: user.id, redirectUri }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setHasOutlookCalendar(true);
            toast.success('¡Microsoft 365 conectado correctamente!');
            fetchProfile();
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error exchanging MS code:', error);
            toast.error('Error al vincular Microsoft: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsLinking(false);
        }
    }, [user, fetchProfile]);

    const handleZoomCodeResponse = useCallback(async (code: string) => {
        if (!user) return;
        setIsLinking(true);
        try {
            const redirectUri = `${window.location.origin}/auth/zoom/callback`;
            const { data, error } = await supabase.functions.invoke('zoom-auth-exchange', {
                body: { code, userId: user.id, redirectUri }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setHasZoom(true);
            toast.success('¡Zoom conectado correctamente!');
            fetchProfile();
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error exchanging Zoom code:', error);
            toast.error('Error al vincular Zoom: ' + (error.message || 'Error desconocido'));
        } finally {
            setIsLinking(false);
        }
    }, [user, fetchProfile]);

    // Check slug availability
    useEffect(() => {
        const checkSlug = async () => {
            if (!profile.slug || profile.slug === originalSlug) {
                setSlugStatus('idle');
                setSlugSuggestions([]);
                return;
            }

            setSlugStatus('checking');
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('slug', profile.slug)
                    .neq('id', user?.id)
                    .maybeSingle();

                if (data) {
                    setSlugStatus('taken');
                    // Generate suggestions
                    const suggestions = [
                        `${profile.slug}-${Math.floor(Math.random() * 99)}`,
                        `${profile.slug}-psic`,
                        `${profile.slug}-prof`
                    ];
                    setSlugSuggestions(suggestions);
                } else {
                    setSlugStatus('available');
                    setSlugSuggestions([]);
                }
            } catch (err) {
                console.error(err);
            }
        };

        const timer = setTimeout(checkSlug, 500);
        return () => clearTimeout(timer);
    }, [profile.slug, originalSlug, user?.id]);


    // Initialize Google OAuth Code Client (for branded synchronization)
    useEffect(() => {
        if (!window.google || !GOOGLE_CLIENT_ID) return;

        try {
            console.log('[Settings] Initializing Google Code Client...');
            const client = window.google.accounts.oauth2.initCodeClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                ux_mode: 'popup',
                callback: async (response: { code: string }) => {
                    if (response.code) {
                        console.log('[Settings] Google Code received, starting exchange...');
                        await handleCodeResponse(response.code);
                    }
                },
            });
            setCodeClient(client);
        } catch (err) {
            console.error('Error initializing Google Code Client:', err);
        }
    }, [handleCodeResponse]);

    // ── Saves ─────────────────────────────────────────────────────────────────

    const handleSavePerfil = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        if (slugStatus === 'taken') {
            toast.error('El nombre de enlace ya está ocupado. Por favor elige otro.');
            return;
        }

        setIsSaving(true);
        setSaved(false);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                prefix: profile.prefix === 'none' ? null : profile.prefix,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                cedulas: cedulas,
                cursos: cursos,
                institucion_formadora: profile.institucion_formadora || null,
                telefono_profesional: profile.telefono_profesional || null,
                slug: profile.slug || null,
                is_public: profile.is_public,
                signature_data: profile.signature_data,
                bio: profile.bio || null,
                experience_years: profile.experience_years || 0,
                social_links: profile.social_links || {},
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (error) throw error;
            setOriginalSlug(profile.slug);
            setSaved(true);
            toast.success('Perfil guardado');
            setTimeout(() => setSaved(false), 3000);
        } catch (err: unknown) {
            toast.error('Error al guardar perfil');
        } finally {
            setIsSaving(false);
        }
    };

    // Cédula handlers
    const addCedula = () => {
        if (!newCedula.numero.trim()) { toast.error('Ingresa el número de cédula'); return; }
        setCedulas(prev => [...prev, { ...newCedula, id: crypto.randomUUID() }]);
        setNewCedula(newCedulaDefault());
        setShowAddCedula(false);
    };
    const removeCedula = (id: string) => setCedulas(prev => prev.filter(c => c.id !== id));

    // Curso handlers
    const addCurso = () => {
        if (!newCurso.nombre.trim()) { toast.error('Ingresa el nombre del curso o especialidad'); return; }
        setCursos(prev => [...prev, { ...newCurso, id: crypto.randomUUID() }]);
        setNewCurso(newCursoDefault());
        setShowAddCurso(false);
    };
    const removeCurso = (id: string) => setCursos(prev => prev.filter(c => c.id !== id));

    const handleSaveHorarios = async () => {
        if (!user) return;
        
        // Validation: Catch any active days with invalid ranges
        const invalidDays = Object.entries(horario.dias).filter(([_, config]) => {
            return config.activo && config.fin <= config.inicio;
        });

        if (invalidDays.length > 0) {
            toast.error('Uno o más días tienen un horario inválido (Fin debe ser mayor a Inicio)');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                horario_atencion: horario,
                porcentaje_consultorio: profile.porcentaje_consultorio,
                stripe_fee_percent: profile.stripe_fee_percent,
                reschedule_policy_hours: profile.reschedule_policy_hours,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (error) throw error;
            toast.success('Ajustes guardados');
        } catch (err: unknown) {
            toast.error('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotif = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                notification_settings: notif,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (error) throw error;
            toast.success('Notificaciones guardadas');
        } catch (err: unknown) {
            toast.error('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDia = (d: number) => {
        setHorario((prev) => ({
            ...prev,
            dias: {
                ...prev.dias,
                [d]: {
                    ...prev.dias[d],
                    activo: !prev.dias[d].activo
                }
            }
        }));
    };

    const updateDiaHorario = (d: number, field: 'inicio' | 'fin', value: string) => {
        const current = horario.dias[d];
        const nextInicio = field === 'inicio' ? value : current.inicio;
        const nextFin = field === 'fin' ? value : current.fin;

        if (nextFin <= nextInicio) {
            toast.warning('La hora de fin debe ser posterior a la de inicio');
        }

        setHorario((prev: any) => ({
            ...prev,
            dias: {
                ...prev.dias,
                [d]: {
                    ...prev.dias[d],
                    [field]: value
                }
            }
        }));
    };

    const updateMaxSesiones = (d: number, value: string) => {
        const num = parseInt(value) || 0;
        setHorario((prev: any) => ({
            ...prev,
            dias: {
                ...prev.dias,
                [d]: {
                    ...prev.dias[d],
                    max_sesiones: Math.max(0, Math.min(num, 30))
                }
            }
        }));
    };

    const copiarHorarioATodos = (sourceDia: number) => {
        const { inicio, fin, max_sesiones } = horario.dias[sourceDia];
        const newDias = { ...horario.dias };
        Object.keys(newDias).forEach((k) => {
            const key = parseInt(k);
            if (newDias[key].activo) {
                newDias[key] = { ...newDias[key], inicio, fin, max_sesiones };
            }
        });
        setHorario({ ...horario, dias: newDias });
        toast.success(`Copiado ${inicio} - ${fin} (máx. ${max_sesiones ?? '∞'}) a todos los días activos`);
    };

    const addNonWorkingDay = () => {
        if (!newNonWorkingDay) return;
        if (horario.dias_no_laborables.includes(newNonWorkingDay)) {
            toast.info('Ese día ya está registrado');
            return;
        }
        setHorario(prev => ({
            ...prev,
            dias_no_laborables: [...prev.dias_no_laborables, newNonWorkingDay].sort(),
        }));
        setNewNonWorkingDay('');
    };

    const removeNonWorkingDay = (day: string) => {
        setHorario(prev => ({
            ...prev,
            dias_no_laborables: prev.dias_no_laborables.filter(d => d !== day),
        }));
    };

    const handleLinkGoogleCalendar = async () => {
        if (!codeClient) {
            toast.error('El servicio de Google no está listo. Por favor, recarga la página.');
            return;
        }
        try {
            codeClient.requestCode();
        } catch (err) {
            console.error('Error requesting code:', err);
            toast.error('No se pudo abrir la ventana de Google');
        }
    };

    const handleUnlinkGoogleCalendar = async () => {
        if (!user) return;
        
        setIsUnlinking(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    google_refresh_token: null,
                    google_access_token: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            setHasGoogleCalendar(false);
            setShowUnlinkConfirm(false);
            toast.success('Google Calendar se ha desconectado correctamente');
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error unlinking Google Calendar:', error);
            toast.error('Error al desconectar Google Calendar');
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleLinkMicrosoftCalendar = async () => {
        const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
        if (!clientId) {
            toast.error('Configuración de Microsoft no disponible');
            return;
        }

        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/microsoft/callback`);
        const scope = encodeURIComponent('offline_access Calendars.ReadWrite OnlineMeetings.ReadWrite');
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}`;

        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            authUrl,
            'Microsoft Login',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            toast.error('Por favor, permite las ventanas emergentes para continuar');
            return;
        }

        // Listen for the callback message
        const messageListener = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'MS_AUTH_CODE' && event.data?.code) {
                window.removeEventListener('message', messageListener);
                await handleMicrosoftCodeResponse(event.data.code);
            }
        };

        window.addEventListener('message', messageListener);

        // Check if popup closed without code
        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                window.removeEventListener('message', messageListener);
            }
        }, 1000);
    };

    const handleUnlinkMicrosoftCalendar = async () => {
        if (!user) return;
        setIsUnlinking(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    microsoft_refresh_token: null,
                    microsoft_access_token: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            setHasOutlookCalendar(false);
            toast.success('Microsoft 365 se ha desconectado correctamente');
        } catch (err: any) {
            toast.error('Error al desconectar Microsoft');
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleLinkZoom = async () => {
        const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
        if (!clientId) {
            toast.error('Configuración de Zoom no disponible');
            return;
        }

        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/zoom/callback`);
        const scope = encodeURIComponent('meeting:write:meeting meeting:update:meeting meeting:delete:meeting user:read:user');
        const authUrl = `https://zoom.us/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;

        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            authUrl,
            'Zoom Login',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            toast.error('Por favor, permite las ventanas emergentes para continuar');
            return;
        }

        // Listen for the callback message
        const messageListener = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'ZOOM_AUTH_CODE' && event.data?.code) {
                window.removeEventListener('message', messageListener);
                await handleZoomCodeResponse(event.data.code);
            }
        };

        window.addEventListener('message', messageListener);

        // Check if popup closed without code
        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                window.removeEventListener('message', messageListener);
            }
        }, 1000);
    };

    const handleUnlinkZoom = async () => {
        if (!user) return;
        setIsUnlinking(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    zoom_refresh_token: null,
                    zoom_access_token: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            setHasZoom(false);
            toast.success('Zoom se ha desconectado correctamente');
        } catch (err: any) {
            toast.error('Error al desconectar Zoom');
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleLinkStripe = async () => {
        setIsLinkingStripe(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa');

            const redirectUri = `${window.location.origin}/auth/stripe/callback`;
            const refreshUri = window.location.href;

            const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
                body: { returnUrl: redirectUri, refreshUrl: refreshUri },
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (error) throw error;
            if (data?.url) {
                // Redirect directly to Stripe onboarding
                window.location.href = data.url;
            } else if (data?.error) {
                throw new Error(data.error);
            }
        } catch (err: any) {
            console.error('Error linking Stripe:', err);
            toast.error(err.message || 'Error al iniciar la conexión con Stripe');
        } finally {
            setIsLinkingStripe(false);
        }
    };

    const handleUnlinkStripe = async () => {
        if (!user) return;
        setIsUnlinking(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    stripe_account_id: null,
                    stripe_account_status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            setHasStripeAccount(false);
            setStripeStatus('none');
            toast.success('Cuenta de Stripe desconectada');
        } catch (err: any) {
            toast.error('Error al desconectar Stripe: ' + err.message);
        } finally {
            setIsUnlinking(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Layout>
            <div className="space-y-6 w-full">
                {/* Header Section (Island Style) */}
                <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
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
                                onClick={() => setActiveTab(tab.id)}
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
                                                onClick={() => setActiveTab(tab.id as TabId)}
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
                        {isLoading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* ── Tab: Apariencia ─────────────────────────── */}
                        {activeTab === 'apariencia' && (
                            <Card variant="flat" className="border border-border">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                            <Palette className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Apariencia y Tema</CardTitle>
                                            <CardDescription>
                                                Personaliza los colores y el modo de visualización de tu cuenta.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/20">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-medium">Modo Oscuro</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Cambia la interfaz a colores oscuros para reducir la fatiga visual.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={isDarkMode}
                                            onCheckedChange={toggleDarkMode}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── Tab: Perfil Profesional ─────────────────────────── */}
                        {activeTab === 'perfil' && (
                            <Card variant="flat" className="border border-border">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">Perfil Profesional</CardTitle>
                                            <CardDescription>
                                                Datos requeridos por <span className="text-primary font-medium">NOM-024-SSA3-2012</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center pb-8 border-b border-border/50 mb-6">
                                        <AvatarUpload
                                            url={profile.avatar_url}
                                            fullName={profile.full_name}
                                            onUpload={(url) => setProfile({ ...profile, avatar_url: url })}
                                            onRemove={() => setProfile({ ...profile, avatar_url: null })}
                                        />
                                    </div>

                                    <form onSubmit={handleSavePerfil} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="full_name">Nombre completo</Label>
                                            <div className="flex gap-2">
                                                <Select
                                                    value={profile.prefix}
                                                    onValueChange={(v) => setProfile({ ...profile, prefix: v })}
                                                    disabled={isSaving}
                                                >
                                                    <SelectTrigger className="w-[120px] shrink-0">
                                                        <SelectValue placeholder="Prefijo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PREFIJOS.map((p) => (
                                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    id="full_name"
                                                    value={profile.full_name}
                                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                                    placeholder="Juan Pérez López"
                                                    disabled={isSaving}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Correo electrónico</Label>
                                            <Input
                                                id="email"
                                                value={profile.email}
                                                readOnly
                                                disabled
                                                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                                            />
                                            <p className="text-xs text-muted-foreground">El correo se gestiona desde tu proveedor de autenticación.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="telefono_profesional" className="flex items-center gap-2">
                                                    <Briefcase className="h-4 w-4 text-primary" /> Teléfono profesional
                                                </Label>
                                                <Input
                                                    id="telefono_profesional"
                                                    type="tel"
                                                    value={profile.telefono_profesional}
                                                    onChange={(e) => setProfile({ ...profile, telefono_profesional: e.target.value })}
                                                    placeholder="+52 55 1234 5678"
                                                    disabled={isSaving}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="experience_years" className="flex items-center gap-2">
                                                    <GraduationCap className="h-4 w-4 text-primary" /> Años de experiencia
                                                </Label>
                                                <Input
                                                    id="experience_years"
                                                    type="number"
                                                    min={0}
                                                    max={60}
                                                    value={profile.experience_years}
                                                    onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || 0 })}
                                                    placeholder="Ej: 10"
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bio" className="flex items-center justify-between">
                                                <span>Biografía Profesional</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Perfil Público</span>
                                            </Label>
                                            <Textarea
                                                id="bio"
                                                rows={4}
                                                value={profile.bio}
                                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                placeholder="Describe tu enfoque terapéutico, especialidades y trayectoria..."
                                                className="resize-none"
                                                disabled={isSaving}
                                            />
                                            <p className="text-[11px] text-muted-foreground">Esta información será visible en tu página de perfil profesional.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest flex items-center gap-2">
                                                Redes Sociales <span className="text-primary/40">(Opcional)</span>
                                            </Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Instagram className="h-4 w-4 text-pink-500" />
                                                        <span className="text-xs font-medium">Instagram</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={profile.social_links?.instagram || ''}
                                                            onChange={(e) => setProfile({
                                                                ...profile,
                                                                social_links: { ...profile.social_links, instagram: e.target.value }
                                                            })}
                                                            placeholder="usuario"
                                                            className="h-9 text-sm"
                                                        />
                                                        <div className="flex gap-1 shrink-0">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon-sm"
                                                                        onClick={() => {
                                                                            const val = profile.social_links?.instagram;
                                                                            if (!val) return;
                                                                            const url = val.startsWith('http') ? val : `https://instagram.com/${val}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success('Enlace de Instagram copiado');
                                                                        }}
                                                                        disabled={!profile.social_links?.instagram}
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copiar enlace</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={() => {
                                                                            const val = profile.social_links?.instagram;
                                                                            if (!val) return;
                                                                            const url = val.startsWith('http') ? val : `https://instagram.com/${val}`;
                                                                            window.open(url, '_blank');
                                                                        }}
                                                                        disabled={!profile.social_links?.instagram}
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Probar enlace</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Linkedin className="h-4 w-4 text-blue-600" />
                                                        <span className="text-xs font-medium">LinkedIn</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={profile.social_links?.linkedin || ''}
                                                            onChange={(e) => setProfile({
                                                                ...profile,
                                                                social_links: { ...profile.social_links, linkedin: e.target.value }
                                                            })}
                                                            placeholder="perfil-url"
                                                            className="h-9 text-sm"
                                                        />
                                                        <div className="flex gap-1 shrink-0">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon-sm"
                                                                        onClick={() => {
                                                                            const val = profile.social_links?.linkedin;
                                                                            if (!val) return;
                                                                            const url = val.startsWith('http') ? val : `https://linkedin.com/in/${val}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success('Enlace de LinkedIn copiado');
                                                                        }}
                                                                        disabled={!profile.social_links?.linkedin}
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copiar enlace</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={() => {
                                                                            const val = profile.social_links?.linkedin;
                                                                            if (!val) return;
                                                                            const url = val.startsWith('http') ? val : `https://linkedin.com/in/${val}`;
                                                                            window.open(url, '_blank');
                                                                        }}
                                                                        disabled={!profile.social_links?.linkedin}
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Probar enlace</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Facebook className="h-4 w-4 text-blue-800" />
                                                        <span className="text-xs font-medium">Facebook</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={profile.social_links?.facebook || ''}
                                                            onChange={(e) => setProfile({
                                                                ...profile,
                                                                social_links: { ...profile.social_links, facebook: e.target.value }
                                                            })}
                                                            placeholder="nombre-usuario"
                                                            className="h-9 text-sm"
                                                        />
                                                        <div className="flex gap-1 shrink-0">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon-sm"
                                                                        onClick={() => {
                                                                            const val = profile.social_links?.facebook;
                                                                            if (!val) return;
                                                                            const url = val.startsWith('http') ? val : `https://facebook.com/${val}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success('Enlace de Facebook copiado');
                                                                        }}
                                                                        disabled={!profile.social_links?.facebook}
                                                                    >
                                                                        <Copy className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copiar enlace</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={() => {
                                                                            const val = profile.social_links?.facebook;
                                                                            if (!val) return;
                                                                            const url = val.startsWith('http') ? val : `https://facebook.com/${val}`;
                                                                            window.open(url, '_blank');
                                                                        }}
                                                                        disabled={!profile.social_links?.facebook}
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Probar enlace</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Perfil Público ── */}
                                        <div className="pt-2 space-y-6">
                                            <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                                                            Perfil y Presencia Pública
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground mt-1">Habilita tu perfil profesional y permite que tus pacientes agenden directamente.</p>
                                                    </div>
                                                    <Switch
                                                        checked={profile.is_public}
                                                        onCheckedChange={(c) => setProfile({ ...profile, is_public: c })}
                                                        disabled={isSaving}
                                                    />
                                                </div>

                                                <div className={cn("space-y-3 transition-all", !profile.is_public && "opacity-50 pointer-events-none")}>
                                                    <Label htmlFor="slug">Tu enlace personalizado</Label>
                                                    <div className="flex gap-2">
                                                        <div className="flex flex-1 rounded-md shadow-sm">
                                                            <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-muted-foreground text-[10px] md:text-sm">
                                                                app.saudade.mx/reservar/
                                                            </span>
                                                            <Input
                                                                id="slug"
                                                                className={cn(
                                                                    "rounded-none rounded-r-md",
                                                                    slugStatus === 'available' && "border-success focus-visible:ring-success/20",
                                                                    slugStatus === 'taken' && "border-destructive focus-visible:ring-destructive/20",
                                                                    originalSlug && "bg-muted/30 cursor-not-allowed opacity-80"
                                                                )}
                                                                placeholder="tu-nombre"
                                                                value={profile.slug}
                                                                onChange={(e) => setProfile({ ...profile, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                                                disabled={isSaving || !profile.is_public || !!originalSlug}
                                                            />
                                                            {slugStatus === 'checking' && (
                                                                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-10 w-10 shrink-0"
                                                                    onClick={() => {
                                                                        const url = `https://app.saudade.mx/reservar/${profile.slug}`;
                                                                        navigator.clipboard.writeText(url);
                                                                        toast.success('Enlace copiado');
                                                                    }}
                                                                    disabled={!profile.is_public || !profile.slug || slugStatus === 'taken'}
                                                                >
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copiar enlace directo</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    
                                                    {slugStatus === 'taken' && (
                                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <p className="text-xs text-destructive font-medium flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" /> Este nombre ya está ocupado.
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Sugerencias:</span>
                                                                {slugSuggestions.map((s) => (
                                                                    <button
                                                                        key={s}
                                                                        type="button"
                                                                        onClick={() => setProfile({ ...profile, slug: s })}
                                                                        className="text-[10px] px-2 py-1 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-full transition-colors font-medium"
                                                                    >
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {slugStatus === 'available' && (
                                                        <p className="text-xs text-success font-medium flex items-center gap-1 animate-in fade-in duration-200">
                                                            <CheckCircle2 className="h-3 w-3" /> ¡Este nombre está disponible!
                                                        </p>
                                                    )}

                                                    <div className="space-y-1">
                                                        <p className="text-xs text-muted-foreground">Usa letras minúsculas, números y guiones para personalizar tu URL.</p>
                                                        {originalSlug ? (
                                                            <p className="text-[10px] text-primary/60 font-medium flex items-center gap-1">
                                                                <ShieldCheck className="h-3 w-3" /> Este enlace es permanente y no puede ser modificado.
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" /> Una vez establecido, este enlace no podrá ser modificado.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all", !profile.is_public && "opacity-50 pointer-events-none")}>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">Enlace de Perfil</Label>
                                                        <div className="flex gap-1.5">
                                                            <div className="flex-1 text-[11px] bg-background border border-border rounded-md px-2 py-1.5 truncate">
                                                                app.saudade.mx/perfil/{profile.slug || '...'}
                                                            </div>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 shrink-0"
                                                                        onClick={() => {
                                                                            const url = `https://app.saudade.mx/perfil/${profile.slug}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success('Enlace de perfil copiado');
                                                                        }}
                                                                        disabled={!profile.is_public || !profile.slug}
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copiar enlace de perfil</TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 shrink-0"
                                                                        onClick={() => window.open(`/perfil/${profile.slug}`, '_blank')}
                                                                        disabled={!profile.is_public || !profile.slug}
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Ver perfil público</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase text-muted-foreground">Enlace de Reservas</Label>
                                                        <div className="flex gap-1.5">
                                                            <div className="flex-1 text-[11px] bg-background border border-border rounded-md px-2 py-1.5 truncate">
                                                                app.saudade.mx/reservar/{profile.slug || '...'}
                                                            </div>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 shrink-0"
                                                                        onClick={() => {
                                                                            const url = `https://app.saudade.mx/reservar/${profile.slug}`;
                                                                            navigator.clipboard.writeText(url);
                                                                            toast.success('Enlace de reservas copiado');
                                                                        }}
                                                                        disabled={!profile.is_public || !profile.slug}
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copiar enlace de reservas</TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 shrink-0"
                                                                        onClick={() => window.open(`/reservar/${profile.slug}`, '_blank')}
                                                                        disabled={!profile.is_public || !profile.slug}
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Ir al portal de reservas</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            </div>



                                            {/* ── Cédulas Profesionales ── */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                                        Cédulas Profesionales (NOM-024 INT-04)
                                                    </p>
                                                    <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddCedula(v => !v)}>
                                                        <Plus className="h-3.5 w-3.5" /> Agregar
                                                    </Button>
                                                </div>

                                                {/* Existing cedulas */}
                                                {cedulas.length > 0 && (
                                                    <div className="space-y-2">
                                                        {cedulas.map((c, i) => (
                                                            <div key={c.id || `cedula-${i}`} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-mono font-semibold">{c.numero}</p>
                                                                    <p className="text-xs text-muted-foreground capitalize">
                                                                        {TIPOS_CEDULA.find(t => t.value === c.tipo)?.label ?? c.tipo}
                                                                        {c.institucion && <> · {c.institucion}</>}
                                                                    </p>
                                                                </div>
                                                                <button type="button" onClick={() => removeCedula(c.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {cedulas.length === 0 && !showAddCedula && (
                                                    <p className="text-xs text-muted-foreground italic">Sin cédulas registradas.</p>
                                                )}

                                                {/* Add form */}
                                                {showAddCedula && (
                                                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nueva cédula</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Número de cédula *</Label>
                                                                <Input
                                                                    value={newCedula.numero}
                                                                    onChange={e => setNewCedula({ ...newCedula, numero: e.target.value })}
                                                                    placeholder="Ej: 1234567"
                                                                    maxLength={20}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Tipo</Label>
                                                                <Select value={newCedula.tipo} onValueChange={v => setNewCedula({ ...newCedula, tipo: v })}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {TIPOS_CEDULA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Institución que expide</Label>
                                                            <Input
                                                                value={newCedula.institucion}
                                                                onChange={e => setNewCedula({ ...newCedula, institucion: e.target.value })}
                                                                placeholder="Ej: UNAM, SEP, UAM..."
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCedula(false)}>Cancelar</Button>
                                                            <Button type="button" variant="zen" size="sm" onClick={addCedula}>Agregar cédula</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Especialidades y Cursos ── */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                                        Especialidades y Cursos
                                                    </p>
                                                    <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddCurso(v => !v)}>
                                                        <Plus className="h-3.5 w-3.5" /> Agregar
                                                    </Button>
                                                </div>

                                                {cursos.length > 0 && (
                                                    <div className="space-y-2">
                                                        {cursos.map((c, i) => (
                                                            <div key={c.id || `curso-${i}`} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium">{c.nombre}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {c.institucion && <>{c.institucion}</>}
                                                                        {c.anio && <> · {c.anio}</>}
                                                                    </p>
                                                                </div>
                                                                <button type="button" onClick={() => removeCurso(c.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {cursos.length === 0 && !showAddCurso && (
                                                    <p className="text-xs text-muted-foreground italic">Sin especialidades o cursos registrados.</p>
                                                )}

                                                {showAddCurso && (
                                                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nueva especialidad / curso</p>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Nombre *</Label>
                                                            <Input
                                                                value={newCurso.nombre}
                                                                onChange={e => setNewCurso({ ...newCurso, nombre: e.target.value })}
                                                                placeholder="Ej: Terapia Cognitivo-Conductual, Neuropsicología clínica..."
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Institución</Label>
                                                                <Input
                                                                    value={newCurso.institucion}
                                                                    onChange={e => setNewCurso({ ...newCurso, institucion: e.target.value })}
                                                                    placeholder="Ej: UNAM, IMSS..."
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">Año</Label>
                                                                <Input
                                                                    value={newCurso.anio}
                                                                    onChange={e => setNewCurso({ ...newCurso, anio: e.target.value })}
                                                                    placeholder="Ej: 2023"
                                                                    maxLength={4}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCurso(false)}>Cancelar</Button>
                                                            <Button type="button" variant="zen" size="sm" onClick={addCurso}>Agregar</Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Firma Profesional ── */}
                                            <div className="space-y-4 pt-4 border-t border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                            <PenTool className="h-3.5 w-3.5 text-primary" />
                                                            Firma Profesional
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Se incluirá automáticamente en todos los reportes y expedientes generados.</p>
                                                    </div>
                                                </div>

                                                {profile.signature_data ? (
                                                    <div className="space-y-3">
                                                        <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-4 group">
                                                            <img src={profile.signature_data} alt="Firma profesional" className="max-h-[120px] mx-auto" />
                                                            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-1.5 bg-white/90 hover:bg-white"
                                                                    onClick={() => setProfile({ ...profile, signature_data: null })}
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" /> Cambiar firma
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-center text-success font-medium uppercase tracking-widest flex items-center justify-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Firma registrada
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <div className={`relative rounded-2xl border-2 border-dashed transition-colors border-primary/30 bg-white hover:border-primary/60 cursor-crosshair`}>
                                                            <canvas
                                                                ref={sigCanvasRef}
                                                                width={800}
                                                                height={300}
                                                                style={{ width: '100%', height: '150px', borderRadius: '14px', display: 'block' }}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    const canvas = sigCanvasRef.current;
                                                                    if (!canvas) return;
                                                                    setIsSigDrawing(true);
                                                                    const rect = canvas.getBoundingClientRect();
                                                                    const scaleX = canvas.width / rect.width;
                                                                    const scaleY = canvas.height / rect.height;
                                                                    sigLastPos.current = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
                                                                }}
                                                                onMouseMove={(e) => {
                                                                    if (!isSigDrawing) return;
                                                                    e.preventDefault();
                                                                    const canvas = sigCanvasRef.current;
                                                                    if (!canvas) return;
                                                                    const ctx = canvas.getContext('2d');
                                                                    if (!ctx || !sigLastPos.current) return;
                                                                    const rect = canvas.getBoundingClientRect();
                                                                    const scaleX = canvas.width / rect.width;
                                                                    const scaleY = canvas.height / rect.height;
                                                                    const pos = { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
                                                                    ctx.beginPath();
                                                                    ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
                                                                    ctx.lineTo(pos.x, pos.y);
                                                                    ctx.strokeStyle = '#1a1a2e';
                                                                    ctx.lineWidth = 2.5;
                                                                    ctx.lineCap = 'round';
                                                                    ctx.lineJoin = 'round';
                                                                    ctx.stroke();
                                                                    sigLastPos.current = pos;
                                                                    setHasSigContent(true);
                                                                }}
                                                                onMouseUp={() => { setIsSigDrawing(false); sigLastPos.current = null; }}
                                                                onMouseLeave={() => { setIsSigDrawing(false); sigLastPos.current = null; }}
                                                                onTouchStart={(e) => {
                                                                    e.preventDefault();
                                                                    const canvas = sigCanvasRef.current;
                                                                    if (!canvas) return;
                                                                    setIsSigDrawing(true);
                                                                    const rect = canvas.getBoundingClientRect();
                                                                    const scaleX = canvas.width / rect.width;
                                                                    const scaleY = canvas.height / rect.height;
                                                                    const touch = e.touches[0];
                                                                    sigLastPos.current = { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
                                                                }}
                                                                onTouchMove={(e) => {
                                                                    if (!isSigDrawing) return;
                                                                    e.preventDefault();
                                                                    const canvas = sigCanvasRef.current;
                                                                    if (!canvas) return;
                                                                    const ctx = canvas.getContext('2d');
                                                                    if (!ctx || !sigLastPos.current) return;
                                                                    const rect = canvas.getBoundingClientRect();
                                                                    const scaleX = canvas.width / rect.width;
                                                                    const scaleY = canvas.height / rect.height;
                                                                    const touch = e.touches[0];
                                                                    const pos = { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
                                                                    ctx.beginPath();
                                                                    ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
                                                                    ctx.lineTo(pos.x, pos.y);
                                                                    ctx.strokeStyle = '#1a1a2e';
                                                                    ctx.lineWidth = 2.5;
                                                                    ctx.lineCap = 'round';
                                                                    ctx.lineJoin = 'round';
                                                                    ctx.stroke();
                                                                    sigLastPos.current = pos;
                                                                    setHasSigContent(true);
                                                                }}
                                                                onTouchEnd={() => { setIsSigDrawing(false); sigLastPos.current = null; }}
                                                            />
                                                            {!hasSigContent && (
                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                    <p className="text-sm text-muted-foreground/50 select-none">Dibuja tu firma aquí</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5"
                                                                disabled={!hasSigContent}
                                                                onClick={() => {
                                                                    const canvas = sigCanvasRef.current;
                                                                    if (!canvas) return;
                                                                    const ctx = canvas.getContext('2d');
                                                                    if (!ctx) return;
                                                                    ctx.fillStyle = '#ffffff';
                                                                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                                                                    setHasSigContent(false);
                                                                }}
                                                            >
                                                                <Eraser className="h-3.5 w-3.5" /> Limpiar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="zen"
                                                                size="sm"
                                                                className="gap-1.5"
                                                                disabled={!hasSigContent}
                                                                onClick={() => {
                                                                    const canvas = sigCanvasRef.current;
                                                                    if (!canvas || !hasSigContent) return;
                                                                    setProfile({ ...profile, signature_data: canvas.toDataURL('image/png') });
                                                                    toast.success('Firma capturada. Recuerda guardar tu perfil.');
                                                                }}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar firma
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>


                                        <div className="flex justify-end pt-2">
                                            <Button type="submit" variant="zen" disabled={isSaving} className="gap-2">
                                                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                                    : saved ? <><CheckCircle2 className="h-4 w-4" /> Guardado</>
                                                        : 'Guardar perfil'}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── Tab: Horarios y Comisiones ──────────────────────── */}
                        {activeTab === 'horarios' && (
                            <div className="space-y-6">
                                {/* Horarios */}
                                <Card variant="flat" className="border border-border">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                <Clock className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Horario de Atención</CardTitle>
                                                <CardDescription>Define tus días y horas de trabajo</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-semibold">Días y Horas de Atención</Label>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {DIAS_SEMANA.map((d) => {
                                                    const config = horario.dias?.[d.value] || { activo: false, inicio: '08:00', fin: '17:00' };
                                                    const isInvalid = config.activo && config.fin <= config.inicio;
                                                    
                                                    return (
                                                        <div key={d.value} className={cn(
                                                            "flex items-center gap-4 p-3 rounded-lg border transition-all relative",
                                                            config.activo 
                                                                ? (isInvalid ? "bg-red-50 border-red-500" : "bg-primary/5 border-primary/20") 
                                                                : "bg-muted/10 border-transparent opacity-60"
                                                        )}>
                                                            <div className="w-24 shrink-0">
                                                                <p className={cn(
                                                                    "font-medium text-sm",
                                                                    isInvalid && "text-red-700"
                                                                )}>{d.label.length > 3 ? d.label : d.label + " (V)"}</p>
                                                            </div>

                                                            <Switch
                                                                checked={config.activo}
                                                                onCheckedChange={() => toggleDia(d.value)}
                                                            />

                                                            {config.activo ? (
                                                                <>
                                                                    <div className="flex items-center gap-2 flex-1">
                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Desde</span>
                                                                        <Input
                                                                            type="time"
                                                                            value={config.inicio}
                                                                            onChange={(e) => updateDiaHorario(d.value, 'inicio', e.target.value)}
                                                                            className="h-9 py-1 px-2 border-none bg-background shadow-none focus-visible:ring-1"
                                                                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                                                                        />
                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Hasta</span>
                                                                        <Input
                                                                            type="time"
                                                                            value={config.fin}
                                                                            onChange={(e) => updateDiaHorario(d.value, 'fin', e.target.value)}
                                                                            className="h-9 py-1 px-2 border-none bg-background shadow-none focus-visible:ring-1"
                                                                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0 border-l border-border/40 pl-3 ml-1" title="Máximo de sesiones por día">
                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Máx. sesiones</span>
                                                                        <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-0.5 border border-border/40">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                                                                                onClick={() => updateMaxSesiones(d.value, String((config.max_sesiones || 0) - 1))}
                                                                                disabled={(config.max_sesiones || 0) <= 0}
                                                                            >
                                                                                <ChevronDown className="h-3 w-3" />
                                                                            </Button>
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                max={30}
                                                                                value={config.max_sesiones ?? ''}
                                                                                onChange={(e) => updateMaxSesiones(d.value, e.target.value)}
                                                                                placeholder="∞"
                                                                                className="h-7 w-10 p-0 text-center border-none bg-transparent shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm font-medium"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                                                                                onClick={() => updateMaxSesiones(d.value, String((config.max_sesiones || 0) + 1))}
                                                                                disabled={(config.max_sesiones || 0) >= 30}
                                                                            >
                                                                                <ChevronUp className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                        title="Copiar este horario a todos los días activos"
                                                                        onClick={() => copiarHorarioATodos(d.value)}
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1 text-xs text-muted-foreground italic">
                                                                    Cerrado
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Días no laborables */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarOff className="h-4 w-4 text-muted-foreground" />
                                                <Label>Días No Laborables</Label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Estos días aparecerán bloqueados en la agenda y no podrán agendarse citas.
                                            </p>

                                            <div className="flex gap-2">
                                                <Input
                                                    type="date"
                                                    value={newNonWorkingDay}
                                                    onChange={(e) => setNewNonWorkingDay(e.target.value)}
                                                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                                                    className="max-w-[200px]"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addNonWorkingDay}
                                                    className="gap-1"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Agregar
                                                </Button>
                                            </div>

                                            {horario.dias_no_laborables.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {horario.dias_no_laborables.map((day) => {
                                                        const [year, month, dayNum] = day.split('-');
                                                        const formatted = `${dayNum}/${month}/${year}`;
                                                        return (
                                                            <div
                                                                key={day}
                                                                className="flex items-center gap-1.5 bg-destructive/10 text-destructive text-xs px-2.5 py-1 rounded-full border border-destructive/20"
                                                            >
                                                                <CalendarOff className="h-3 w-3" />
                                                                {formatted}
                                                                <button
                                                                    onClick={() => removeNonWorkingDay(day)}
                                                                    className="hover:opacity-70 transition-opacity ml-0.5"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {horario.dias_no_laborables.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic">Sin días no laborables registrados.</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comisiones */}
                                <Card variant="flat" className="border border-border">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                                                <DollarSign className="h-4 w-4 text-success" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Comisiones</CardTitle>
                                                <CardDescription>Configura el reparto entre consultorio y tus honorarios netos</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="stripe_fee">
                                                Comisión Stripe (%)
                                                <span className="ml-2 text-xs text-muted-foreground font-normal">— según tu plan</span>
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="stripe_fee"
                                                    type="number"
                                                    min={0}
                                                    max={10}
                                                    step={0.01}
                                                    value={profile.stripe_fee_percent}
                                                    onChange={(e) => setProfile({ ...profile, stripe_fee_percent: parseFloat(e.target.value) || 0 })}
                                                    className="max-w-[120px]"
                                                    disabled={isSaving}
                                                />
                                                <span className="text-xs text-muted-foreground">Último cobro fue ≈ 5.14%</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="pct_consultorio">
                                                % que retiene el consultorio
                                                <span className="ml-2 text-xs text-muted-foreground font-normal">— el resto es tuyo</span>
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="pct_consultorio"
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    value={profile.porcentaje_consultorio}
                                                    onChange={(e) => setProfile({ ...profile, porcentaje_consultorio: parseFloat(e.target.value) || 0 })}
                                                    className="max-w-[120px]"
                                                    disabled={isSaving}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    Tú recibes: <strong>{(100 - profile.porcentaje_consultorio).toFixed(0)}%</strong>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Vista previa — sesión de $900 MXN</p>
                                            {(() => {
                                                const bruto = 900;
                                                const fee = bruto * (profile.stripe_fee_percent / 100);
                                                const neto = bruto - fee;
                                                const consultorio = neto * (profile.porcentaje_consultorio / 100);
                                                const psicologo = neto - consultorio;
                                                return (<>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">Cobrado al paciente</span><span>${bruto.toFixed(2)}</span></div>
                                                    <div className="flex justify-between text-destructive"><span>− Fees Stripe ({profile.stripe_fee_percent}%)</span><span>−${fee.toFixed(2)}</span></div>
                                                    <div className="flex justify-between font-semibold border-t pt-2"><span>Neto</span><span>${neto.toFixed(2)}</span></div>
                                                    <div className="flex justify-between text-muted-foreground"><span>Consultorio ({profile.porcentaje_consultorio}%)</span><span>−${consultorio.toFixed(2)}</span></div>
                                                    <div className="flex justify-between text-success font-bold text-base border-t pt-2"><span>Ingreso Neto del Psicólogo</span><span>${psicologo.toFixed(2)} MXN</span></div>
                                                </>);
                                            })()}
                                        </div>

                                        <div className="flex justify-end">
                                            <Button type="button" variant="zen" disabled={isSaving} className="gap-2" onClick={handleSaveHorarios}>
                                                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Políticas de Cancelación */}
                                <Card variant="flat" className="border border-border">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Políticas de Cancelación</CardTitle>
                                                <CardDescription>Configura las reglas de reprogramación y cancelación de citas para tus pacientes</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="reschedule_policy">
                                                Límite de tiempo global (Horas)
                                                <span className="ml-2 text-xs text-muted-foreground font-normal">— ventana mínima requerida antes de la sesión</span>
                                            </Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="reschedule_policy"
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    value={profile.reschedule_policy_hours}
                                                    onChange={(e) => setProfile({ ...profile, reschedule_policy_hours: parseInt(e.target.value) || 0 })}
                                                    className="max-w-[120px]"
                                                    disabled={isSaving}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    Los pacientes podrán reprogramar o cancelar de forma autónoma hasta <strong>{profile.reschedule_policy_hours} horas</strong> antes de la sesión.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <Button type="button" variant="zen" disabled={isSaving} className="gap-2" onClick={handleSaveHorarios}>
                                                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        {/* ── Tab: Mi Organización ────────────────────────────── */}
                        {activeTab === 'organizacion' && (
                            <div className="space-y-6">
                                <Card variant="flat" className="border border-border">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                <Building2 className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Organización y Miembros</CardTitle>
                                                <CardDescription>Gestiona tu clínica o cambia de organización</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Switcher */}
                                        <div className="space-y-2">
                                            <Label>Organización Activa</Label>
                                            <div className="flex items-center gap-3">
                                                <Select
                                                    value={organization?.id}
                                                    onValueChange={(val) => switchOrg(val)}
                                                >
                                                    <SelectTrigger className="max-w-[300px]">
                                                        <SelectValue placeholder="Selecciona una organización" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableOrganizations.map((org) => (
                                                            <SelectItem key={org.id} value={org.id}>
                                                                {org.name} {org.id === organization?.id && "(Actual)"}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {isAdmin && <Badge variant="secondary">Administrador</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Al cambiar de organización, verás solo los pacientes y citas de esa clínica.
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t border-border">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-semibold">Detalles de la Organización</h3>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nombre</span>
                                                    <p className="text-sm border rounded-md p-2 bg-muted/20">{organization?.name}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tipo de Espacio</span>
                                                    <div className="pt-1">
                                                        <Badge variant="outline" className={cn(
                                                            "px-3 py-1 capitalize",
                                                            organization?.type === 'personal' 
                                                                ? "bg-zen-lavender/10 text-zen-lavender border-zen-lavender/20" 
                                                                : "bg-blue-100 text-blue-700 border-blue-200"
                                                        )}>
                                                            {organization?.type === 'personal' ? 'Espacio Personal' : 'Equipo / Clínica'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tu Rol</span>
                                                    <div className="pt-1">
                                                        <Badge variant="outline" className="capitalize px-3 py-1">{organization?.role}</Badge>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Miembros</span>
                                                    <p className="text-sm font-semibold pt-1">{organization?.member_count || 1}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        
                        {activeTab === 'suscripcion' && (
                            <SubscriptionTab />
                        )}

                        {/* ── Tab: Integraciones ─────────────────────────────── */}
                        {activeTab === 'integraciones' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* Filter Bar */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {[
                                        { id: 'all', label: 'Todas' },
                                        { id: 'calendar', label: 'Calendarios' },
                                        { id: 'video', label: 'Videollamadas' },
                                        { id: 'payments', label: 'Pagos' },
                                    ].map((filter) => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setIntegrationFilter(filter.id as any)}
                                            className={cn(
                                                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                                                integrationFilter === filter.id
                                                    ? "bg-primary text-white border-primary shadow-sm"
                                                    : "bg-background text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                                            )}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-10">
                                    {/* Connected Section */}
                                    {/* Connected Section */}
                                    {integrationFilter === 'all' && (hasGoogleCalendar || hasOutlookCalendar || hasZoom) && (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Conectadas</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {/* Google Calendar Card */}
                                                {hasGoogleCalendar && (
                                                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conectado
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24">
                                                                    <path fill="#4285F4" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                                                                    <path fill="#fff" d="M19 19H5V8h14v11zM11 10.5h2V13h2.5v2H13v2.5h-2V15H8.5v-2H11v-2.5z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground pr-24">Google Calendar</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Sincronización de citas y bloqueo de espacios.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end pt-4 border-t border-border/50">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2 font-bold uppercase tracking-tighter"
                                                                onClick={() => setShowUnlinkConfirm(true)}
                                                                disabled={isUnlinking}
                                                            >
                                                                Desconectar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Google Meet Card */}
                                                {hasGoogleCalendar && (
                                                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conectado
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24">
                                                                    <path fill="#00AC47" d="M16 10v-3.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5v9c0 .83.67 1.5 1.5 1.5h10c.83 0 1.5-.67 1.5-1.5v-3.5l4 4v-11l-4 4z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground pr-24">Google Meet</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Generación automática de enlaces para teleterapia.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end pt-4 border-t border-border/50">
                                                            <span className="text-[10px] text-muted-foreground font-medium italic">Vinculado a Google</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Outlook Calendar Card */}
                                                {false && hasOutlookCalendar && (
                                                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conectado
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24">
                                                                    <path fill="#0078D4" d="M16 12V4.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5V12h13z" />
                                                                    <path fill="#28A8EA" d="M16 12v7.5c0 .83-.67 1.5-1.5 1.5h-10c-.83 0-1.5-.67-1.5-1.5V12h13z" />
                                                                    <path fill="#0078D4" d="M3 8h10v8H3z" />
                                                                    <path fill="#fff" d="M11 10h1.5v4H11v-4zM6 10h1.5v4H6v-4z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground pr-24">Outlook Calendar</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Sincronización con tu calendario de Microsoft.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end pt-4 border-t border-border/50">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2 font-bold uppercase tracking-tighter"
                                                                onClick={handleUnlinkMicrosoftCalendar}
                                                                disabled={isUnlinking}
                                                            >
                                                                Desconectar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Microsoft Teams Card */}
                                                {false && hasOutlookCalendar && (
                                                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conectado
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24">
                                                                    <path fill="#4B53BC" d="M16 12V4.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5V12h13z" />
                                                                    <path fill="#6264A7" d="M16 12v7.5c0 .83-.67 1.5-1.5 1.5h-10c-.83 0-1.5-.67-1.5-1.5V12h13z" />
                                                                    <path fill="#4B53BC" d="M3 8h10v8H3z" />
                                                                    <path fill="#fff" d="M6 10h5v4H6v-4z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground pr-24">Microsoft Teams</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Videollamadas profesionales de Microsoft.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end pt-4 border-t border-border/50">
                                                            <span className="text-[10px] text-muted-foreground font-medium italic">Vinculado a Microsoft</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Zoom Connected Card */}
                                                {hasZoom && (
                                                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conectado
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 text-[#2D8CFF]">
                                                                <Video className="h-7 w-7" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground pr-24">Zoom</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Videollamadas profesionales y estables.</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end pt-4 border-t border-border/50">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2 font-bold uppercase tracking-tighter"
                                                                onClick={handleUnlinkZoom}
                                                                disabled={isUnlinking}
                                                            >
                                                                Desconectar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Available Integrations */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
                                            {integrationFilter === 'payments' ? '' : 'Calendarios y Videollamadas'}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Google suite card if not connected */}
                                            {!hasGoogleCalendar && (integrationFilter === 'all' || integrationFilter === 'calendar' || integrationFilter === 'video') && (
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 border border-border">
                                                                <svg className="h-7 w-7 opacity-70 grayscale" viewBox="0 0 24 24">
                                                                    <path fill="#4285F4" d="M12 11h4.5c-.19 1.97-2.09 4.99-5.5 4.99-2.96 0-5.37-2.45-5.37-5.48s2.41-5.48 5.37-5.48c1.68 0 2.81.69 3.46 1.3l2.26-2.21C15.24 2.89 13.78 2 12 2 7.58 2 4 5.58 4 10s3.58 8 8 8c4.61 0 7.68-3.24 7.68-7.81 0-.53-.06-1-.15-1.44H12z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground">Google Workspace</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Conecta tu cuenta de Google para usar Calendar y Meet.</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            Sincroniza tus citas automáticamente y permite que el sistema genere enlaces de Meet para tus sesiones remotas.
                                                        </p>
                                                    </div>
                                                    <div className="pt-6 mt-4 border-t border-border/50 flex justify-end">
                                                        <Button 
                                                            variant="zen" 
                                                            size="sm" 
                                                            className="w-full gap-2 font-bold"
                                                            onClick={handleLinkGoogleCalendar}
                                                            disabled={isLinking}
                                                        >
                                                            {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                                                            Conectar cuenta
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Outlook / Microsoft 365 Card */}
                                            {false && !hasOutlookCalendar && (integrationFilter === 'all' || integrationFilter === 'calendar' || integrationFilter === 'video') && (
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden">
                                                    <div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-blue-50/50 flex items-center justify-center shrink-0 border border-blue-100/50">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24">
                                                                    <path fill="#0078D4" d="M16 12V4.5c0-.83-.67-1.5-1.5-1.5h-10c-.83 0-1.5.67-1.5 1.5V12h13z" />
                                                                    <path fill="#28A8EA" d="M16 12v7.5c0 .83-.67 1.5-1.5 1.5h-10c-.83 0-1.5-.67-1.5-1.5V12h13z" />
                                                                    <path fill="#0078D4" d="M3 8h10v8H3z" />
                                                                    <path fill="#fff" d="M11 10h1.5v4H11v-4zM6 10h1.5v4H6v-4z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground">Microsoft 365</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Outlook Calendar e integración con Teams.</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            Sincroniza tus eventos de Outlook y utiliza Microsoft Teams para tus sesiones de teleterapia.
                                                        </p>
                                                    </div>
                                                    <div className="pt-6 mt-4 border-t border-border/50 flex justify-end gap-2">
                                                        <Button 
                                                            variant="zen" 
                                                            size="sm" 
                                                            className="w-full gap-2 font-bold"
                                                            onClick={handleLinkMicrosoftCalendar}
                                                            disabled={isLinking}
                                                        >
                                                            {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                                                            Conectar cuenta
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Apple Calendar (Placeholder) */}
                                            {false && (integrationFilter === 'all' || integrationFilter === 'calendar') && (
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all flex flex-col justify-between group">
                                                    <div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 border border-border">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24">
                                                                    <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.24-1.99 1.1-3.15-1.09.04-2.41.72-3.19 1.63-.69.8-1.26 1.97-1.09 3.11 1.2.09 2.44-.73 3.18-1.59Z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground">iCal / iCloud</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Calendario de Apple.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-6 mt-4 border-t border-border/50 flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Próximamente</span>
                                                        <Button variant="ghost" size="sm" disabled className="h-8 text-xs font-bold px-4">Conectar</Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Zoom Card */}
                                            {!hasZoom && (integrationFilter === 'all' || integrationFilter === 'video') && (
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                                                    <div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-blue-50/50 flex items-center justify-center shrink-0 border border-blue-100/50 text-[#2D8CFF]">
                                                                <Video className="h-7 w-7" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground">Zoom</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Videollamadas profesionales y estables.</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            Conecta tu cuenta de Zoom para que Saudade genere de forma automática enlaces únicos para tus sesiones de teleterapia.
                                                        </p>
                                                    </div>
                                                    <div className="pt-6 mt-4 border-t border-border/50 flex justify-end gap-2">
                                                        <Button 
                                                            variant="zen" 
                                                            size="sm" 
                                                            className="w-full gap-2 font-bold"
                                                            onClick={handleLinkZoom}
                                                            disabled={isLinking}
                                                        >
                                                            {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
                                                            Conectar cuenta
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Other Categories Placeholder */}
                                    {(integrationFilter === 'all' || integrationFilter === 'payments') && (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Finanzas y Pagos</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden">
                                                    {stripeStatus === 'active' && (
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-0.5 px-2">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conectado
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    {stripeStatus === 'pending' && (
                                                        <div className="absolute top-0 right-0 p-3">
                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 py-0.5 px-2">
                                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                                Pendiente
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-start gap-4 mb-4">
                                                            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-[#635BFF]">
                                                                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M13.962 8.185v7.63c0 .156.15.25.29.174l4.29-2.28a.2.2 0 0 0 .11-.174V5.905a.2.2 0 0 0-.29-.174l-4.29 2.28a.2.2 0 0 0-.11.174zM8.185 10.038v7.63c0 .156.15.25.29.174l4.29-2.28a.2.2 0 0 0 .11-.174V7.758a.2.2 0 0 0-.29-.174l-4.29 2.28a.2.2 0 0 0-.11.174zM2.408 11.89v7.63c0 .156.15.25.29.174l4.29-2.28a.2.2 0 0 0 .11-.174v-7.63a.2.2 0 0 0-.29-.174l-4.29 2.28a.2.2 0 0 0-.11.174z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground pr-24">Stripe Connect</h4>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5">Recibe pagos de pacientes.</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {stripeStatus === 'pending'
                                                                ? 'Vinculación iniciada pero pendiente de completar el registro en la página de Stripe.'
                                                                : 'Vincula tu cuenta para cobrar en línea automáticamente mediante la plataforma.'}
                                                        </p>
                                                    </div>
                                                    <div className="pt-6 mt-4 border-t border-border/50 flex justify-end gap-2">
                                                        {stripeStatus === 'active' ? (
                                                            <>
                                                                <Button variant="ghost" size="sm" className="h-8 text-[10px] text-destructive font-bold" onClick={handleUnlinkStripe} disabled={isUnlinking}>
                                                                    Desconectar
                                                                </Button>
                                                                <Button variant="outline" size="sm" className="h-8 gap-2 font-bold" onClick={handleLinkStripe} disabled={isLinkingStripe}>
                                                                    {isLinkingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Dashboard
                                                                </Button>
                                                            </>
                                                        ) : stripeStatus === 'pending' ? (
                                                            <>
                                                                <Button variant="ghost" size="sm" className="h-8 text-[10px] text-destructive font-bold" onClick={handleUnlinkStripe} disabled={isUnlinking}>
                                                                    Desconectar
                                                                </Button>
                                                                <Button variant="zen" size="sm" className="h-8 gap-2 font-bold" onClick={handleLinkStripe} disabled={isLinkingStripe}>
                                                                    {isLinkingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />} Completar registro
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button 
                                                                variant="zen" 
                                                                size="sm" 
                                                                className="w-full gap-2 font-bold"
                                                                onClick={handleLinkStripe}
                                                                disabled={isLinkingStripe}
                                                            >
                                                                {isLinkingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                                                                Conectar cuenta
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Seguridad y Notificaciones ────────────────── */}
                        {activeTab === 'seguridad' && (
                            <div className="space-y-6">
                                {/* Notificaciones */}
                                <Card variant="flat" className="border border-border">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                <Bell className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Canales de Notificación</CardTitle>
                                                <CardDescription>Define cómo quieres recibir recordatorios de citas</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Integraciones de Terceros */}
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-foreground">Ajustes Generales</p>
                                            <p className="text-xs text-muted-foreground">Configura cómo recibes avisos de tus citas.</p>
                                        </div>

                                        {/* Psicólogo */}
                                        <div className="space-y-3 border-t border-border pt-5">
                                            <p className="text-sm font-semibold text-foreground">Mis notificaciones (Psicólogo)</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Correo electrónico</p>
                                                            <p className="text-xs text-muted-foreground">Recibe recordatorios a tu correo</p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="psic_email"
                                                        checked={notif.psicologo_email}
                                                        onCheckedChange={(v) => setNotif({ ...notif, psicologo_email: v })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">WhatsApp</p>
                                                            <p className="text-xs text-muted-foreground">Mensajes de WhatsApp <span className="text-success font-medium">— Habilitado</span></p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="psic_wa"
                                                        checked={notif.psicologo_whatsapp}
                                                        onCheckedChange={(v) => setNotif({ ...notif, psicologo_whatsapp: v })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pacientes */}
                                        <div className="space-y-3 border-t border-border pt-5">
                                            <p className="text-sm font-semibold text-foreground">Notificaciones de pacientes</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Correo electrónico al paciente</p>
                                                            <p className="text-xs text-muted-foreground">Envía recordatorios a los pacientes por correo</p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="pac_email"
                                                        checked={notif.paciente_email}
                                                        onCheckedChange={(v) => setNotif({ ...notif, paciente_email: v })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">WhatsApp al paciente</p>
                                                            <p className="text-xs text-muted-foreground">Mensajes de WhatsApp <span className="text-success font-medium">— Habilitado</span></p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="pac_wa"
                                                        checked={notif.paciente_whatsapp}
                                                        onCheckedChange={(v) => setNotif({ ...notif, paciente_whatsapp: v })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recordatorios Automáticos */}
                                        <div className="space-y-3 border-t border-border pt-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">Recordatorios Automáticos</p>
                                                    <p className="text-xs text-muted-foreground">Configura notificaciones automáticas antes de la cita para reducir inasistencias.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {/* Selector de Anticipación */}
                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 bg-muted/5">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Anticipación del recordatorio</p>
                                                            <p className="text-xs text-muted-foreground">Define cuántas horas antes de la cita se enviará el aviso</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={24}
                                                            step={1}
                                                            value={notif.recordatorio_horas ?? 24}
                                                            onChange={(e) => {
                                                                let val = parseInt(e.target.value);
                                                                if (isNaN(val)) val = 24;
                                                                if (val > 24) val = 24;
                                                                if (val < 1) val = 1;
                                                                setNotif({ ...notif, recordatorio_horas: val });
                                                            }}
                                                            className="w-20 text-center bg-background font-bold text-primary"
                                                        />
                                                        <span className="text-sm font-medium text-muted-foreground">hrs antes</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Recordatorio por Correo</p>
                                                            <p className="text-xs text-muted-foreground">Envía un email automático de aviso al paciente.</p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="rec_email"
                                                        checked={notif.recordatorio_24h_email}
                                                        onCheckedChange={(v) => setNotif({ ...notif, recordatorio_24h_email: v })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium">Recordatorio por WhatsApp</p>
                                                            <p className="text-xs text-muted-foreground">Envía un mensaje automático de WhatsApp al paciente <span className="text-success font-medium">— Habilitado</span></p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="rec_wa"
                                                        checked={notif.recordatorio_24h_whatsapp}
                                                        onCheckedChange={(v) => setNotif({ ...notif, recordatorio_24h_whatsapp: v })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <Button type="button" variant="zen" disabled={isSaving} className="gap-2" onClick={handleSaveNotif}>
                                                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar notificaciones'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* MFA */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                            Seguridad — Autenticación en dos pasos
                                        </h2>
                                    </div>
                                    <MFASetup />
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Servicios de Agenda ────────────────────────── */}
                        {activeTab === 'servicios' && (
                            <div className="space-y-6">
                                <Card variant="flat" className="border border-border">
                                    <CardHeader className="pb-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                    <LayoutGrid className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">Servicios de Agenda</CardTitle>
                                                    <CardDescription>Configura los tipos de sesión, precios y duraciones</CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40">
                                                    <button 
                                                        onClick={() => setServiceFilter('all')}
                                                        className={cn(
                                                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                                            serviceFilter === 'all' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        Todos
                                                    </button>
                                                    <button 
                                                        onClick={() => setServiceFilter('public')}
                                                        className={cn(
                                                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                                            serviceFilter === 'public' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        Públicos
                                                    </button>
                                                    <button 
                                                        onClick={() => setServiceFilter('private')}
                                                        className={cn(
                                                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                                            serviceFilter === 'private' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        Privados
                                                    </button>
                                                </div>
                                                <Button variant="zen" size="sm" className="gap-1.5 font-bold" onClick={() => { setEditingService(null); setShowServiceModal(true); }}>
                                                    <Plus className="h-3.5 w-3.5" /> Nuevo Servicio
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingServices ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                                                <p className="text-xs text-muted-foreground font-medium animate-pulse">Cargando servicios...</p>
                                            </div>
                                        ) : services.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/5">
                                                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                                    <LayoutGrid className="h-8 w-8 text-primary/20" />
                                                </div>
                                                <h3 className="text-base font-bold text-foreground">No tienes servicios configurados</h3>
                                                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                                                    Define tus tipos de terapia para que tus pacientes puedan agendar en línea.
                                                </p>
                                                <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => setShowServiceModal(true)}>
                                                    <Plus className="h-3.5 w-3.5" /> Crear mi primer servicio
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                {services
                                                    .filter(s => {
                                                        if (serviceFilter === 'public') return s.is_public;
                                                        if (serviceFilter === 'private') return !s.is_public;
                                                        return true;
                                                    })
                                                    .map((service) => (
                                                        <ServiceCard 
                                                            key={service.id} 
                                                            service={service} 
                                                            onEdit={() => { setEditingService(service); setShowServiceModal(true); }}
                                                            onDelete={() => handleDeleteService(service.id!)}
                                                            onShare={() => {
                                                                const url = `${window.location.origin}/reservar/${profile.slug}?service=${service.id}`;
                                                                navigator.clipboard.writeText(url);
                                                                toast.success('Enlace del servicio copiado');
                                                            }}
                                                        />
                                                    ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Tab: Preguntas de Reserva ─────────────────────── */}
                        {activeTab === 'preguntas' && (
                            <div className="space-y-6">
                                <Card variant="flat" className="border border-border">
                                    <CardHeader className="pb-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                    <HelpCircle className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">Preguntas de Reserva</CardTitle>
                                                    <CardDescription>Configura preguntas que tus pacientes responderán al agendar una cita</CardDescription>
                                                </div>
                                            </div>
                                            <Button variant="zen" size="sm" className="gap-1.5 font-bold" onClick={() => { setEditingQuestion(null); setShowQuestionModal(true); }}>
                                                <Plus className="h-3.5 w-3.5" /> Nueva Pregunta
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoadingQuestions ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                                                <p className="text-xs text-muted-foreground font-medium animate-pulse">Cargando preguntas...</p>
                                            </div>
                                        ) : bookingQuestions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/5">
                                                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                                    <HelpCircle className="h-8 w-8 text-primary/20" />
                                                </div>
                                                <h3 className="text-base font-bold text-foreground">Sin preguntas configuradas</h3>
                                                <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                                                    Agrega preguntas personalizadas para conocer mejor a tus pacientes antes de la primera sesión.
                                                </p>
                                                <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => setShowQuestionModal(true)}>
                                                    <Plus className="h-3.5 w-3.5" /> Crear mi primera pregunta
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {bookingQuestions.map((q, idx) => (
                                                    <div key={q.id} className={cn(
                                                        "flex items-center gap-3 p-4 rounded-2xl border transition-all group",
                                                        q.active ? "bg-card border-border hover:shadow-sm" : "bg-muted/10 border-border/40 opacity-60"
                                                    )}>
                                                        {/* Reorder buttons */}
                                                        <div className="flex flex-col gap-0.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveQuestion(q.id!, 'up')}
                                                                disabled={idx === 0}
                                                                className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                                                            >
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMoveQuestion(q.id!, 'down')}
                                                                disabled={idx === bookingQuestions.length - 1}
                                                                className="p-0.5 text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                                                            >
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Question info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-semibold text-sm truncate">{q.label}</h4>
                                                                {q.is_required && (
                                                                    <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Obligatoria</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1">
                                                                    {(() => {
                                                                        const qt = QUESTION_TYPES.find(t => t.value === q.type);
                                                                        const Icon = qt?.icon || Type;
                                                                        return <><Icon className="h-2.5 w-2.5" /> {qt?.label || q.type}</>;
                                                                    })()}
                                                                </Badge>
                                                                {(q.type === 'select_one' || q.type === 'select_many') && q.options.length > 0 && (
                                                                    <span className="text-[10px] text-muted-foreground">{q.options.length} opciones</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Switch
                                                                checked={q.active}
                                                                onCheckedChange={(v) => handleToggleQuestion(q.id!, v)}
                                                                className="scale-75"
                                                            />
                                                            <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5" onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }}>
                                                                <SettingsIcon className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => handleDeleteQuestion(q.id!)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="pt-4 border-t border-border/30">
                                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                                        <HelpCircle className="h-3 w-3" />
                                                        Estas preguntas se mostrarán a los pacientes en tu portal público de reservas.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Tab: Plantillas de Notas ─────────────────────── */}
                        {activeTab === 'plantillas' && (
                            <div className="space-y-6">
                                <Card variant="flat" className="border border-border">
                                    <CardHeader className="pb-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">Plantillas de Notas Clínicas</CardTitle>
                                                    <CardDescription>Estructuras predefinidas para registrar sesiones según tu enfoque terapéutico</CardDescription>
                                                </div>
                                            </div>
                                            <Button variant="zen" size="sm" className="gap-1.5 font-bold" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
                                                <Plus className="h-3.5 w-3.5" /> Nueva Plantilla
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {/* View toggle */}
                                        <div className="flex bg-muted/20 p-1 rounded-xl border border-border/40 mb-6 w-fit">
                                            <button
                                                onClick={() => setTemplateView('system')}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                    templateView === 'system' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <Lock className="h-3 w-3" /> Del Sistema ({noteTemplates.filter(t => t.is_system).length})
                                            </button>
                                            <button
                                                onClick={() => setTemplateView('custom')}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                    templateView === 'custom' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <Palette className="h-3 w-3" /> Mis Plantillas ({noteTemplates.filter(t => !t.is_system).length})
                                            </button>
                                        </div>

                                        {isLoadingTemplates ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                                                <p className="text-xs text-muted-foreground font-medium animate-pulse">Cargando plantillas...</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* System Templates */}
                                                {templateView === 'system' && (
                                                    <div className="space-y-4">
                                                        {noteTemplates.filter(t => t.is_system).length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                                <Lock className="h-8 w-8 text-muted-foreground/20 mb-3" />
                                                                <p className="text-sm text-muted-foreground">No hay plantillas del sistema disponibles.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                {noteTemplates.filter(t => t.is_system).map(template => {
                                                                    const colorDef = TEMPLATE_COLORS.find(c => c.value === template.color) || TEMPLATE_COLORS[4];
                                                                    return (
                                                                        <div key={template.id} className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
                                                                            <div className="flex items-start gap-3 mb-3">
                                                                                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", colorDef.bg)}>
                                                                                    <FileText className={cn("h-5 w-5", colorDef.text)} />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <h4 className="font-bold text-sm">{template.name}</h4>
                                                                                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-1 gap-1">
                                                                                        <Lock className="h-2 w-2" /> SISTEMA
                                                                                    </Badge>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{template.description}</p>
                                                                            <div className="flex flex-wrap gap-1 mb-4">
                                                                                {template.sections.map(s => {
                                                                                    const sec = TEMPLATE_SECTIONS.find(ts => ts.key === s);
                                                                                    return (
                                                                                        <Badge key={s} variant="secondary" className="text-[9px] h-5 px-1.5 gap-1">
                                                                                            {sec && <sec.icon className="h-2.5 w-2.5" />}
                                                                                            {template.section_labels?.[s] || sec?.label || s}
                                                                                        </Badge>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="w-full gap-2 text-xs font-bold"
                                                                                onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                                                                            >
                                                                                <Eye className="h-3.5 w-3.5" /> Ver Estructura
                                                                            </Button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Custom Templates */}
                                                {templateView === 'custom' && (
                                                    <div className="space-y-4">
                                                        {noteTemplates.filter(t => !t.is_system).length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/5">
                                                                <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                                                    <Palette className="h-8 w-8 text-primary/20" />
                                                                </div>
                                                                <h3 className="text-base font-bold text-foreground">Sin plantillas personalizadas</h3>
                                                                <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
                                                                    Crea tus propias plantillas adaptadas a tu enfoque terapéutico y estilo de trabajo.
                                                                </p>
                                                                <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
                                                                    <Plus className="h-3.5 w-3.5" /> Crear mi primera plantilla
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                {noteTemplates.filter(t => !t.is_system).map(template => {
                                                                    const colorDef = TEMPLATE_COLORS.find(c => c.value === template.color) || TEMPLATE_COLORS[4];
                                                                    return (
                                                                        <div key={template.id} className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
                                                                            <div className="flex items-start gap-3 mb-3">
                                                                                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shrink-0", colorDef.bg)}>
                                                                                    <FileText className={cn("h-5 w-5", colorDef.text)} />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <h4 className="font-bold text-sm">{template.name}</h4>
                                                                                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-1 gap-1">
                                                                                        <Palette className="h-2 w-2" /> PERSONALIZADA
                                                                                    </Badge>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{template.description || 'Sin descripción'}</p>
                                                                            <div className="flex flex-wrap gap-1 mb-4">
                                                                                {template.sections.map(s => {
                                                                                    const sec = TEMPLATE_SECTIONS.find(ts => ts.key === s);
                                                                                    return (
                                                                                        <Badge key={s} variant="secondary" className="text-[9px] h-5 px-1.5 gap-1">
                                                                                            {sec && <sec.icon className="h-2.5 w-2.5" />}
                                                                                            {template.section_labels?.[s] || sec?.label || s}
                                                                                        </Badge>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="flex-1 gap-2 text-xs font-bold"
                                                                                    onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                                                                                >
                                                                                    <SettingsIcon className="h-3.5 w-3.5" /> Editar
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon-sm"
                                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                                                                    onClick={() => handleDeleteTemplate(template.id!)}
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="pt-4 border-t border-border/30 mt-6">
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                                <FileText className="h-3 w-3" />
                                                Las plantillas del sistema están optimizadas para cada enfoque terapéutico. Crea las tuyas para personalizar tu flujo de trabajo.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ServiceModal 
                open={showServiceModal}
                onOpenChange={setShowServiceModal}
                service={editingService}
                onSave={handleSaveService}
                isSaving={isSavingService}
            />

            <QuestionModal
                open={showQuestionModal}
                onOpenChange={setShowQuestionModal}
                question={editingQuestion}
                onSave={handleSaveQuestion}
                isSaving={isSavingQuestion}
            />

            <TemplateModal
                open={showTemplateModal}
                onOpenChange={setShowTemplateModal}
                template={editingTemplate}
                onSave={handleSaveTemplate}
                isSaving={isSavingTemplate}
            />

            {/* Unlink Confirmation Dialog */}
            <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            ¿Desconectar Google Calendar?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esto detendrá la sincronización de citas y la creación automática de enlaces de Google Meet. 
                            Deberás volver a conectar tu cuenta para restaurar estas funciones.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUnlinking}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                handleUnlinkGoogleCalendar();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isUnlinking}
                        >
                            {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Sí, desconectar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
};

// ── Sub-components for Services ───────────────────────────────────────────────

const ServiceCard = ({ service, onEdit, onDelete, onShare }: { service: Service, onEdit: () => void, onDelete: () => void, onShare: () => void }) => {
    const borderColor = {
        violet: 'border-t-violet-500',
        blue: 'border-t-blue-500',
        green: 'border-t-emerald-500',
        amber: 'border-t-amber-500',
        rose: 'border-t-rose-500',
        indigo: 'border-t-indigo-500',
    }[service.color || 'violet'] || 'border-t-primary';

    return (
        <div className={cn(
            "bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden border-t-4",
            borderColor,
            !service.active && "opacity-60 grayscale"
        )}>
            <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                    {service.name}
                </h4>
                <Badge variant={service.is_public ? "zen" : "outline"} className="text-[9px] uppercase tracking-tighter h-5">
                    {service.is_public ? (
                        <div className="flex items-center gap-1"><BookOpen className="h-2.5 w-2.5" /> Público</div>
                    ) : (
                        <div className="flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Privado</div>
                    )}
                </Badge>
            </div>
            
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Duración: <strong className="text-foreground">{service.duration} min</strong></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Precio: <strong className="text-primary text-sm">${service.price} MXN</strong></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Comisión: <strong className="text-foreground">{service.commission_percentage !== undefined && service.commission_percentage !== null ? `${service.commission_percentage}%` : 'Global'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500/80" />
                    <span className="text-xs font-medium">Límite cancelar: <strong className="text-foreground">{service.reschedule_policy_hours !== undefined && service.reschedule_policy_hours !== null ? `${service.reschedule_policy_hours}h` : 'Global'}</strong></span>
                </div>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-6 leading-relaxed">
                {service.description || 'Sin descripción.'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tight gap-1 px-2 hover:bg-primary/5 hover:text-primary" onClick={onShare}>
                    <Share2 className="h-3 w-3" /> Compartir
                </Button>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5" onClick={onEdit}>
                        <SettingsIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ServiceModal = ({ open, onOpenChange, service, onSave, isSaving }: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    service: Service | null, 
    onSave: (data: Service) => void,
    isSaving: boolean
}) => {
    const [formData, setFormData] = useState<Service>({
        name: '',
        description: '',
        duration: 60,
        price: 800,
        is_public: true,
        color: 'violet',
        active: true,
        commission_percentage: null,
        reschedule_policy_hours: null
    });

    useEffect(() => {
        if (service) {
            setFormData({
                ...service,
                reschedule_policy_hours: service.reschedule_policy_hours !== undefined ? service.reschedule_policy_hours : null
            });
        } else {
            setFormData({
                name: '',
                description: '',
                duration: 60,
                price: 800,
                is_public: true,
                color: 'violet',
                active: true,
                commission_percentage: null,
                reschedule_policy_hours: null
            });
        }
    }, [service, open]);

    const colors = [
        { name: 'violet', class: 'bg-violet-500' },
        { name: 'blue', class: 'bg-blue-500' },
        { name: 'green', class: 'bg-emerald-500' },
        { name: 'amber', class: 'bg-amber-500' },
        { name: 'rose', class: 'bg-rose-500' },
        { name: 'indigo', class: 'bg-indigo-500' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl">
                <div className={cn("h-2 w-full", {
                    'bg-violet-500': formData.color === 'violet',
                    'bg-blue-500': formData.color === 'blue',
                    'bg-emerald-500': formData.color === 'green',
                    'bg-amber-500': formData.color === 'amber',
                    'bg-rose-500': formData.color === 'rose',
                    'bg-indigo-500': formData.color === 'indigo',
                })} />
                
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {service ? 'Editar Servicio' : 'Nuevo Servicio de Agenda'}
                    </DialogTitle>
                    <DialogDescription>
                        Configura los detalles de este tipo de sesión.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4 space-y-5">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del Servicio *</Label>
                        <Input 
                            placeholder="Ej. Terapia Individual Adultos" 
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="rounded-xl h-11 border-border/60 focus:ring-primary/20"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duración (min) *</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                    className="rounded-xl h-11 border-border/60 pl-10"
                                />
                                <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio (MXN) *</Label>
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                    className="rounded-xl h-11 border-border/60 pl-10"
                                />
                                <DollarSign className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comisión del Consultorio (%) (Opcional)</Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                placeholder="Porcentaje personalizado para este servicio"
                                value={formData.commission_percentage !== undefined && formData.commission_percentage !== null ? formData.commission_percentage : ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({ 
                                        ...formData, 
                                        commission_percentage: val === '' ? null : parseFloat(val)
                                    });
                                }}
                                className="rounded-xl h-11 border-border/60 pl-10 focus:ring-primary/20"
                                min={0}
                                max={100}
                                step={0.1}
                            />
                            <Percent className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <p className="text-[11px] text-muted-foreground/70">
                            Dejar vacío para usar la comisión global configurada en tu perfil del especialista.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Límite para Cancelar/Reagendar (Horas) (Opcional)</Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                placeholder="Horas personalizadas para este servicio"
                                value={formData.reschedule_policy_hours !== undefined && formData.reschedule_policy_hours !== null ? formData.reschedule_policy_hours : ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData({ 
                                        ...formData, 
                                        reschedule_policy_hours: val === '' ? null : parseInt(val)
                                    });
                                }}
                                className="rounded-xl h-11 border-border/60 pl-10 focus:ring-primary/20"
                                min={0}
                                step={1}
                            />
                            <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <p className="text-[11px] text-muted-foreground/70">
                            Dejar vacío para usar el límite global configurado en tu perfil del especialista (24h por defecto).
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción (Opcional)</Label>
                        <Textarea 
                            placeholder="Breve descripción del servicio para tus pacientes..." 
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="rounded-xl resize-none border-border/60"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Visibilidad Pública</Label>
                            <p className="text-[11px] text-muted-foreground">Mostrar este servicio en tu página de reservas.</p>
                        </div>
                        <Switch 
                            checked={formData.is_public}
                            onCheckedChange={v => setFormData({ ...formData, is_public: v })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color distintivo</Label>
                        <div className="flex gap-3">
                            {colors.map(c => (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c.name })}
                                    className={cn(
                                        "h-8 w-8 rounded-full transition-all border-2",
                                        c.class,
                                        formData.color === c.name ? "border-foreground scale-110 shadow-md" : "border-transparent opacity-70 hover:opacity-100"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 bg-muted/20 gap-3 border-t border-border/50">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">
                        Cancelar
                    </Button>
                    <Button 
                        variant="zen" 
                        onClick={() => onSave(formData)} 
                        disabled={isSaving || !formData.name}
                        className="rounded-xl h-11 px-8 font-bold gap-2"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {service ? 'Actualizar Servicio' : 'Crear Servicio'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const QuestionModal = ({ open, onOpenChange, question, onSave, isSaving }: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    question: BookingQuestion | null,
    onSave: (data: BookingQuestion) => void,
    isSaving: boolean
}) => {
    const [formData, setFormData] = useState<BookingQuestion>({
        label: '',
        type: 'text',
        options: [],
        is_required: false,
        sort_order: 0,
        active: true
    });
    const [newOption, setNewOption] = useState('');

    useEffect(() => {
        if (question) {
            setFormData(question);
        } else {
            setFormData({
                label: '',
                type: 'text',
                options: [],
                is_required: false,
                sort_order: 0,
                active: true
            });
        }
        setNewOption('');
    }, [question, open]);

    const addOption = () => {
        if (!newOption.trim()) return;
        setFormData(prev => ({ ...prev, options: [...prev.options, newOption.trim()] }));
        setNewOption('');
    };

    const removeOption = (idx: number) => {
        setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
    };

    const needsOptions = formData.type === 'select_one' || formData.type === 'select_many';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-3xl">
                <div className="h-2 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        {question ? 'Editar Pregunta' : 'Nueva Pregunta de Reserva'}
                    </DialogTitle>
                    <DialogDescription>
                        Esta pregunta se mostrar\u00e1 en tu portal p\u00fablico de reservas.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 space-y-5 pb-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Label */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pregunta</Label>
                        <Input
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="Ej. \u00bfHas recibido atenci\u00f3n psicol\u00f3gica antes?"
                            className="h-11"
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de respuesta</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {QUESTION_TYPES.map(qt => {
                                const Icon = qt.icon;
                                return (
                                    <button
                                        key={qt.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: qt.value as BookingQuestion['type'] })}
                                        className={cn(
                                            "flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all",
                                            formData.type === qt.value
                                                ? "border-primary bg-primary/5 text-primary font-semibold shadow-sm"
                                                : "border-border bg-card hover:border-primary/30 hover:bg-primary/5 text-muted-foreground"
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span className="truncate text-xs">{qt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Options (for select_one / select_many) */}
                    {needsOptions && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opciones</Label>
                            <div className="space-y-2">
                                {formData.options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 p-2.5 px-3 rounded-lg border border-border bg-muted/10">
                                            {formData.type === 'select_one' ? (
                                                <CircleDot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            ) : (
                                                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            )}
                                            <span className="text-sm">{opt}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={newOption}
                                        onChange={(e) => setNewOption(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                                        placeholder="Escribe una opci\u00f3n y presiona Enter"
                                        className="h-10"
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={!newOption.trim()}>
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Required */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                        <div>
                            <p className="text-sm font-medium">Obligatoria</p>
                            <p className="text-xs text-muted-foreground">El paciente debe responder para poder agendar</p>
                        </div>
                        <Switch
                            checked={formData.is_required}
                            onCheckedChange={(v) => setFormData({ ...formData, is_required: v })}
                        />
                    </div>

                    {/* Preview */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vista previa</Label>
                        <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                            <p className="text-sm font-medium mb-2">
                                {formData.label || 'Tu pregunta aqu\u00ed...'} {formData.is_required && <span className="text-destructive">*</span>}
                            </p>
                            {formData.type === 'text' && (
                                <div className="h-10 rounded-md border border-border bg-white/60 px-3 flex items-center text-xs text-muted-foreground">Respuesta...</div>
                            )}
                            {formData.type === 'textarea' && (
                                <div className="h-20 rounded-md border border-border bg-white/60 px-3 pt-2 text-xs text-muted-foreground">Respuesta...</div>
                            )}
                            {formData.type === 'yes_no' && (
                                <div className="flex gap-2">
                                    <div className="flex-1 h-10 rounded-lg border border-border bg-white/60 flex items-center justify-center text-sm font-medium text-muted-foreground">S\u00ed</div>
                                    <div className="flex-1 h-10 rounded-lg border border-border bg-white/60 flex items-center justify-center text-sm font-medium text-muted-foreground">No</div>
                                </div>
                            )}
                            {formData.type === 'select_one' && formData.options.length > 0 && (
                                <div className="space-y-1.5">
                                    {formData.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {formData.type === 'select_many' && formData.options.length > 0 && (
                                <div className="space-y-1.5">
                                    {formData.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="h-4 w-4 rounded border-2 border-border shrink-0" />
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-6 bg-muted/20 gap-3 border-t border-border/50">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">
                        Cancelar
                    </Button>
                    <Button
                        variant="zen"
                        onClick={() => onSave(formData)}
                        disabled={isSaving || !formData.label || (needsOptions && formData.options.length === 0)}
                        className="rounded-xl h-11 px-8 font-bold gap-2"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {question ? 'Actualizar Pregunta' : 'Crear Pregunta'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TemplateModal = ({ open, onOpenChange, template, onSave, isSaving }: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    template: NoteTemplate | null,
    onSave: (data: NoteTemplate) => void,
    isSaving: boolean
}) => {
    const isSystem = template?.is_system === true;
    const isEditing = template && !isSystem;
    const isViewing = isSystem;

    const [formData, setFormData] = useState<NoteTemplate>({
        name: '',
        description: '',
        sections: [],
        section_labels: {},
        is_system: false,
        color: 'violet',
        active: true
    });

    useEffect(() => {
        if (template) {
            setFormData({ ...template });
        } else {
            setFormData({
                name: '',
                description: '',
                sections: [],
                section_labels: {},
                is_system: false,
                color: 'violet',
                active: true
            });
        }
    }, [template, open]);

    const toggleSection = (key: string) => {
        if (isViewing) return;
        setFormData(prev => {
            const exists = prev.sections.includes(key);
            const newSections = exists
                ? prev.sections.filter(s => s !== key)
                : [...prev.sections, key];
            const newLabels = { ...prev.section_labels };
            if (exists) {
                delete newLabels[key];
            } else {
                const sec = TEMPLATE_SECTIONS.find(s => s.key === key);
                if (sec) newLabels[key] = sec.label;
            }
            return { ...prev, sections: newSections, section_labels: newLabels };
        });
    };

    const updateLabel = (key: string, label: string) => {
        if (isViewing) return;
        setFormData(prev => ({
            ...prev,
            section_labels: { ...prev.section_labels, [key]: label }
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">

                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {isViewing ? template?.name : isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </DialogTitle>
                    <DialogDescription>
                        {isViewing
                            ? 'Esta plantilla del sistema no puede modificarse.'
                            : 'Define la estructura de secciones para tus notas clínicas.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 space-y-5 pb-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Name & Description (hidden for system view) */}
                    {!isViewing && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Mi plantilla TCC adaptada"
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Breve descripción del enfoque..."
                                    className="h-11"
                                />
                            </div>
                            {/* Color selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color</Label>
                                <div className="flex gap-2">
                                    {TEMPLATE_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: c.value })}
                                            className={cn(
                                                "h-8 w-8 rounded-full transition-all border-2",
                                                c.bg,
                                                formData.color === c.value ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* System template info */}
                    {isViewing && template && (
                        <div className="p-4 rounded-xl bg-muted/10 border border-border">
                            <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" className="text-[9px] gap-1">
                                    <Lock className="h-2 w-2" /> Solo lectura
                                </Badge>
                                <Badge variant="secondary" className="text-[9px]">
                                    {template.sections.length} secciones
                                </Badge>
                            </div>
                        </div>
                    )}

                    {/* Section Toggles */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {isViewing ? 'Secciones incluidas' : 'Secciones (selecciona las que necesites)'}
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {TEMPLATE_SECTIONS.map(sec => {
                                const isActive = formData.sections.includes(sec.key);
                                const Icon = sec.icon;
                                return (
                                    <button
                                        key={sec.key}
                                        type="button"
                                        onClick={() => toggleSection(sec.key)}
                                        disabled={isViewing && !isActive}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                            isActive
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : isViewing
                                                    ? "border-border/30 bg-muted/5 opacity-40"
                                                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/5",
                                            isViewing && "cursor-default"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                                            isActive ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted-foreground"
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-xs font-bold",
                                                isActive ? "text-primary" : "text-muted-foreground"
                                            )}>{sec.label}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{sec.description}</p>
                                        </div>
                                        {isActive && !isViewing && (
                                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                        {isActive && isViewing && (
                                            <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0">Activa</Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Labels (only for editing/creating) */}
                    {!isViewing && formData.sections.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Etiquetas personalizadas
                            </Label>
                            <div className="space-y-2">
                                {formData.sections.map(sKey => {
                                    const sec = TEMPLATE_SECTIONS.find(s => s.key === sKey);
                                    return (
                                        <div key={sKey} className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 w-32 shrink-0">
                                                {sec && <sec.icon className="h-3 w-3 text-muted-foreground" />}
                                                <span className="text-[10px] font-bold text-muted-foreground truncate">{sec?.label}</span>
                                            </div>
                                            <Input
                                                value={formData.section_labels[sKey] || ''}
                                                onChange={e => updateLabel(sKey, e.target.value)}
                                                placeholder={sec?.label}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section labels preview for system */}
                    {isViewing && formData.sections.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Etiquetas de la plantilla
                            </Label>
                            <div className="space-y-1.5">
                                {formData.sections.map((sKey, idx) => {
                                    const sec = TEMPLATE_SECTIONS.find(s => s.key === sKey);
                                    const Icon = sec?.icon || FileText;
                                    return (
                                        <div key={sKey} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/30">
                                            <span className="text-[10px] font-black text-muted-foreground/40 w-5 text-center">{idx + 1}</span>
                                            <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="text-sm font-medium">{formData.section_labels[sKey] || sec?.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-6 bg-muted/20 gap-3 border-t border-border/50">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">
                        {isViewing ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!isViewing && (
                        <Button
                            variant="zen"
                            onClick={() => onSave(formData)}
                            disabled={isSaving || !formData.name || formData.sections.length === 0}
                            className="rounded-xl h-11 px-8 font-bold gap-2"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isEditing ? 'Actualizar Plantilla' : 'Crear Plantilla'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default Settings;

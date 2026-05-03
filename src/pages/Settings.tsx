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
    Loader2, CheckCircle2, DollarSign, Clock, Mail, MessageSquare, CalendarOff, Plus, Trash2, Copy, CalendarPlus,
    Building2, CreditCard, Unlink, AlertTriangle, PenTool, Eraser, RotateCcw, ChevronUp, ChevronDown, ExternalLink, GraduationCap, Briefcase,
    Instagram, Linkedin, Facebook
} from 'lucide-react';
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

const DIAS_SEMANA = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
];

type TabId = 'perfil' | 'horarios' | 'seguridad' | 'organizacion' | 'suscripcion';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'perfil', label: 'Perfil Profesional', icon: User },
    { id: 'horarios', label: 'Horarios y Comisiones', icon: Clock },
    { id: 'organizacion', label: 'Mi Organización', icon: Building2 },
    { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
    { id: 'seguridad', label: 'Seguridad y Notificaciones', icon: ShieldCheck },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Settings = () => {
    const { user } = useAuth();
    const { organization, availableOrganizations, switch: switchOrg, isAdmin } = useOrganization();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('perfil');
    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
    const [codeClient, setCodeClient] = useState<{ requestCode: () => void } | null>(null);

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
    });

    // ── Load ──────────────────────────────────────────────────────────────────
    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('prefix, full_name, avatar_url, cedulas, cursos, institucion_formadora, telefono_profesional, porcentaje_consultorio, stripe_fee_percent, horario_atencion, notification_settings, slug, is_public, google_refresh_token, signature_data, bio, experience_years, social_links')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data?.google_refresh_token) {
                setHasGoogleCalendar(true);
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
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (error) throw error;
            toast.success('Horarios y comisiones guardados');
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

                {/* Tab Buttons */}
                <div className="flex w-full rounded-xl border border-border overflow-hidden bg-muted/30">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-150',
                                    active
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
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
                                            <p className="text-sm font-semibold text-foreground">Integraciones</p>
                                            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-4 bg-primary/5">
                                                <div className="flex items-center gap-3">
                                                    <CalendarPlus className="h-5 w-5 text-primary" />
                                                    <div>
                                                        <p className="text-sm font-bold text-primary">Google Calendar (Sincronización)</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">Bloquea tus espacios ocupados personales para evitar choques en Saudade y agrega nuevas citas a tu agenda personal.</p>
                                                    </div>
                                                </div>
                                                {hasGoogleCalendar ? (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 py-1">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Conectado
                                                        </Badge>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                                            onClick={() => setShowUnlinkConfirm(true)}
                                                            disabled={isUnlinking}
                                                        >
                                                            {isUnlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                                                            Desconectar
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="zen" 
                                                        size="sm" 
                                                        onClick={handleLinkGoogleCalendar}
                                                        disabled={isLinking}
                                                        className="gap-2"
                                                    >
                                                        {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus className="h-3 w-3" />}
                                                        Conectar
                                                    </Button>
                                                )}
                                            </div>
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
                                                            <p className="text-xs text-muted-foreground">Mensajes de WhatsApp <span className="text-primary font-medium">— Próximamente</span></p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="psic_wa"
                                                        checked={notif.psicologo_whatsapp}
                                                        onCheckedChange={(v) => setNotif({ ...notif, psicologo_whatsapp: v })}
                                                        disabled
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
                                                            <p className="text-xs text-muted-foreground">Mensajes de WhatsApp <span className="text-primary font-medium">— Próximamente</span></p>
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        id="pac_wa"
                                                        checked={notif.paciente_whatsapp}
                                                        onCheckedChange={(v) => setNotif({ ...notif, paciente_whatsapp: v })}
                                                        disabled
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
                    </>
                )}
            </div>

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

export default Settings;

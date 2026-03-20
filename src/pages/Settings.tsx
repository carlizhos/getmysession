import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import MFASetup from '@/components/auth/MFASetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Settings as SettingsIcon, ShieldCheck, User, Bell,
    Loader2, CheckCircle2, DollarSign, Clock, Mail, MessageSquare, CalendarOff, Plus, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

type TabId = 'perfil' | 'horarios' | 'seguridad';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'perfil', label: 'Perfil Profesional', icon: User },
    { id: 'horarios', label: 'Horarios y Comisiones', icon: Clock },
    { id: 'seguridad', label: 'Seguridad y Notificaciones', icon: ShieldCheck },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Settings = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('perfil');

    const [profile, setProfile] = useState({
        prefix: 'none',
        full_name: '',
        email: '',
        institucion_formadora: '',
        telefono_profesional: '',
        porcentaje_consultorio: 30,
        stripe_fee_percent: 5.14,
    });

    const [cedulas, setCedulas] = useState<Cedula[]>([]);
    const [cursos, setCursos] = useState<Curso[]>([]);

    const newCedulaDefault = (): Cedula => ({ id: crypto.randomUUID(), numero: '', tipo: 'licenciatura', institucion: '' });
    const newCursoDefault = (): Curso => ({ id: crypto.randomUUID(), nombre: '', institucion: '', anio: '' });

    const [newCedula, setNewCedula] = useState<Cedula>(newCedulaDefault());
    const [newCurso, setNewCurso] = useState<Curso>(newCursoDefault());
    const [showAddCedula, setShowAddCedula] = useState(false);
    const [showAddCurso, setShowAddCurso] = useState(false);

    const [horario, setHorario] = useState({
        inicio: '08:00',
        fin: '17:00',
        dias: [1, 2, 3, 4, 5] as number[],
        dias_no_laborables: [] as string[], // YYYY-MM-DD
    });

    const [newNonWorkingDay, setNewNonWorkingDay] = useState('');

    const [notif, setNotif] = useState({
        psicologo_email: true,
        psicologo_whatsapp: false,
        paciente_email: true,
        paciente_whatsapp: false,
    });

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('prefix, full_name, cedulas, cursos, institucion_formadora, telefono_profesional, porcentaje_consultorio, stripe_fee_percent, horario_atencion, notification_settings')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                setProfile({
                    prefix: data?.prefix || 'none',
                    full_name: data?.full_name || user.user_metadata?.full_name || '',
                    email: user.email || '',
                    institucion_formadora: data?.institucion_formadora || '',
                    telefono_profesional: data?.telefono_profesional || '',
                    porcentaje_consultorio: data?.porcentaje_consultorio ?? 30,
                    stripe_fee_percent: data?.stripe_fee_percent ?? 5.14,
                });

                // Dynamic lists — stored as JSONB in profiles
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const d = data as any;
                if (Array.isArray(d?.cedulas)) setCedulas(d.cedulas);
                if (Array.isArray(d?.cursos)) setCursos(d.cursos);

                if (data?.horario_atencion) {
                    setHorario({
                        inicio: data.horario_atencion.inicio ?? '08:00',
                        fin: data.horario_atencion.fin ?? '17:00',
                        dias: data.horario_atencion.dias ?? [1, 2, 3, 4, 5],
                        dias_no_laborables: data.horario_atencion.dias_no_laborables ?? [],
                    });
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
        };
        load();
    }, [user]);

    // ── Saves ─────────────────────────────────────────────────────────────────

    const handleSavePerfil = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        setSaved(false);
        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                prefix: profile.prefix === 'none' ? null : profile.prefix,
                full_name: profile.full_name,
                cedulas: cedulas,
                cursos: cursos,
                institucion_formadora: profile.institucion_formadora || null,
                telefono_profesional: profile.telefono_profesional || null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });
            if (error) throw error;
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
        setHorario(prev => ({
            ...prev,
            dias: prev.dias.includes(d)
                ? prev.dias.filter(x => x !== d)
                : [...prev.dias, d].sort(),
        }));
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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Layout>
            <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <SettingsIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                        <p className="text-muted-foreground">Administra tu cuenta y perfil profesional</p>
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

                                        <div className="pt-2 space-y-6">

                                            {/* ── Teléfono profesional */}
                                            <div className="space-y-2">
                                                <Label htmlFor="telefono_profesional">Teléfono profesional</Label>
                                                <Input
                                                    id="telefono_profesional"
                                                    type="tel"
                                                    value={profile.telefono_profesional}
                                                    onChange={(e) => setProfile({ ...profile, telefono_profesional: e.target.value })}
                                                    placeholder="+52 55 1234 5678"
                                                    disabled={isSaving}
                                                />
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
                                                        {cedulas.map((c) => (
                                                            <div key={c.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
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
                                                        {cursos.map((c) => (
                                                            <div key={c.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
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
                                        {/* Días laborables */}
                                        <div className="space-y-2">
                                            <Label>Días laborables</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {DIAS_SEMANA.map((d) => (
                                                    <button
                                                        key={d.value}
                                                        type="button"
                                                        onClick={() => toggleDia(d.value)}
                                                        className={cn(
                                                            'h-9 w-12 rounded-lg text-sm font-medium border transition-all duration-150',
                                                            horario.dias.includes(d.value)
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                                                        )}
                                                    >
                                                        {d.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Horas */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="hora_inicio">Hora inicio</Label>
                                                <Input
                                                    id="hora_inicio"
                                                    type="time"
                                                    value={horario.inicio}
                                                    onChange={(e) => setHorario({ ...horario, inicio: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="hora_fin">Hora fin</Label>
                                                <Input
                                                    id="hora_fin"
                                                    type="time"
                                                    value={horario.fin}
                                                    onChange={(e) => setHorario({ ...horario, fin: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Días no laborables */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <CalendarOff className="h-4 w-4 text-muted-foreground" />
                                                <Label>Días festivos / No laborables</Label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Estos días aparecerán bloqueados en el calendario y no podrán agendarse citas.
                                            </p>

                                            <div className="flex gap-2">
                                                <Input
                                                    type="date"
                                                    value={newNonWorkingDay}
                                                    onChange={(e) => setNewNonWorkingDay(e.target.value)}
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
                                        {/* Psicólogo */}
                                        <div className="space-y-3">
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
        </Layout>
    );
};

export default Settings;

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import MFASetup from '@/components/auth/MFASetup';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Settings as SettingsIcon, ShieldCheck, User, Bell, Loader2, CheckCircle2, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ESPECIALIDADES = [
    'Psicología Clínica',
    'Psicología Educativa',
    'Psicología Organizacional',
    'Psiquiatría',
    'Neuropsicología',
    'Psicooncología',
    'Psicología Infantil',
    'Trabajo Social Clínico',
    'Otra',
];

const Settings = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        cedula_profesional: '',
        especialidad: '',
        institucion_formadora: '',
        telefono_profesional: '',
        porcentaje_consultorio: 30,
        stripe_fee_percent: 5.14,
    });

    // Cargar perfil del usuario desde Supabase
    useEffect(() => {
        if (!user) return;
        const loadProfile = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, cedula_profesional, especialidad, institucion_formadora, telefono_profesional, porcentaje_consultorio, stripe_fee_percent')
                    .eq('id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                setProfile({
                    full_name: data?.full_name || user.user_metadata?.full_name || '',
                    email: user.email || '',
                    cedula_profesional: data?.cedula_profesional || '',
                    especialidad: data?.especialidad || '',
                    institucion_formadora: data?.institucion_formadora || '',
                    telefono_profesional: data?.telefono_profesional || '',
                    porcentaje_consultorio: data?.porcentaje_consultorio ?? 30,
                    stripe_fee_percent: data?.stripe_fee_percent ?? 5.14,
                });
            } catch (err: any) {
                console.error('Error loading profile:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, [user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);
        setSaved(false);

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: profile.full_name,
                    cedula_profesional: profile.cedula_profesional || null,
                    especialidad: profile.especialidad || null,
                    institucion_formadora: profile.institucion_formadora || null,
                    telefono_profesional: profile.telefono_profesional || null,
                    porcentaje_consultorio: profile.porcentaje_consultorio,
                    stripe_fee_percent: profile.stripe_fee_percent,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });

            if (error) throw error;

            setSaved(true);
            toast.success('Perfil guardado correctamente');
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.error('Error saving profile:', err);
            toast.error('Error al guardar perfil: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6 max-w-2xl">
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

                {/* ── Sección Perfil Profesional ──────────────────────── */}
                <Card variant="flat" className="border border-border">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Perfil Profesional</CardTitle>
                                <CardDescription>
                                    Datos requeridos por{' '}
                                    <span className="text-primary font-medium">NOM-024-SSA3-2012</span>{' '}
                                    para el expediente clínico
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                {/* Nombre completo */}
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Nombre completo</Label>
                                    <Input
                                        id="full_name"
                                        value={profile.full_name}
                                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                        placeholder="Dr. Juan Pérez López"
                                        disabled={isSaving}
                                    />
                                </div>

                                {/* Email (solo lectura, viene de Auth) */}
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

                                {/* Separador NOM-024 */}
                                <div className="pt-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-4">
                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                        Credenciales profesionales (NOM-024 INT-04)
                                    </p>

                                    <div className="space-y-4">
                                        {/* Cédula profesional */}
                                        <div className="space-y-2">
                                            <Label htmlFor="cedula">
                                                Cédula Profesional
                                                <span className="ml-2 text-xs text-muted-foreground font-normal">— DGP / SEP</span>
                                            </Label>
                                            <Input
                                                id="cedula"
                                                value={profile.cedula_profesional}
                                                onChange={(e) => setProfile({ ...profile, cedula_profesional: e.target.value })}
                                                placeholder="Ej: 1234567"
                                                maxLength={20}
                                                disabled={isSaving}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Número de cédula registrado ante la SEP. Aparece en las notas clínicas firmadas.
                                            </p>
                                        </div>

                                        {/* Especialidad */}
                                        <div className="space-y-2">
                                            <Label htmlFor="especialidad">Especialidad</Label>
                                            <Select
                                                value={profile.especialidad}
                                                onValueChange={(v) => setProfile({ ...profile, especialidad: v })}
                                            >
                                                <SelectTrigger id="especialidad">
                                                    <SelectValue placeholder="Selecciona tu especialidad" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ESPECIALIDADES.map((esp) => (
                                                        <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Institución formadora */}
                                        <div className="space-y-2">
                                            <Label htmlFor="institucion">Institución formadora</Label>
                                            <Input
                                                id="institucion"
                                                value={profile.institucion_formadora}
                                                onChange={(e) => setProfile({ ...profile, institucion_formadora: e.target.value })}
                                                placeholder="Ej: UNAM, UAM, Universidad Iberoamericana..."
                                                disabled={isSaving}
                                            />
                                        </div>

                                        {/* Teléfono profesional */}
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
                                    </div>
                                </div>

                                {/* Botón guardar */}
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" variant="zen" disabled={isSaving} className="gap-2">
                                        {isSaving ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                        ) : saved ? (
                                            <><CheckCircle2 className="h-4 w-4" /> Guardado</>
                                        ) : 'Guardar perfil'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* ── Sección Honorarios ──────────────────────────────── */}
                <Card variant="flat" className="border border-border">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                                <DollarSign className="h-4 w-4 text-success" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Honorarios y Comisiones</CardTitle>
                                <CardDescription>
                                    Configura el reparto entre consultorio y tus honorarios netos
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Fee Stripe */}
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

                        {/* Split */}
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
                                    <div className="flex justify-between text-success font-bold text-base border-t pt-2"><span>🏠 Lo que te queda</span><span>${psicologo.toFixed(2)} MXN</span></div>
                                </>);
                            })()}
                        </div>

                        <div className="flex justify-end">
                            <Button type="button" variant="zen" disabled={isSaving} className="gap-2"
                                onClick={(e) => handleSaveProfile(e as any)}>
                                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : saved ? <><CheckCircle2 className="h-4 w-4" /> Guardado</> : 'Guardar'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Sección Notificaciones (placeholder) ───────────── */}
                <Card variant="flat" className="border border-border opacity-60">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                <Bell className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Notificaciones</CardTitle>
                                <CardDescription>Recordatorios de citas — Próximamente</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* ── Sección Seguridad — MFA ─────────────────────────── */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Seguridad
                        </h2>
                    </div>
                    <MFASetup />
                </div>
            </div>
        </Layout>
    );
};

export default Settings;

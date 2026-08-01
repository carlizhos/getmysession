import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Brain, 
    Lock, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    ArrowLeft, 
    ShieldCheck, 
    Sparkles, 
    Loader2, 
    KeyRound 
} from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);
    const [validSession, setValidSession] = useState(false);
    const [done, setDone] = useState(false);
    const navigate = useNavigate();

    // Requisitos de contraseña en tiempo real
    const requirements = [
        { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
        { label: 'Una letra mayúscula (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
        { label: 'Un número (0-9)', test: (p: string) => /[0-9]/.test(p) },
        { label: 'Un carácter especial (!@#$%^&*)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
    ];

    const passedCount = requirements.filter(r => r.test(password)).length;
    const isPasswordValid = passedCount === requirements.length;

    // Validación ultra-robusta de la sesión de recuperación
    useEffect(() => {
        let mounted = true;

        async function verifyRecoveryState() {
            try {
                // 1. Verificar si la URL trae tokens de recuperación o código PKCE
                const hash = window.location.hash || '';
                const search = window.location.search || '';
                const hasRecoveryParams = 
                    hash.includes('type=recovery') || 
                    hash.includes('access_token') || 
                    search.includes('code=') || 
                    search.includes('type=recovery');

                // 2. Verificar si ya existe una sesión activa (Supabase crea sesión al pulsar enlace)
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    if (session || hasRecoveryParams) {
                        setValidSession(true);
                    }
                    setValidating(false);
                }
            } catch (err) {
                console.error('Error al verificar sesión de recuperación:', err);
                if (mounted) setValidating(false);
            }
        }

        verifyRecoveryState();

        // 3. Escuchar evento de cambio de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (
                event === 'PASSWORD_RECOVERY' || 
                (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))
            ) {
                if (mounted) {
                    setValidSession(true);
                    setValidating(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirm) {
            toast.error('Por favor completa todos los campos.');
            return;
        }

        if (password !== confirm) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setDone(true);
            toast.success('✨ Contraseña actualizada con éxito');

            // Redirección automática tras 3s
            setTimeout(() => {
                navigate('/auth');
            }, 3000);
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Error al actualizar contraseña: ' + (error.message || 'Inténtalo de nuevo.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-background font-sans text-foreground">
            {/* Lado Izquierdo - Formulario principal */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
                {/* Fondo decorativo sutil */}
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Logo & Brand Header */}
                <div className="flex items-center gap-3">
                    <Link to="/auth" className="flex items-center gap-2.5 group">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg leading-tight tracking-tight">Saudade</span>
                            <span className="text-[11px] text-muted-foreground font-medium">Plataforma de Salud Mental</span>
                        </div>
                    </Link>
                </div>

                {/* Contenido Central */}
                <div className="w-full max-w-md mx-auto my-auto py-8">
                    {validating ? (
                        /* Estado de Carga / Verificación */
                        <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            <p className="text-sm font-medium text-muted-foreground animate-pulse">
                                Verificando enlace de seguridad...
                            </p>
                        </div>
                    ) : done ? (
                        /* Estado Éxito */
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center backdrop-blur-sm">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-bounce">
                                    <CheckCircle2 className="h-9 w-9" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight">¡Contraseña Actualizada!</h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Tu clave ha sido reestablecida de forma segura. Ya puedes acceder con tus nuevas credenciales.
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={() => navigate('/auth')}
                                className="w-full h-12 text-sm font-semibold rounded-2xl shadow-lg shadow-primary/20"
                                variant="zen"
                            >
                                Iniciar Sesión Ahora
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                Redirigiendo automáticamente en 3 segundos...
                            </p>
                        </div>
                    ) : !validSession ? (
                        /* Estado Enlace Expirado / Inválido */
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex flex-col items-center gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center backdrop-blur-sm">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="h-9 w-9" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold tracking-tight">Enlace no válido o expirado</h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Por motivos de seguridad, los enlaces de recuperación caducan. Puedes solicitar uno nuevo inmediatamente.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    onClick={() => navigate('/forgot-password')}
                                    className="w-full h-12 text-sm font-semibold rounded-2xl gap-2 shadow-lg shadow-primary/20"
                                    variant="zen"
                                >
                                    <KeyRound className="h-4 w-4" />
                                    Solicitar Nuevo Enlace
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/auth')}
                                    className="w-full h-11 text-xs font-medium rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver al Inicio de Sesión
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* Formulario Principal de Restablecimiento */
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-2 text-center sm:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span>Restablecimiento Seguro</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    Crea tu nueva contraseña
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Elige una contraseña fuerte e ingrésala dos veces para confirmar.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Nueva Contraseña */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 h-12 rounded-2xl border-border bg-card shadow-sm text-sm focus-visible:ring-2 focus-visible:ring-primary"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirmar Contraseña */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type={showConfirm ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            className={`pl-10 pr-10 h-12 rounded-2xl border-border bg-card shadow-sm text-sm focus-visible:ring-2 focus-visible:ring-primary ${
                                                confirm && password !== confirm ? 'border-destructive focus-visible:ring-destructive' : ''
                                            }`}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                            tabIndex={-1}
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    {/* Coincidencia visual */}
                                    {confirm && (
                                        <div className="flex items-center gap-1.5 pt-1 text-xs">
                                            {password === confirm ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Las contraseñas coinciden
                                                </span>
                                            ) : (
                                                <span className="text-destructive font-medium flex items-center gap-1">
                                                    <XCircle className="h-3.5 w-3.5" /> Las contraseñas no coinciden
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Indicador de Requisitos & Fortaleza */}
                                {password.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3">
                                        {/* Barra de progreso */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <span className="text-muted-foreground">Fortaleza de contraseña:</span>
                                                <span className={
                                                    passedCount <= 1 ? 'text-destructive' :
                                                    passedCount <= 3 ? 'text-amber-500' :
                                                    'text-emerald-600 dark:text-emerald-400'
                                                }>
                                                    {passedCount <= 1 ? 'Débil' : passedCount <= 3 ? 'Buena' : 'Excelente ✨'}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5 h-1.5">
                                                {[1, 2, 3, 4].map((step) => (
                                                    <div
                                                        key={step}
                                                        className={`flex-1 rounded-full transition-all duration-300 ${
                                                            passedCount >= step
                                                                ? passedCount <= 1 ? 'bg-destructive'
                                                                    : passedCount <= 3 ? 'bg-amber-500'
                                                                    : 'bg-emerald-500'
                                                                : 'bg-muted-foreground/20'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Lista de requisitos */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                            {requirements.map((req, idx) => {
                                                const met = req.test(password);
                                                return (
                                                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                                                        {met ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                                        ) : (
                                                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 flex-shrink-0" />
                                                        )}
                                                        <span className={met ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                                            {req.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Botón Enviar */}
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-sm font-semibold rounded-2xl shadow-lg shadow-primary/25 gap-2"
                                    variant="zen"
                                    disabled={loading || !isPasswordValid || password !== confirm}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Guardando contraseña...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            Guardar Nueva Contraseña
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Footer Link */}
                <div className="text-center pt-4">
                    <Link
                        to="/auth"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver a Inicio de Sesión
                    </Link>
                </div>
            </div>

            {/* Lado Derecho - Hero Banner Ilustrativo */}
            <div
                className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center text-white relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, hsl(162 50% 45%) 0%, hsl(175 55% 48%) 40%, hsl(190 60% 50%) 70%, hsl(205 65% 52%) 100%)'
                }}
            >
                {/* Elementos flotantes decorativos */}
                <div className="absolute top-12 left-12 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-12 right-12 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl" />

                <div className="max-w-md space-y-6 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xl mb-2">
                        <KeyRound className="h-12 w-12 text-white" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
                        Seguridad y Privacidad de Nivel Bancario
                    </h2>
                    <p className="text-base text-white/90 leading-relaxed font-normal">
                        En Saudade, tus datos de acceso están protegidos con cifrado de extremo a extremo (AES-256). Tu tranquilidad es nuestra prioridad.
                    </p>
                </div>
            </div>
        </div>
    );
}

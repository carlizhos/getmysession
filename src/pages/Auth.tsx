import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import MFAChallenge from '@/components/auth/MFAChallenge';
import { supabase } from '@/lib/supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '57982623920-afu95mjoklp5pmipaejstbeq67gqgr03.apps.googleusercontent.com';

// Official Google "G" SVG logo
const GoogleSVG = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: object) => void;
                    renderButton: (element: HTMLElement, options: object) => void;
                    prompt: () => void;
                    cancel: () => void;
                };
            };
        };
    }
}

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [mfaPending, setMfaPending] = useState(false);
    const [mfaFactorId, setMfaFactorId] = useState('');
    const [gsiReady, setGsiReady] = useState(false);
    const googleBtnRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { signIn, signUp, signInWithGoogleIdToken } = useAuth();

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { score: 0, label: '', color: 'bg-muted', checks: { length: false, number: false, upper: false, special: false } };
        
        const checks = {
            length: pwd.length >= 8,
            number: /[0-9]/.test(pwd),
            upper: /[A-Z]/.test(pwd),
            special: /[^A-Za-z0-9]/.test(pwd),
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        let label = '';
        let color = '';
        switch(score) {
            case 1:
                label = 'Muy débil';
                color = 'bg-red-500';
                break;
            case 2:
                label = 'Débil';
                color = 'bg-amber-500';
                break;
            case 3:
                label = 'Moderada';
                color = 'bg-sky-500';
                break;
            case 4:
                label = 'Fuerte';
                color = 'bg-emerald-500';
                break;
            default:
                label = '';
                color = 'bg-muted';
        }
        
        return { score, label, color, checks };
    };

    const passwordStrength = getPasswordStrength(password);

    useEffect(() => {
        // Reset loading state when returning to page (browser back button)
        setLoading(false);
        setGoogleLoading(false);

        // Save plan selection from landing page
        const params = new URLSearchParams(window.location.search);
        const plan = params.get('plan');
        if (plan === 'pro_monthly' || plan === 'pro_annual') {
            localStorage.setItem('saudade_selected_plan', plan);
        }
    }, []);

    // Handle the credential returned by Google GSI
    const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
        setGoogleLoading(true);
        try {
            const { error } = await signInWithGoogleIdToken(response.credential);
            if (error) throw error;
            toast.success('¡Bienvenido de vuelta!');
            navigate('/');
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Error al iniciar sesión: ' + error.message);
        } finally {
            setGoogleLoading(false);
        }
    }, [signInWithGoogleIdToken, navigate]);

    // Initialize Google Identity Services
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        const initGSI = () => {
            if (!window.google) return;
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential,
                use_fedcm_for_prompt: true,
                auto_select: false,
            });
            setGsiReady(true);
        };

        if (window.google) {
            initGSI();
            return;
        }

        // Script already in DOM (added via index.html)
        const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
        if (existingScript) {
            existingScript.addEventListener('load', initGSI);
            return () => existingScript.removeEventListener('load', initGSI);
        }
    }, [handleGoogleCredential]);

    // Render the official Google-branded button inside our container
    useEffect(() => {
        if (!gsiReady || !googleBtnRef.current || !window.google) return;
        window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: isLogin ? 'signin_with' : 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: googleBtnRef.current.offsetWidth || 400,
        });
    }, [gsiReady, isLogin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords match on signup
        if (!isLogin && password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) {
                    toast.error('Error al iniciar sesión: ' + error.message);
                    return;
                }
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const totpFactor = factors?.totp?.find(f => f.status === 'verified');
                if (totpFactor) {
                    setMfaFactorId(totpFactor.id);
                    setMfaPending(true);
                } else {
                    toast.success('¡Bienvenido de vuelta!');
                    navigate('/');
                }
            } else {
                const { error } = await signUp(email, password, fullName);
                if (error) {
                    toast.error('Error al crear cuenta: ' + error.message);
                } else {
                    toast.success('¡Cuenta creada! Revisa tu email para confirmar.');
                }
            }
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (mfaPending) {
        return (
            <MFAChallenge
                factorId={mfaFactorId}
                onSuccess={() => {
                    toast.success('¡Bienvenido de vuelta!');
                    navigate('/');
                }}
                onBack={() => setMfaPending(false)}
            />
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo and Title */}
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
                            <Brain className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">Saudade</h1>
                        <div className="relative h-6 mt-2 w-full flex justify-center overflow-hidden">
                            <p className={`absolute text-muted-foreground transition-all duration-300 ${isLogin ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                                Bienvenido de vuelta
                            </p>
                            <p className={`absolute text-muted-foreground transition-all duration-300 ${!isLogin ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                Crea tu cuenta profesional
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nombre completo */}
                        <div className={`grid transition-all duration-300 ease-in-out ${isLogin ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'}`}>
                            <div className="overflow-hidden">
                                <div className="space-y-2 pb-3">
                                    <label className="text-sm font-medium">Nombre completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Dr. Juan Pérez"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="pl-10"
                                            required={!isLogin}
                                            disabled={isLogin}
                                            autoComplete="name"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Correo electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder="tu@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10"
                                    required
                                    minLength={6}
                                    autoComplete={isLogin ? "current-password" : "new-password"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Indicador de Fuerza de Contraseña */}
                        <div className={`grid transition-all duration-300 ease-in-out ${isLogin || !password ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'}`}>
                            <div className="overflow-hidden">
                                <div className="space-y-1.5 pt-1.5 pb-2">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-muted-foreground">Fuerza de la contraseña</span>
                                        <span className={`font-semibold transition-colors duration-300 ${
                                            passwordStrength.score === 1 ? 'text-red-500' :
                                            passwordStrength.score === 2 ? 'text-amber-500' :
                                            passwordStrength.score === 3 ? 'text-sky-500' :
                                            passwordStrength.score === 4 ? 'text-emerald-500' : 'text-muted-foreground'
                                        }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ease-out ${passwordStrength.color}`} 
                                            style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${passwordStrength.checks.length ? 'bg-emerald-500' : 'bg-muted'}`} />
                                            <span>Mínimo 8 caracteres</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${passwordStrength.checks.upper ? 'bg-emerald-500' : 'bg-muted'}`} />
                                            <span>Una letra mayúscula</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${passwordStrength.checks.number ? 'bg-emerald-500' : 'bg-muted'}`} />
                                            <span>Al menos un número</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${passwordStrength.checks.special ? 'bg-emerald-500' : 'bg-muted'}`} />
                                            <span>Un carácter especial</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Confirmar contraseña */}
                        <div className={`grid transition-all duration-300 ease-in-out ${isLogin ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'}`}>
                            <div className="overflow-hidden">
                                <div className="space-y-2 pt-2 pb-2">
                                    <label className="text-sm font-medium">Confirmar contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`pl-10 pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            required={!isLogin}
                                            disabled={isLogin}
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                                            disabled={isLogin}
                                            tabIndex={isLogin ? -1 : 0}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-500 animate-in fade-in duration-200">Las contraseñas no coinciden</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Olvidaste tu contraseña */}
                        <div className={`grid transition-all duration-300 ease-in-out ${!isLogin ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'}`}>
                            <div className="overflow-hidden">
                                <div className="flex justify-end pt-1">
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-primary hover:underline"
                                        tabIndex={isLogin ? 0 : -1}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full gap-2 relative overflow-hidden transition-all duration-300"
                            variant="zen"
                            disabled={loading || googleLoading}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2 transition-all duration-300">
                                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                            )}
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    O continúa con
                                </span>
                            </div>
                        </div>

                        {/* Google Sign-In Button */}
                        {GOOGLE_CLIENT_ID && gsiReady ? (
                            /* Official Google-rendered button — shows "Saudade" app name */
                            <div className="flex justify-center w-full overflow-hidden rounded-md" ref={googleBtnRef} />
                        ) : (
                            /* Fallback: manual button (redirect flow) — only if GSI not configured */
                            <Button
                                type="button"
                                className="w-full gap-2"
                                variant="outline"
                                disabled={loading || googleLoading}
                                onClick={async () => {
                                    setGoogleLoading(true);
                                    try {
                                        const { error } = await supabase.auth.signInWithOAuth({
                                            provider: 'google',
                                            options: { redirectTo: `${window.location.origin}/` },
                                        });
                                        if (error) throw error;
                                    } catch (err: unknown) {
                                        const error = err as Error;
                                        toast.error('Error: ' + error.message);
                                        setGoogleLoading(false);
                                    }
                                }}
                            >
                                {googleLoading
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <GoogleSVG />
                                }
                                {googleLoading ? 'Conectando...' : 'Continuar con Google'}
                            </Button>
                        )}
                    </form>

                    {/* Legal Acceptance */}
                    <div className="text-center text-[11px] text-muted-foreground px-4 mt-2">
                        Al {isLogin ? 'iniciar sesión' : 'crear una cuenta'}, aceptas nuestros{' '}
                        <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Términos de uso</a>{' '}
                        y{' '}
                        <a href="/politicas" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Política de privacidad</a>.
                    </div>

                    {/* Toggle Login/Register */}
                    <div className="text-center text-sm mt-4">
                        <span className="text-muted-foreground">
                            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                            setIsLogin(!isLogin);
                            setConfirmPassword('');
                            setShowPassword(false);
                            setShowConfirmPassword(false);
                        }}
                            className="text-primary font-medium hover:underline"
                        >
                            {isLogin ? 'Regístrate' : 'Inicia sesión'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Side - Info */}
            <div className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center text-white" style={{ background: 'var(--gradient-auth)' }}>
                <div className="max-w-md space-y-8">
                    <h2 className="text-4xl font-bold leading-tight">
                        Gestiona tu práctica con tranquilidad
                    </h2>
                    <p className="text-lg opacity-90">
                        Saudade te ayuda a organizar pacientes, citas, notas clínicas y finanzas en un solo lugar. Con asistencia de IA para generar reportes profesionales.
                    </p>

                    <div className="grid grid-cols-3 gap-6 pt-8">
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-1">NOM-024</div>
                            <div className="text-sm opacity-75">Cumplimiento</div>
                        </div>
                        <div className="text-center border-l border-r border-white/30 px-6">
                            <div className="text-2xl font-bold mb-1">256bit</div>
                            <div className="text-sm opacity-75">Encriptación</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-1">IA</div>
                            <div className="text-sm opacity-75">Integrada</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;

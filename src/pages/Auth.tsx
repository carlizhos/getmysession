import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import MFAChallenge from '@/components/auth/MFAChallenge';
import { supabase } from '@/lib/supabase';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [mfaPending, setMfaPending] = useState(false);
    const [mfaFactorId, setMfaFactorId] = useState('');
    const navigate = useNavigate();
    const { signIn, signUp, signInWithGoogle } = useAuth();

    useEffect(() => {
        // Asegurar que el estado de carga se reinicie si el usuario vuelve a la página
        setLoading(false);
    }, []);


    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (error: any) {
            toast.error('Error al iniciar con Google: ' + error.message);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await signIn(email, password);
                if (error) {
                    toast.error('Error al iniciar sesión: ' + error.message);
                    return;
                }
                // Verificar si el usuario tiene MFA activo
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const totpFactor = factors?.totp?.find(f => f.status === 'verified');
                if (totpFactor) {
                    // Tiene 2FA — mostrar pantalla de verificación
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
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Si hay MFA pendiente → mostrar pantalla de verificación
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
                        <p className="text-muted-foreground mt-2">
                            {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta profesional'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Dr. Juan Pérez"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        )}

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
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {/* Olvidé mi contraseña — solo en login */}
                        {isLogin && (
                            <div className="flex justify-end -mt-1">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-primary hover:underline"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full gap-2"
                            variant="zen"
                            disabled={loading}
                        >
                            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                            <ArrowRight className="h-4 w-4" />
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

                        <Button
                            type="button"
                            className="w-full gap-2"
                            variant="outline"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg className="h-4 w-4 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Google
                        </Button>
                    </form>

                    {/* Toggle Login/Register */}
                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">
                            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
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

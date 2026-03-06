import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [validSession, setValidSession] = useState(false);
    const navigate = useNavigate();

    // Supabase redirige al usuario con tokens en el hash de la URL.
    // onAuthStateChange detecta el evento PASSWORD_RECOVERY.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setValidSession(true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            toast.error('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setDone(true);
            setTimeout(() => navigate('/auth'), 3000);
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
                            <Brain className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">Nueva Contraseña</h1>
                        <p className="text-muted-foreground mt-2">
                            {done ? 'Contraseña actualizada' : 'Ingresa tu nueva contraseña'}
                        </p>
                    </div>

                    {done ? (
                        <div className="flex flex-col items-center gap-4 rounded-2xl border border-success/20 bg-success/5 p-8 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                                <CheckCircle className="h-8 w-8 text-success" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">¡Contraseña actualizada!</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Redirigiendo al inicio de sesión...
                                </p>
                            </div>
                        </div>
                    ) : !validSession ? (
                        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-6 text-center space-y-3">
                            <p className="font-medium">Link no válido o expirado</p>
                            <p className="text-sm text-muted-foreground">
                                Este link de recuperación ya expiró. Solicita uno nuevo.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/forgot-password')}
                                className="mt-2"
                            >
                                Solicitar nuevo link
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Nueva contraseña */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nueva contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirmar contraseña */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Confirmar contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        className={`pl-10 ${confirm && password !== confirm ? 'border-destructive' : ''}`}
                                        required
                                    />
                                </div>
                                {confirm && password !== confirm && (
                                    <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                                )}
                            </div>

                            {/* Indicador de fortaleza */}
                            {password && (
                                <div className="space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-colors ${password.length >= i * 3
                                                        ? i <= 1 ? 'bg-destructive'
                                                            : i <= 2 ? 'bg-warning'
                                                                : i <= 3 ? 'bg-primary'
                                                                    : 'bg-success'
                                                        : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {password.length < 4 ? 'Muy débil' :
                                            password.length < 7 ? 'Débil' :
                                                password.length < 10 ? 'Buena' : 'Muy fuerte'}
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                variant="zen"
                                disabled={loading || password !== confirm}
                            >
                                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* Right Side */}
            <div
                className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center text-white"
                style={{ background: 'linear-gradient(to bottom right, hsl(162 50% 52%) 0%, hsl(175 55% 55%) 30%, hsl(190 60% 58%) 70%, hsl(205 65% 60%) 100%)' }}
            >
                <div className="max-w-md space-y-6 text-center">
                    <h2 className="text-4xl font-bold leading-tight">Acceso seguro garantizado</h2>
                    <p className="text-lg opacity-90">
                        Tu nueva contraseña se almacena cifrada. Nadie, ni siquiera nosotros,
                        puede verla.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

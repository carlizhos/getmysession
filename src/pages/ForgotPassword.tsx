import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Brain } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [cooldownTimer, setCooldownTimer] = useState<number>(0);

    useEffect(() => {
        if (cooldownTimer <= 0) return;
        const interval = setInterval(() => {
            setCooldownTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownTimer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Por favor ingresa tu correo electrónico');
            return;
        }
        if (cooldownTimer > 0) {
            toast.warning(`Por favor espera ${cooldownTimer} segundos antes de solicitar otro correo.`);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setSent(true);
            setCooldownTimer(60);
            toast.success('Enlace enviado exitosamente.');
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
            
            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 h-14 border-b border-border/40 bg-background flex items-center px-6">
                <Link to="/auth" className="flex h-8 w-8 items-center justify-center rounded-md bg-white shadow-sm overflow-hidden border border-border/50 hover:bg-muted/50 transition-colors">
                    <Brain className="h-5 w-5 text-primary" />
                </Link>
            </div>

            <div className="w-full max-w-[380px] space-y-6 mt-8">
                
                {/* Title */}
                <div className="text-center mb-8">
                    <div className="text-[22px] text-muted-foreground mb-4">
                        getmy<span className="font-bold text-foreground">SESSION</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">¿Olvidaste tu contraseña?</h1>
                </div>

                {sent ? (
                    /* Success State */
                    <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4 rounded-xl border border-success/20 bg-success/5 p-8 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                                <CheckCircle className="h-8 w-8 text-success" />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">¡Email enviado!</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Hemos enviado un enlace de recuperación a <span className="font-medium text-foreground">{email}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="text-center space-y-4 pt-2">
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={cooldownTimer > 0 || loading}
                                className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-semibold transition-all shadow-sm"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : cooldownTimer > 0 ? (
                                    `Reenviar correo en ${cooldownTimer}s`
                                ) : (
                                    'Reenviar correo'
                                )}
                            </Button>
                            
                            <div className="flex flex-col space-y-2 text-[13px] text-muted-foreground">
                                <div>
                                    ¿Ya tienes una cuenta?{' '}
                                    <Link to="/auth" className="text-foreground hover:underline font-semibold">
                                        Iniciar sesión
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Form State */
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-foreground">Ingresa tu correo</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-10 w-full rounded-md border-border bg-transparent px-3 py-2 text-sm"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-semibold transition-all shadow-sm"
                            disabled={loading || cooldownTimer > 0}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Enviar'
                            )}
                        </Button>

                        <div className="text-center space-y-2 pt-4 flex flex-col text-[13px] text-muted-foreground">
                            <div>
                                ¿Ya tienes una cuenta?{' '}
                                <Link to="/auth" className="text-foreground hover:underline font-semibold">
                                    Iniciar sesión
                                </Link>
                            </div>
                            <div>
                                ¿Tienes problemas?{' '}
                                <a href="mailto:soporte@getmysession.com" className="text-foreground hover:underline font-semibold">
                                    Obtén ayuda
                                </a>
                            </div>
                        </div>
                    </form>
                )}
            </div>
            
            {/* Footer */}
            <div className="absolute bottom-8 flex gap-6 text-[12px] font-medium text-muted-foreground/60">
                <a href="/terminos" className="hover:text-foreground transition-colors">Términos de uso</a>
                <a href="/politicas" className="hover:text-foreground transition-colors">Política de privacidad</a>
            </div>
        </div>
    );
};

export default ForgotPassword;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setSent(true);
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
                            <Brain className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">Recuperar Contraseña</h1>
                        <p className="text-muted-foreground mt-2">
                            {sent
                                ? 'Revisa tu correo electrónico'
                                : 'Te enviaremos un link para restablecer tu contraseña'}
                        </p>
                    </div>

                    {sent ? (
                        /* Success State */
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-4 rounded-2xl border border-success/20 bg-success/5 p-8 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                                    <CheckCircle className="h-8 w-8 text-success" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">¡Email enviado!</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Hemos enviado un link a <span className="font-medium text-foreground">{email}</span>.
                                        Puede tardar unos minutos.
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-center text-muted-foreground">
                                ¿No llegó el correo?{' '}
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-primary font-medium hover:underline"
                                >
                                    Intentar de nuevo
                                </button>
                            </p>
                        </div>
                    ) : (
                        /* Form State */
                        <form onSubmit={handleSubmit} className="space-y-4">
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

                            <Button
                                type="submit"
                                className="w-full"
                                variant="zen"
                                disabled={loading}
                            >
                                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                            </Button>
                        </form>
                    )}

                    {/* Back to login */}
                    <div className="text-center">
                        <Link
                            to="/auth"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div
                className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center text-white"
                style={{ background: 'linear-gradient(to bottom right, hsl(162 50% 52%) 0%, hsl(175 55% 55%) 30%, hsl(190 60% 58%) 70%, hsl(205 65% 60%) 100%)' }}
            >
                <div className="max-w-md space-y-6 text-center">
                    <h2 className="text-4xl font-bold leading-tight">¿Olvidaste tu contraseña?</h2>
                    <p className="text-lg opacity-90">
                        No hay problema. Te enviamos un link seguro a tu correo para que puedas
                        restablecer tu contraseña en segundos.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

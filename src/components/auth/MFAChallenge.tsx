import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface MFAChallengeProps {
    factorId: string;
    onSuccess: () => void;
    onBack: () => void;
}

const MFAChallenge = ({ factorId, onSuccess, onBack }: MFAChallengeProps) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 6) return;
        setLoading(true);
        try {
            // Crear challenge
            const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeErr) throw challengeErr;

            // Verificar código
            const { error: verifyErr } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.id,
                code,
            });
            if (verifyErr) throw verifyErr;

            onSuccess();
        } catch {
            toast.error('Código incorrecto. Inténtalo de nuevo.');
            setCode('');
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
                        <h1 className="text-2xl font-bold">Verificación en dos pasos</h1>
                        <p className="text-muted-foreground mt-2">
                            Ingresa el código de 6 dígitos de tu app autenticadora
                        </p>
                    </div>

                    {/* Icono de escudo */}
                    <div className="flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-center block">
                                Código de Google Authenticator / Authy
                            </label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000 000"
                                value={code}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, '');
                                    setCode(v);
                                    // Auto-submit cuando el código tenga 6 dígitos
                                    if (v.length === 6) {
                                        setTimeout(() => {
                                            document.getElementById('verify-btn')?.click();
                                        }, 100);
                                    }
                                }}
                                className="text-center text-3xl tracking-[0.5em] font-mono h-16"
                                autoFocus
                            />
                            <p className="text-xs text-center text-muted-foreground">
                                El código cambia cada 30 segundos
                            </p>
                        </div>

                        <Button
                            id="verify-btn"
                            type="submit"
                            className="w-full"
                            variant="zen"
                            disabled={loading || code.length !== 6}
                        >
                            {loading ? 'Verificando...' : 'Verificar código'}
                        </Button>
                    </form>

                    {/* Volver */}
                    <div className="text-center">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver al inicio de sesión
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div
                className="hidden lg:flex lg:w-1/2 p-12 items-center justify-center text-white"
                style={{ background: 'linear-gradient(to bottom right, hsl(162 50% 52%) 0%, hsl(175 55% 55%) 30%, hsl(190 60% 58%) 70%, hsl(205 65% 60%) 100%)' }}
            >
                <div className="max-w-md space-y-6 text-center">
                    <h2 className="text-4xl font-bold leading-tight">Capa extra de seguridad</h2>
                    <p className="text-lg opacity-90">
                        Abra su app <strong>Google Authenticator</strong> o <strong>Authy</strong>
                        y encuentre el código de 6 dígitos para Saudade.
                    </p>
                    <div className="rounded-2xl bg-white/10 p-6 text-left space-y-3">
                        <p className="font-semibold">Apps recomendadas:</p>
                        <div className="space-y-2 text-sm opacity-90">
                            <p>📱 Google Authenticator (iOS / Android)</p>
                            <p>🔐 Authy (iOS / Android / Desktop)</p>
                            <p>🔑 Microsoft Authenticator</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MFAChallenge;

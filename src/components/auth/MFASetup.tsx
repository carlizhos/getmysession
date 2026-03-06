import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Smartphone, CheckCircle, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type View = 'status' | 'enrolling' | 'confirming-disable';

const MFASetup = () => {
    const [view, setView] = useState<View>('status');
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [factorId, setFactorId] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    // Verificar si MFA ya está activo
    useEffect(() => {
        const checkMFA = async () => {
            setChecking(true);
            const { data } = await supabase.auth.mfa.listFactors();
            const verified = data?.totp?.find(f => f.status === 'verified');
            if (verified) {
                setMfaEnabled(true);
                setFactorId(verified.id);
            }
            setChecking(false);
        };
        checkMFA();
    }, []);

    // PASO 1: Iniciar enrollment
    const handleEnroll = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'MindCare Authenticator',
            });
            if (error) throw error;
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setFactorId(data.id);
            setView('enrolling');
        } catch (err: any) {
            toast.error('Error al iniciar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // PASO 2: Verificar código y activar
    const handleVerify = async () => {
        if (code.length !== 6) { toast.error('El código debe tener 6 dígitos'); return; }
        setLoading(true);
        try {
            const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
            if (chErr) throw chErr;
            const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
            if (vErr) throw vErr;
            setMfaEnabled(true);
            setView('status');
            setCode('');
            toast.success('¡Autenticación de dos factores activada!');
        } catch {
            toast.error('Código incorrecto. Verifica tu app autenticadora.');
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    // Desactivar MFA
    const handleUnenroll = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            setMfaEnabled(false);
            setFactorId('');
            setView('status');
            toast.success('Autenticación de dos factores desactivada');
        } catch (err: any) {
            toast.error('Error al desactivar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <Card variant="flat" className="border border-border animate-pulse">
                <CardContent className="py-8 flex justify-center">
                    <span className="text-sm text-muted-foreground">Verificando estado de seguridad...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="flat" className="border border-border">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mfaEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                            {mfaEnabled
                                ? <ShieldCheck className="h-5 w-5 text-green-600" />
                                : <Shield className="h-5 w-5 text-muted-foreground" />
                            }
                        </div>
                        <div>
                            <CardTitle className="text-base">Autenticación de dos factores (2FA)</CardTitle>
                            <CardDescription>Protege tu cuenta con Google Authenticator o Authy</CardDescription>
                        </div>
                    </div>
                    <Badge className={mfaEnabled ? 'bg-green-600 text-white' : ''} variant={mfaEnabled ? 'default' : 'secondary'}>
                        {mfaEnabled ? 'Activo' : 'Inactivo'}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-5">

                {/* ── Vista: Status (inactivo) ────────────────────────── */}
                {view === 'status' && !mfaEnabled && (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-muted/40 p-4 space-y-2">
                            <p className="text-sm font-medium">¿Por qué activar 2FA?</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> Protege el expediente de tus pacientes</li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> Requerido por NOM-024-SSA3-2012</li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" /> Bloquea acceso aunque roben tu contraseña</li>
                            </ul>
                        </div>
                        <Button variant="zen" onClick={handleEnroll} disabled={loading} className="gap-2">
                            <Smartphone className="h-4 w-4" />
                            {loading ? 'Iniciando...' : 'Configurar con app autenticadora'}
                        </Button>
                    </div>
                )}

                {/* ── Vista: Status (activo) ──────────────────────────── */}
                {view === 'status' && mfaEnabled && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10 p-4">
                            <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                            <div>
                                <p className="text-sm font-medium">Tu cuenta está protegida con 2FA</p>
                                <p className="text-xs text-muted-foreground">Se pedirá un código en cada inicio de sesión</p>
                            </div>
                        </div>
                        <div className="pt-1 border-t border-border">
                            <Button
                                variant="outline"
                                className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                                onClick={() => setView('confirming-disable')}
                            >
                                <ShieldOff className="h-4 w-4" />
                                Desactivar 2FA
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Vista: Enrollment (QR + código) ────────────────── */}
                {view === 'enrolling' && (
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Paso 1 — Escanea el código QR</p>
                            <p className="text-sm text-muted-foreground">Abre <strong>Google Authenticator</strong> o <strong>Authy</strong> y escanea:</p>
                            <div className="flex justify-center p-4 bg-white rounded-xl border">
                                {qrCode && <img src={qrCode} alt="QR Code MFA" className="w-44 h-44" />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">¿No puedes escanear? Ingresa esta clave manualmente:</p>
                            <div className="flex items-center gap-2">
                                <code className={`flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono break-all ${showSecret ? '' : 'blur-sm select-none'}`}>
                                    {secret}
                                </code>
                                <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)}>
                                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(secret); toast.success('Clave copiada'); }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium">Paso 2 — Ingresa el código de 6 dígitos:</p>
                            <Input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-2xl tracking-widest font-mono"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setView('status'); setCode(''); }} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button variant="zen" onClick={handleVerify} disabled={loading || code.length !== 6} className="flex-1">
                                    {loading ? 'Verificando...' : 'Activar 2FA'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Vista: Confirmar desactivación ──────────────────── */}
                {view === 'confirming-disable' && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/10 p-4">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">¿Seguro que quieres desactivar 2FA?</p>
                                <p className="text-xs text-muted-foreground">Reduces la protección de los expedientes clínicos. Solo recomendable si cambias de dispositivo.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setView('status')} className="flex-1" disabled={loading}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleUnenroll} disabled={loading} className="flex-1">
                                {loading ? 'Desactivando...' : 'Sí, desactivar'}
                            </Button>
                        </div>
                    </div>
                )}

            </CardContent>
        </Card>
    );
};

export default MFASetup;

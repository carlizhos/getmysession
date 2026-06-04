import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Loader2, Sparkles, Building2, User, Clock, PartyPopper, Lock } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';

const SubscriptionTab = () => {
    const { organization, refresh: refreshOrg } = useOrganization();
    const { isTrialing, isActive, isPastDue, isCanceled, daysRemaining, hasAccess, cancelAtPeriodEnd } = useSubscription();
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const syncedRef = useRef(false);

    // Auto-sync subscription data from Stripe on mount
    useEffect(() => {
        if (!organization?.stripe_customer_id || syncedRef.current) return;
        syncedRef.current = true;

        const syncFromStripe = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('sync-subscription', {
                    body: { organization_id: organization.id },
                });
                if (!error && data?.synced) {
                    console.log('✅ Subscription synced from Stripe:', data);
                    await refreshOrg();
                }
            } catch (err) {
                console.error('Error syncing subscription:', err);
            }
        };
        syncFromStripe();
    }, [organization?.id, organization?.stripe_customer_id, refreshOrg]);

    // Handle Stripe redirect callbacks
    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            toast.success('¡Bienvenido a Saudade Pro! 🎉 Tu prueba de 30 días ha comenzado.', { duration: 6000 });
            searchParams.delete('success');
            setSearchParams(searchParams, { replace: true });
        }
        if (searchParams.get('canceled') === 'true') {
            toast.info('No se realizó ningún cargo. Puedes suscribirte cuando quieras.', { duration: 4000 });
            searchParams.delete('canceled');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleManageBilling = async (planId?: string) => {
        if (!organization) {
            toast.error('No se pudo encontrar la información de tu organización.');
            return;
        }
        setIsProcessing(true);

        try {
            const { data, error } = await supabase.functions.invoke('create-billing-session', {
                body: {
                    organization_id: organization.id,
                    plan_id: planId,
                    return_url: window.location.href.split('?')[0]
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            toast.error('Error: ' + (err.message || 'Error al conectar con el sistema de pagos'));
        } finally {
            setIsProcessing(false);
        }
    };

    const currentPlan = organization?.plan_id || 'free';
    const subStatus = organization?.subscription_status || 'trialing';

    const getStatusLabel = () => {
        if (subStatus === 'active' && cancelAtPeriodEnd) return 'Cancelación Programada';
        if (subStatus === 'active') return 'Activa';
        if (subStatus === 'trialing') return 'Periodo de Prueba';
        if (subStatus === 'past_due') return 'Pago Pendiente';
        if (subStatus === 'canceled' || subStatus === 'unpaid') return 'Inactiva';
        return 'Inactiva';
    };

    const getStatusVariant = () => {
        if (subStatus === 'active' && !cancelAtPeriodEnd) return 'success';
        if (subStatus === 'trialing') return 'secondary';
        if (subStatus === 'past_due') return 'warning';
        return 'destructive';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Estado actual */}
            <Card variant="flat" className="border border-border overflow-hidden">
                <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b border-primary/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu Suscripción</p>
                            <h3 className="text-lg font-bold capitalize">Plan {currentPlan === 'free' ? 'Gratuito' : currentPlan}</h3>
                        </div>
                    </div>
                    <Badge variant={getStatusVariant() as any} className="px-3 py-1">
                        {getStatusLabel()}
                    </Badge>
                </div>
                <CardContent className="pt-6">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {isTrialing ? 'Fin de la prueba' : 'Próximo cobro'}
                            </span>
                            <p className="text-sm font-semibold flex items-center gap-2">
                                {isTrialing && <Clock className="h-4 w-4 text-primary" />}
                                {organization?.current_period_end 
                                    ? new Date(organization.current_period_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric'})
                                    : 'Sin fecha'}
                                {isTrialing && daysRemaining > 0 && (
                                    <Badge variant="secondary" className="text-[10px]">{daysRemaining} días</Badge>
                                )}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Método de pago</span>
                            <p className="text-sm flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                {organization?.stripe_customer_id ? 'Registrado en Stripe' : 'No registrado'}
                            </p>
                        </div>
                        <div className="flex items-center lg:justify-end">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleManageBilling()}
                                disabled={isProcessing || !organization?.stripe_customer_id}
                                className="gap-2"
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                                {organization?.stripe_customer_id ? 'Gestionar facturación' : 'Sin facturación activa'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Selector de Planes */}
            <div className="grid gap-6 lg:grid-cols-2">
                
                {/* ── PLAN PRO ── */}
                <Card className="relative flex flex-col border-2 border-primary shadow-lg shadow-primary/5 transition-all duration-200">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border-4 border-background">
                        Recomendado
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Plan Pro
                            {currentPlan === 'pro' && <Badge variant="secondary" className="ml-auto text-[10px]">Actual</Badge>}
                        </CardTitle>
                        <CardDescription className="min-h-[40px]">Todo lo que necesitas para tu práctica independiente.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black">$749</span>
                            <span className="text-muted-foreground text-sm">MXN/mes</span>
                        </div>
                        
                        <ul className="space-y-3">
                            {[
                                '30 días de prueba sin costo',
                                'Pacientes e historiales ilimitados',
                                'Asistente de IA para notas clínicas',
                                'Consultorio Virtual (videollamadas)',
                                'Escriba Ambiental de IA',
                                'Notas SOAP estructuradas',
                                'Exportar expedientes a PDF',
                                'Calculadora de comisiones',
                            ].map(feat => (
                                <li key={feat} className="flex items-start gap-3 text-sm">
                                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Check className="h-3 w-3" />
                                    </div>
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <Button 
                            className="w-full mt-auto gap-2" 
                            variant={currentPlan === 'pro' ? 'ghost' : 'zen'}
                            disabled={currentPlan === 'pro' || isProcessing}
                            onClick={() => handleManageBilling('pro')}
                        >
                            {isProcessing ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                            ) : currentPlan === 'pro' ? (
                                'Plan Actual'
                            ) : (
                                <><Sparkles className="h-4 w-4" /> Empezar 30 días gratis</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* ── PLAN CLÍNICA (PRÓXIMAMENTE) ── */}
                <Card className="relative flex flex-col border-2 border-border opacity-60 cursor-not-allowed transition-all duration-200">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border-4 border-background">
                        Próximamente
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            Plan Clínica
                        </CardTitle>
                        <CardDescription className="min-h-[40px]">Ideal para centros con múltiples profesionales.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-muted-foreground">$1,500</span>
                            <span className="text-muted-foreground text-sm">MXN/mes</span>
                        </div>
                        
                        <ul className="space-y-3">
                            {[
                                'Todo lo de Plan Pro',
                                'Hasta 5 profesionales/miembros',
                                'Agenda compartida y equipos',
                                'Reportes administrativos',
                                'Soporte prioritario',
                            ].map(feat => (
                                <li key={feat} className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <Check className="h-3 w-3" />
                                    </div>
                                    {feat}
                                </li>
                            ))}
                        </ul>

                        <Button 
                            className="w-full mt-auto" 
                            variant="outline"
                            disabled
                        >
                            Disponible pronto
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Nota sobre seguridad */}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground border border-border">
                    <User className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-semibold">Seguridad y Privacidad</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Saudade no almacena tus datos bancarios. Todos los pagos son procesados de forma segura a través de <strong>Stripe</strong>, cumpliendo con los estándares PCI-DSS. Puedes cancelar o cambiar tu plan en cualquier momento desde el portal de facturación.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTab;

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Loader2, Sparkles, Building2, User } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const PLANS = [
    {
        id: 'pro',
        name: 'Plan Pro',
        price: '799',
        description: 'Todo lo que necesitas para tu práctica independiente.',
        features: [
            '30 días de prueba sin costo',
            'Pacientes e historiales ilimitados',
            'Facturación electrónica (SAT)',
            'Notas NOM-024 estructuradas',
            'Calculadora de comisiones'
        ],
        highlight: true,
        buttonText: 'Empezar 30 días gratis',
        priceId: 'pro'
    },
    {
        id: 'clinic',
        name: 'Plan Clínica',
        price: '1,500',
        description: 'Ideal para centros con múltiples profesionales.',
        features: [
            '30 días de prueba sin costo',
            'Todo lo de Pro',
            'Hasta 5 profesionales/miembros',
            'Agenda compartida y equipos',
            'Reportes administrativos'
        ],
        buttonText: 'Empezar 30 días gratis',
        priceId: 'clinic'
    }
];

const SubscriptionTab = () => {
    const { organization } = useOrganization();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleManageBilling = async (planId?: string) => {
        console.log('[SubscriptionTab] handleManageBilling called with planId:', planId);
        if (!organization) {
            console.error('[SubscriptionTab] No organization found in context');
            toast.error('No se pudo encontrar la información de tu organización.');
            return;
        }
        setIsProcessing(true);

        try {
            console.log('[SubscriptionTab] Invoking create-billing-session with:', {
                organization_id: organization.id,
                plan_id: planId
            });

            const { data, error } = await supabase.functions.invoke('create-billing-session', {
                body: {
                    organization_id: organization.id,
                    plan_id: planId,
                    return_url: window.location.href
                }
            });

            if (error) {
                console.error('[SubscriptionTab] Edge Function error:', error);
                throw error;
            }

            console.log('[SubscriptionTab] Edge Function success:', data);
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error('[SubscriptionTab] Catch block error:', err);
            toast.error('Error: ' + (err.message || 'Error al conectar con el sistema de pagos'));
        } finally {
            setIsProcessing(false);
        }
    };

    const currentPlan = organization?.plan_id || 'free';
    const subStatus = organization?.subscription_status || 'trialing';

    return (
        <div className="space-y-6">
            {/* Estado actual */}
            <Card variant="flat" className="border border-border overflow-hidden">
                <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b border-primary/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu Suscripción</p>
                            <h3 className="text-lg font-bold capitalize">Plan {currentPlan}</h3>
                        </div>
                    </div>
                    <Badge variant={subStatus === 'active' ? 'success' : 'warning'} className="px-3 py-1">
                        {subStatus === 'active' ? 'Activa' : subStatus === 'trialing' ? 'Periodo de Prueba' : 'Inactiva'}
                    </Badge>
                </div>
                <CardContent className="pt-6">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Próximo cobro</span>
                            <p className="text-sm font-semibold">
                                {organization?.current_period_end 
                                    ? new Date(organization.current_period_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric'})
                                    : 'Sin fecha'}
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
            <div className="grid gap-6 lg:grid-cols-3">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.id;
                    return (
                        <Card 
                            key={plan.id} 
                            className={cn(
                                "relative flex flex-col border-2 transition-all duration-200",
                                plan.highlight ? "border-primary shadow-lg scale-[1.02]" : "border-border hover:border-primary/30",
                                isCurrent && "bg-muted/30"
                            )}
                        >
                            {plan.highlight && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border-4 border-background">
                                    Recomendado
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {plan.name}
                                    {isCurrent && <Badge variant="secondary" className="ml-auto text-[10px]">Actual</Badge>}
                                </CardTitle>
                                <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground text-sm">MXN/mes</span>
                                </div>
                                
                                <ul className="space-y-3">
                                    {plan.features.map(feat => (
                                        <li key={feat} className="flex items-start gap-3 text-sm">
                                            <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <Check className="h-3 w-3" />
                                            </div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>

                                <Button 
                                    className="w-full mt-auto" 
                                    variant={isCurrent ? "ghost" : plan.highlight ? "zen" : "outline"}
                                    disabled={isCurrent || isProcessing}
                                    onClick={() => handleManageBilling(plan.priceId || undefined)}
                                >
                                    {isCurrent ? 'Plan Actual' : plan.buttonText}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Nota sobre seguridad */}
            <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground border border-border">
                    <User className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-semibold">Seguridad y Privacidad</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Saudade no almacena tus datos bancarios. Todos los pagos son procesados de forma segura a través de **Stripe**, cumpliendo con los estándares PCI-DSS. Puedes cancelar o cambiar tu plan en cualquier momento desde el portal de facturación.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTab;

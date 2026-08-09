import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2, Circle, Settings2, FileSignature, Rocket, X, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DISMISSED_KEY = 'getmysession_onboarding_v2_dismissed';

interface StepStatus {
    profileComplete: boolean;
    signatureComplete: boolean;
    scheduleComplete: boolean;
    templatesComplete: boolean;
}

const OnboardingModal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState<StepStatus | null>(null);
    const [dismissed, setDismissed] = useState(
        () => localStorage.getItem(DISMISSED_KEY) === 'true'
    );

    const [isRuntimeDismissed, setIsRuntimeDismissed] = useState(false);

    const fetchStatus = useCallback(async () => {
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, cedulas, horario_atencion, signature_data, consent_templates')
            .eq('id', user.id)
            .single();

        // Profile is "complete" when the user has a name and at least one cédula
        const cedulas = Array.isArray(profile?.cedulas) ? profile.cedulas : [];
        const profileComplete =
            !!profile?.full_name?.trim() && cedulas.length > 0 && !!cedulas[0]?.numero?.trim();

        // Signature is "complete" if signature_data (base64) exists
        const signatureComplete = !!profile?.signature_data;

        // Schedule is "complete" if horario_atencion object exists
        const scheduleComplete = !!profile?.horario_atencion;

        // Templates are "complete" if consent_templates object exists and has content
        const templatesComplete = !!profile?.consent_templates && Object.keys(profile.consent_templates).length > 0;

        setStatus({
            profileComplete,
            signatureComplete,
            scheduleComplete,
            templatesComplete,
        });
    }, [user]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    if (!status) return null;

    const allDone = status.profileComplete && status.signatureComplete && status.scheduleComplete && status.templatesComplete;

    if (allDone || dismissed || isRuntimeDismissed) return null;

    const completedCount = [
        status.profileComplete,
        status.signatureComplete,
        status.scheduleComplete,
        status.templatesComplete
    ].filter(Boolean).length;
    
    const progressPct = Math.round((completedCount / 4) * 100);

    const steps = [
        {
            id: 'profile',
            label: 'Perfil Profesional y Cédulas',
            description: 'Nombre y cédulas requeridos por la NOM-024.',
            icon: Settings2,
            cta: 'Configurar',
            href: '/settings',
            done: status.profileComplete,
        },
        {
            id: 'signature',
            label: 'Tu Firma Digital',
            description: 'Necesaria para validar tus notas clínicas y consentimientos.',
            icon: FileSignature,
            cta: 'Dibujar Firma',
            href: '/settings', // In settings, same tab usually
            done: status.signatureComplete,
        },
        {
            id: 'schedule',
            label: 'Horarios de Atención',
            description: 'Define tus días y horas laborales para la agenda.',
            icon: Settings2,
            cta: 'Definir',
            href: '/settings',
            done: status.scheduleComplete,
        },
        {
            id: 'templates',
            label: 'Plantillas de Consentimiento',
            description: 'Personaliza los textos legales de tus documentos.',
            icon: FileSignature,
            cta: 'Editar',
            href: '/consents',
            done: status.templatesComplete,
        },
    ];

    // The first uncompleted step is the active one
    const activeStep = steps.find(s => !s.done);

    const handleDismiss = () => {
        setIsRuntimeDismissed(true);
        localStorage.setItem(DISMISSED_KEY, 'true');
        setDismissed(true);
    };

    return createPortal(
        /* Backdrop con scroll vertical nativo alineado arriba */
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-md p-4 sm:p-6 flex justify-center items-start animate-fade-in">
            {/* Modal card que se desplaza con el scroll */}
            <div className="w-full max-w-md my-6 sm:my-12 rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/5 px-6 pt-6 pb-5 border-b border-border">
                    <button
                        onClick={() => setIsRuntimeDismissed(true)}
                        className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Omitir por ahora"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                            <Rocket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-base">Configura tu consultorio</h2>
                            <p className="text-xs text-muted-foreground">
                                {completedCount} de 4 pasos completos
                            </p>
                        </div>
                    </div>

                    <Progress value={progressPct} className="h-1.5" />
                </div>

                {/* Steps */}
                <div className="px-6 py-5 space-y-3">
                    {steps.map((step, idx) => {
                        const isActive = step.id === activeStep?.id;
                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    'flex items-center gap-4 rounded-xl p-4 transition-all',
                                    step.done
                                        ? 'opacity-50'
                                        : isActive
                                            ? 'bg-primary/8 border border-primary/20'
                                            : 'opacity-60'
                                )}
                            >
                                {/* Icon / check */}
                                <div className={cn(
                                    'flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 transition-colors',
                                    step.done
                                        ? 'bg-green-100 dark:bg-green-900/30'
                                        : isActive
                                            ? 'bg-primary/15'
                                            : 'bg-muted'
                                )}>
                                    {step.done
                                        ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        : isActive
                                            ? <step.icon className="h-4 w-4 text-primary" />
                                            : <Circle className="h-4 w-4 text-muted-foreground" />
                                    }
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        'text-sm font-medium',
                                        step.done && 'line-through text-muted-foreground',
                                        isActive && 'text-foreground'
                                    )}>
                                        <span className="mr-1.5 text-xs opacity-40">{idx + 1}.</span>
                                        {step.label}
                                    </p>
                                    {!step.done && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {step.description}
                                        </p>
                                    )}
                                </div>

                                {/* CTA — only for active step */}
                                {isActive && (
                                    <Button
                                        variant="zen"
                                        size="sm"
                                        className="flex-shrink-0 text-xs h-8 px-3 gap-1"
                                        onClick={() => navigate(step.href)}
                                    >
                                        {step.cta}
                                        <ArrowRight className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 text-center flex flex-col gap-3 items-center mt-2">
                    <button
                        onClick={() => setIsRuntimeDismissed(true)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                    >
                        Omitir y cerrar por ahora
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-muted-foreground/60 hover:text-red-500 hover:underline underline-offset-4 transition-colors"
                    >
                        No volver a mostrar este mensaje
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OnboardingModal;

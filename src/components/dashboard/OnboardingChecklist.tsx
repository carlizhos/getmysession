import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2, Circle, Users, FileSignature,
    Calendar, FileText, DollarSign, Rocket, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    href: string;
    cta: string;
    done: boolean;
}

const DISMISSED_KEY = 'getmysession_onboarding_dismissed';

const OnboardingChecklist = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [steps, setSteps] = useState<Step[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');
    const [collapsed, setCollapsed] = useState(false);

    const fetchProgress = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [
                { count: patientsCount },
                { count: consentsCount },
                { count: appointmentsCount },
                { count: notesCount },
                { count: paymentsCount },
            ] = await Promise.all([
                supabase.from('patients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('consent_forms').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_valid', true),
                supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('session_notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
                supabase.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            ]);

            setSteps([
                {
                    id: 'patient',
                    label: 'Agrega tu primer paciente',
                    description: 'Crea el expediente clínico con datos de contacto y NOM-024.',
                    icon: Users,
                    href: '/patients',
                    cta: 'Ir a Pacientes',
                    done: (patientsCount ?? 0) > 0,
                },
                {
                    id: 'consent',
                    label: 'Obtén el consentimiento informado',
                    description: 'El paciente firma antes de iniciar el tratamiento.',
                    icon: FileSignature,
                    href: '/consents',
                    cta: 'Ir a Consentimientos',
                    done: (consentsCount ?? 0) > 0,
                },
                {
                    id: 'appointment',
                    label: 'Agrega una cita',
                    description: 'Agenda la primera sesión en la agenda.',
                    icon: Calendar,
                    href: '/agenda',
                    cta: 'Ir a la Agenda',
                    done: (appointmentsCount ?? 0) > 0,
                },
                {
                    id: 'note',
                    label: 'Escribe tu primera nota clínica',
                    description: 'Documenta la sesión: animo, agenda, diagnóstico CIE-10.',
                    icon: FileText,
                    href: '/notes',
                    cta: 'Ir a Notas',
                    done: (notesCount ?? 0) > 0,
                },
                {
                    id: 'payment',
                    label: 'Registra un cobro',
                    description: 'Marca la sesión como pagada (efectivo, transferencia o Stripe).',
                    icon: DollarSign,
                    href: '/finance',
                    cta: 'Ir a Finanzas',
                    done: (paymentsCount ?? 0) > 0,
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchProgress(); }, [fetchProgress]);

    if (loading) return null;

    const completedCount = steps.filter(s => s.done).length;
    const allDone = completedCount === steps.length;
    const progressPct = Math.round((completedCount / steps.length) * 100);

    // Hide if dismissed by user, or if all steps are done (auto-hide)
    if (dismissed || allDone) return null;

    // Find the next pending step to highlight
    const nextStep = steps.find(s => !s.done);

    return (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                    <Rocket className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm">
                            Configura tu consultorio
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {completedCount}/{steps.length} completados
                            </span>
                        </h3>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost" size="icon-sm"
                                onClick={() => setCollapsed(c => !c)}
                                title={collapsed ? 'Expandir' : 'Colapsar'}
                            >
                                {collapsed
                                    ? <ChevronDown className="h-3.5 w-3.5" />
                                    : <ChevronUp className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                                variant="ghost" size="icon-sm"
                                onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); setDismissed(true); }}
                                title="Ocultar guía"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                    <Progress value={progressPct} className="h-1.5 mt-1.5" />
                </div>
            </div>

            {/* Steps list */}
            {!collapsed && (
                <div className="px-5 pb-5 space-y-2">
                    {steps.map((step, idx) => {
                        const isNext = step.id === nextStep?.id;
                        return (
                            <div
                                key={step.id}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl p-3 transition-all',
                                    step.done
                                        ? 'opacity-60'
                                        : isNext
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'opacity-80'
                                )}
                            >
                                {/* Icon / check */}
                                <div className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 transition-colors',
                                    step.done ? 'bg-green-100' : isNext ? 'bg-primary/15' : 'bg-muted'
                                )}>
                                    {step.done
                                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        : <step.icon className={cn('h-3.5 w-3.5', isNext ? 'text-primary' : 'text-muted-foreground')} />
                                    }
                                </div>

                                {/* Step number + text */}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        'text-sm font-medium',
                                        step.done && 'line-through text-muted-foreground',
                                        isNext && 'text-primary'
                                    )}>
                                        <span className="mr-1.5 text-xs opacity-50">{idx + 1}.</span>
                                        {step.label}
                                    </p>
                                    {!step.done && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                                    )}
                                </div>

                                {/* CTA — only for next pending step */}
                                {isNext && (
                                    <Button
                                        variant="zen"
                                        size="sm"
                                        className="flex-shrink-0 text-xs h-7 px-3"
                                        onClick={() => navigate(step.href)}
                                    >
                                        {step.cta}
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OnboardingChecklist;

import { useState } from 'react';
import { format, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns';
import { formatClinicTime } from '@/lib/timezone';
import { es } from 'date-fns/locale';
import {
    Clock,
    MapPin,
    Video,
    Repeat,
    CreditCard,
    CircleDollarSign,
    MessageSquare,
    CheckCircle,
    Timer,
    XCircle,
    CheckCircle2,
    CalendarX,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Calendar,
    Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarTheme, getInitials } from '@/lib/avatar-utils';
import { toast } from 'sonner';

import { Appointment } from '@/types';

interface AgendaListViewProps {
    appointments: Appointment[];
    onEditAppointment: (apt: Appointment) => void;
    onCancelAppointment: (id: string) => void;
    onRescheduleAppointment: (apt: Appointment) => void;
    clinicTimezone?: string;
}

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Sin confirmar',
    confirmed: 'Confirmada',
    pending: 'En espera',
    completed: 'Completada',
    cancelled: 'Cancelada',
};

const STATUS_CONFIG: Record<string, {
    bg: string; text: string; dot: string; border: string;
    cardAccent: string; badgeBg: string; cardBg: string;
}> = {
    scheduled: {
        bg: 'bg-primary/5 dark:bg-primary/10',
        text: 'text-primary dark:text-primary-foreground',
        dot: 'bg-primary',
        border: 'border-primary/10 dark:border-primary/20',
        cardAccent: 'border-l-primary',
        badgeBg: 'bg-primary/10 dark:bg-primary/20',
        cardBg: 'bg-primary/5 dark:bg-primary/10',
    },
    confirmed: {
        bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
        text: 'text-emerald-700 dark:text-emerald-300',
        dot: 'bg-emerald-400',
        border: 'border-emerald-100 dark:border-emerald-900',
        cardAccent: 'border-l-emerald-400',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
        cardBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    },
    pending: {
        bg: 'bg-amber-50/60 dark:bg-amber-950/20',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-400',
        border: 'border-amber-100 dark:border-amber-900',
        cardAccent: 'border-l-amber-400',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
        cardBg: 'bg-amber-50/80 dark:bg-amber-950/30',
    },
    completed: {
        bg: 'bg-violet-50/60 dark:bg-violet-950/20',
        text: 'text-violet-700 dark:text-violet-300',
        dot: 'bg-violet-400',
        border: 'border-violet-100 dark:border-violet-900',
        cardAccent: 'border-l-violet-400',
        badgeBg: 'bg-violet-100 dark:bg-violet-900/50',
        cardBg: 'bg-violet-50/80 dark:bg-violet-950/30',
    },
    cancelled: {
        bg: 'bg-slate-50/60 dark:bg-slate-800/20',
        text: 'text-slate-500 dark:text-slate-400',
        dot: 'bg-slate-300',
        border: 'border-slate-100 dark:border-slate-800',
        cardAccent: 'border-l-slate-300',
        badgeBg: 'bg-slate-100 dark:bg-slate-800',
        cardBg: 'bg-slate-50/80 dark:bg-slate-800/30',
    },
};

const STATUS_ICON: Record<string, any> = {
    scheduled: Clock,
    confirmed: CheckCircle,
    pending: Timer,
    completed: CheckCircle2,
    cancelled: XCircle,
};

const getDateLabel = (dateStr: string): string => {
    const date = parseISO(dateStr + 'T00:00:00');
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    if (isTomorrow(date)) return 'Mañana';
    const day = format(date, "EEEE", { locale: es });
    return day.charAt(0).toUpperCase() + day.slice(1);
};

const getFormattedDate = (dateStr: string): string => {
    const date = parseISO(dateStr + 'T00:00:00');
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
};

/* ── Appointment row (collapsed + expandable) ─────────────── */
const AppointmentRow = ({
    apt,
    onEdit,
    onCancel,
    onReschedule,
}: {
    apt: Appointment;
    onEdit: (apt: Appointment) => void;
    onCancel: (id: string) => void;
    onReschedule: (apt: Appointment) => void;
    clinicTimezone?: string;
}) => {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async (e: React.MouseEvent, link: string) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success('Enlace de videollamada copiado');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error copying to clipboard:', err);
            toast.error('No se pudo copiar el enlace');
        }
    };

    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
    const StatusIcon = STATUS_ICON[apt.status] || Clock;
    const tz = clinicTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const startFmt = formatClinicTime(parseISO(apt.start_time), tz);
    const endFmt = formatClinicTime(parseISO(apt.end_time), tz);

    return (
        <div
            className={cn(
                "rounded-2xl border bg-white dark:bg-slate-900 transition-all duration-200",
                expanded
                    ? "border-primary/30 dark:border-primary/50 shadow-md"
                    : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm",
                apt.status === 'cancelled' && 'opacity-60'
            )}
        >
            {/* ── Collapsed row ──────────────────────────────── */}
            <div className="flex items-center gap-4 sm:gap-6 px-5 py-4">
                {/* From / To */}
                <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                    <div className="text-center min-w-[70px]">
                        <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Desde
                        </span>
                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                            {startFmt}
                        </span>
                    </div>
                    <div className="text-center min-w-[70px]">
                        <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Hasta
                        </span>
                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                            {endFmt}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-10 bg-slate-100 dark:bg-slate-800 flex-shrink-0" />

                {/* Patient / Type */}
                <div className="flex-1 min-w-0 hidden sm:block">
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Paciente
                    </span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                        {apt.patient_name}
                    </span>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-10 bg-slate-100 dark:bg-slate-800 flex-shrink-0" />

                {/* Avatar + Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                        className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold select-none flex-shrink-0",
                            getAvatarTheme(apt.patient_name || '')
                        )}
                    >
                        {getInitials(apt.patient_name || '')}
                    </div>
                    <div className="hidden md:block">
                        <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Estado
                        </span>
                        <span className={cn("block text-sm font-semibold mt-0.5", cfg.text)}>
                            {STATUS_LABEL[apt.status] || apt.status}
                        </span>
                    </div>
                </div>

                {/* Show more / Show less */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/80 text-sm font-semibold flex-shrink-0 transition-colors ml-auto"
                >
                    {expanded ? (
                        <>
                            <span className="hidden sm:inline">Menos</span>
                            <ChevronUp className="h-4 w-4" />
                        </>
                    ) : (
                        <>
                            <span className="hidden sm:inline">Más</span>
                            <ChevronDown className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>

            {/* ── Mobile patient name (visible only on sm) ──── */}
            <div className="sm:hidden px-5 -mt-2 pb-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {apt.patient_name}
                </span>
            </div>

            {/* ── Expanded details ───────────────────────────── */}
            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Modality */}
                        <div>
                            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                Modalidad
                            </span>
                            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                {apt.modality === 'online' ? (
                                    <>
                                        <Video className="h-3.5 w-3.5 text-primary" />
                                        En línea
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="h-3.5 w-3.5 text-amber-500" />
                                        Presencial
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Payment */}
                        <div>
                            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                Pago
                            </span>
                            <span className={cn(
                                "flex items-center gap-1.5 text-sm font-medium",
                                apt.payment_status === 'paid'
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-500 dark:text-slate-400"
                            )}>
                                {apt.payment_status === 'paid' ? (
                                    <>
                                        <CreditCard className="h-3.5 w-3.5" />
                                        Pagado
                                    </>
                                ) : (
                                    <>
                                        <CircleDollarSign className="h-3.5 w-3.5" />
                                        Sin pagar
                                    </>
                                )}
                            </span>
                        </div>

                        {/* Recurring */}
                        {apt.isRecurring && (
                            <div>
                                <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                    Recurrencia
                                </span>
                                <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                                    <Repeat className="h-3.5 w-3.5" />
                                    Cita recurrente
                                </span>
                            </div>
                        )}

                        {/* Meeting link */}
                    {apt.meeting_link && (
                        <div className="sm:col-span-2 md:col-span-3">
                            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                Link de Videollamada
                            </span>
                            <div className="flex items-center gap-2 max-w-full">
                                <a
                                    href={apt.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:underline truncate min-w-0 flex-1"
                                >
                                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                    <span className="truncate">{apt.meeting_link}</span>
                                </a>
                                <button
                                    onClick={(e) => handleCopyLink(e, apt.meeting_link!)}
                                    className="p-1 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors flex-shrink-0"
                                    title="Copiar enlace"
                                >
                                    {copied ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 animate-in zoom-in duration-200" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Notes */}
                    {apt.notes && (
                        <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                            <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                Notas
                            </span>
                            <div className="flex items-start gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {apt.notes}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        {isToday(parseISO(apt.startTime)) && apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCancel(apt.id);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-destructive border border-destructive/20 rounded-xl hover:bg-destructive/10 transition-colors uppercase tracking-tight"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReschedule(apt);
                                    }}
                                    className="px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors flex items-center gap-1.5 uppercase tracking-tight"
                                >
                                    <Calendar className="h-3.5 w-3.5" />
                                    Reagendar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(apt);
                                    }}
                                    className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all active:scale-95 uppercase tracking-tight"
                                >
                                    Editar
                                </button>
                            </>
                        )}
                        {apt.modality === 'online' && apt.meetingLink && (
                            <a
                                href={apt.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 uppercase tracking-tight"
                            >
                                <Video className="h-4 w-4" />
                                Unirse a la reunión
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Main list view ────────────────────────────────────────── */
const AgendaListView = ({ 
    appointments, 
    onEditAppointment,
    onCancelAppointment,
    onRescheduleAppointment,
    clinicTimezone
}: AgendaListViewProps) => {
    const grouped = appointments.reduce((acc: Record<string, Appointment[]>, apt) => {
        const dateKey = apt.start_time.slice(0, 10);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(apt);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const today = format(new Date(), 'yyyy-MM-dd');

    if (sortedDates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <CalendarX className="h-9 w-9 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                        No hay citas en este periodo
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                        Tu agenda está libre. Usa el botón "Crear" para agendar una nueva cita.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[400px]">
            <div className="px-5 sm:px-7 py-6 space-y-7">
                {sortedDates.map((dateStr) => {
                    const isPast = dateStr < today;
                    const isCurrentDay = dateStr === today;
                    const dayLabel = getDateLabel(dateStr);
                    const formattedDate = getFormattedDate(dateStr);
                    const dayApts = grouped[dateStr].sort((a, b) =>
                        a.start_time.localeCompare(b.start_time)
                    );

                    return (
                        <div key={dateStr}>
                            {/* ── Day header (EduMate style) ─────── */}
                            <div className={cn(
                                "flex items-center gap-2 mb-4",
                                isPast && !isCurrentDay && "opacity-60"
                            )}>
                                <span className={cn(
                                    "text-base font-bold",
                                    isCurrentDay
                                        ? "text-slate-900 dark:text-slate-50"
                                        : "text-slate-700 dark:text-slate-300"
                                )}>
                                    {dayLabel}
                                </span>
                                <span className="text-sm text-slate-400 dark:text-slate-500 capitalize">
                                    {formattedDate}
                                </span>
                                {isCurrentDay && (
                                    <span className="ml-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>

                            {/* ── Appointment cards ──────────────── */}
                            <div className="space-y-3">
                                {dayApts.map((apt) => (
                                    <AppointmentRow
                                        key={apt.id}
                                        apt={apt}
                                        onEdit={onEditAppointment}
                                        onCancel={onCancelAppointment}
                                        onReschedule={onRescheduleAppointment}
                                        clinicTimezone={clinicTimezone}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgendaListView;

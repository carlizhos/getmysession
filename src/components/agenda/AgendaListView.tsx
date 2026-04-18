import { useState } from 'react';
import { format, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Appointment {
    id: string;
    patientName: string;
    startTime: string;
    endTime: string;
    status: string;
    paymentStatus: string;
    notes?: string;
    modality?: string;
    isRecurring?: boolean;
    type?: string;
    meetingLink?: string;
}

interface AgendaListViewProps {
    appointments: Appointment[];
    onEditAppointment: (apt: Appointment) => void;
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
        bg: 'bg-blue-50/60 dark:bg-blue-950/20',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-400',
        border: 'border-blue-100 dark:border-blue-900',
        cardAccent: 'border-l-blue-400',
        badgeBg: 'bg-blue-100 dark:bg-blue-900/50',
        cardBg: 'bg-blue-50/80 dark:bg-blue-900/30',
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

// Avatar color palette
const AVATAR_THEMES = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
    'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
    'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300',
    'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-300',
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300',
];

const getAvatarTheme = (name: string) => {
    const idx = (name?.charCodeAt(0) || 0) % AVATAR_THEMES.length;
    return AVATAR_THEMES[idx];
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
}: {
    apt: Appointment;
    onEdit: (apt: Appointment) => void;
}) => {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
    const StatusIcon = STATUS_ICON[apt.status] || Clock;
    const startFmt = format(parseISO(apt.startTime), 'hh:mm a');
    const endFmt = format(parseISO(apt.endTime), 'hh:mm a');

    return (
        <div
            className={cn(
                "rounded-2xl border bg-white dark:bg-slate-900 transition-all duration-200",
                expanded
                    ? "border-blue-200 dark:border-blue-800 shadow-md"
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
                        {apt.patientName}
                    </span>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-10 bg-slate-100 dark:bg-slate-800 flex-shrink-0" />

                {/* Avatar + Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                        className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold select-none flex-shrink-0",
                            getAvatarTheme(apt.patientName || '')
                        )}
                    >
                        {apt.patientName?.charAt(0).toUpperCase() ?? '?'}
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
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-semibold flex-shrink-0 transition-colors ml-auto"
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
                    {apt.patientName}
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
                                        <Video className="h-3.5 w-3.5 text-blue-500" />
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
                                apt.paymentStatus === 'paid'
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-500 dark:text-slate-400"
                            )}>
                                {apt.paymentStatus === 'paid' ? (
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
                                <span className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                                    <Repeat className="h-3.5 w-3.5" />
                                    Cita recurrente
                                </span>
                            </div>
                        )}

                        {/* Meeting link */}
                        {apt.meetingLink && (
                            <div className="sm:col-span-2 md:col-span-3">
                                <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                                    Link
                                </span>
                                <a
                                    href={apt.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:text-blue-600 hover:underline truncate"
                                >
                                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                    {apt.meetingLink}
                                </a>
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
                    <div className="flex items-center justify-end gap-2 pt-2">
                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(apt);
                                }}
                                className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                Editar
                            </button>
                        )}
                        {apt.modality === 'online' && apt.meetingLink && (
                            <a
                                href={apt.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors flex items-center gap-1.5"
                            >
                                <Video className="h-3.5 w-3.5" />
                                Unirse
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Main list view ────────────────────────────────────────── */
const AgendaListView = ({ appointments, onEditAppointment }: AgendaListViewProps) => {
    const grouped = appointments.reduce((acc: Record<string, Appointment[]>, apt) => {
        const dateKey = apt.startTime.slice(0, 10);
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
                        a.startTime.localeCompare(b.startTime)
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
                                    <span className="ml-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                            </div>

                            {/* ── Appointment cards ──────────────── */}
                            <div className="space-y-3">
                                {dayApts.map((apt) => (
                                    <AppointmentRow
                                        key={apt.id}
                                        apt={apt}
                                        onEdit={onEditAppointment}
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

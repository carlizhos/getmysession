import { format, parseISO, isToday, isYesterday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Clock, 
    MapPin, 
    Video, 
    Repeat, 
    CreditCard, 
    CircleDollarSign, 
    ChevronRight,
    MessageSquare,
    CheckCircle,
    Timer,
    XCircle,
    CheckCircle2,
    CalendarX
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

// Subtle avatar color by first letter
const PATIENT_THEMES = [
    { 
        avatar: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
        card: 'bg-blue-50/40 dark:bg-blue-900/10'
    },
    { 
        avatar: 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300',
        card: 'bg-violet-50/40 dark:bg-violet-900/10'
    },
    { 
        avatar: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
        card: 'bg-emerald-50/40 dark:bg-emerald-900/10'
    },
    { 
        avatar: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
        card: 'bg-amber-50/40 dark:bg-amber-900/10'
    },
    { 
        avatar: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300',
        card: 'bg-rose-50/40 dark:bg-rose-900/10'
    },
    { 
        avatar: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-300',
        card: 'bg-cyan-50/40 dark:bg-cyan-900/10'
    },
    { 
        avatar: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300',
        card: 'bg-indigo-50/40 dark:bg-indigo-900/10'
    },
];

const getPatientTheme = (name: string) => {
    const idx = (name?.charCodeAt(0) || 0) % PATIENT_THEMES.length;
    return PATIENT_THEMES[idx];
};

const getDateLabel = (dateStr: string): { primary: string; secondary: string } => {
    const date = parseISO(dateStr + 'T00:00:00');
    const secondary = format(date, "d 'de' MMMM, yyyy", { locale: es });
    if (isToday(date)) return { primary: 'Hoy', secondary };
    if (isYesterday(date)) return { primary: 'Ayer', secondary };
    if (isTomorrow(date)) return { primary: 'Mañana', secondary };
    const label = format(date, "EEEE", { locale: es });
    return { 
        primary: label.charAt(0).toUpperCase() + label.slice(1), 
        secondary 
    };
};

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
        <div className="bg-slate-50/50 dark:bg-slate-950/30 min-h-[400px]">
            <div className="px-6 py-8 space-y-8 max-w-3xl mx-auto">
                {sortedDates.map((dateStr) => {
                    const { primary, secondary } = getDateLabel(dateStr);
                    const isCurrentDay = dateStr === today;
                    const isPast = dateStr < today;
                    const dayApts = grouped[dateStr].sort((a, b) =>
                        a.startTime.localeCompare(b.startTime)
                    );

                    return (
                        <div key={dateStr} className={cn(
                            "rounded-2xl p-5",
                            isCurrentDay
                                ? "bg-white dark:bg-slate-900 ring-2 ring-primary/20 shadow-sm"
                                : isPast
                                ? "bg-white/60 dark:bg-slate-900/40"
                                : "bg-white dark:bg-slate-900 shadow-sm"
                        )}>
                            {/* Date Header */}
                            <div className="flex items-center gap-3 mb-5">
                                {/* Day number pill */}
                                <div className={cn(
                                    "h-12 w-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0",
                                    isCurrentDay
                                        ? "bg-primary text-primary-foreground"
                                        : isPast
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                )}>
                                    <span className="text-xs font-medium leading-none capitalize">
                                        {format(parseISO(dateStr + 'T00:00:00'), 'EEE', { locale: es })}
                                    </span>
                                    <span className="text-xl font-bold leading-tight">
                                        {format(parseISO(dateStr + 'T00:00:00'), 'd')}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-base font-bold",
                                            isCurrentDay
                                                ? "text-primary"
                                                : isPast
                                                ? "text-slate-400 dark:text-slate-500"
                                                : "text-slate-800 dark:text-slate-100"
                                        )}>
                                            {primary}
                                        </span>
                                        {isCurrentDay && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-widest">
                                                HOY
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs capitalize",
                                        isPast && !isCurrentDay
                                            ? "text-slate-400 dark:text-slate-600"
                                            : "text-slate-500 dark:text-slate-400"
                                    )}>
                                        {secondary}
                                    </span>
                                </div>

                                <span className={cn(
                                    "text-xs font-semibold px-2.5 py-1 rounded-full",
                                    isCurrentDay
                                        ? "bg-primary/10 text-primary"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                )}>
                                    {dayApts.length} {dayApts.length === 1 ? 'cita' : 'citas'}
                                </span>
                            </div>

                            {/* Appointments */}
                            <div className="relative space-y-2.5 pl-5">
                                {/* Timeline spine */}
                                {dayApts.length > 1 && (
                                    <div className={cn(
                                        "absolute left-[7px] top-5 bottom-5 w-px",
                                        isCurrentDay
                                            ? "bg-primary/20"
                                            : "bg-slate-200 dark:bg-slate-700"
                                    )} />
                                )}

                                {dayApts.map((apt) => {
                                    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
                                    const StatusIcon = STATUS_ICON[apt.status] || Clock;
                                    const startFmt = format(parseISO(apt.startTime), 'HH:mm');
                                    const endFmt = format(parseISO(apt.endTime), 'HH:mm');
                                    const theme = getPatientTheme(apt.patientName || '');

                                    return (
                                        <div key={apt.id} className="relative group" onClick={() => onEditAppointment(apt)}>
                                            {/* Card */}
                                            <div className={cn(
                                                "rounded-xl border-l-4 border border-slate-100 dark:border-slate-800/80 pl-4 pr-4 py-3.5 cursor-pointer",
                                                cfg.cardBg,
                                                "transition-all duration-150 hover:shadow-md hover:-translate-y-px hover:border-slate-200 dark:hover:border-slate-700",
                                                cfg.cardAccent,
                                                apt.status === 'cancelled' && 'opacity-55'
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar */}
                                                    <div className={cn(
                                                        "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold select-none",
                                                        theme.avatar
                                                    )}>
                                                        {apt.patientName?.charAt(0).toUpperCase() ?? '?'}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                                                {apt.patientName}
                                                            </span>
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                                                                cfg.badgeBg,
                                                                cfg.text
                                                            )}>
                                                                <StatusIcon className="h-2.5 w-2.5" />
                                                                {STATUS_LABEL[apt.status] || apt.status}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <Clock className="h-3 w-3" />
                                                                {startFmt} – {endFmt}
                                                            </span>
                                                            {apt.modality === 'online' ? (
                                                                <span className="flex items-center gap-1 text-blue-500">
                                                                    <Video className="h-3 w-3" />
                                                                    En línea
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                                                                    <MapPin className="h-3 w-3" />
                                                                    Presencial
                                                                </span>
                                                            )}
                                                            {apt.isRecurring && (
                                                                <span className="flex items-center gap-1 text-slate-400">
                                                                    <Repeat className="h-3 w-3" />
                                                                    Recurrente
                                                                </span>
                                                            )}
                                                        </div>

                                                        {apt.notes && (
                                                            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                                                <MessageSquare className="h-3 w-3 text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
                                                                <p className="text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed line-clamp-2">
                                                                    {apt.notes}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right side */}
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        {apt.paymentStatus === 'paid' ? (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-full">
                                                                <CreditCard className="h-3 w-3" />
                                                                Pagado
                                                            </span>
                                                        ) : apt.status !== 'cancelled' ? (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-full">
                                                                <CircleDollarSign className="h-3 w-3" />
                                                                Sin pagar
                                                            </span>
                                                        ) : null}
                                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgendaListView;

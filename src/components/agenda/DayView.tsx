import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, MapPin, Video, Repeat, CreditCard, CircleDollarSign, CheckCircle, Timer, XCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayViewProps {
    currentDate: Date;
    appointments: any[];
    getStatusColor: (status: string) => string;
    getChipStyle?: (apt: any) => string;
    timeSlots?: number[];
    isWorkingDay?: boolean;
}

const STATUS_ICON: Record<string, any> = {
    scheduled: Clock,
    confirmed: CheckCircle,
    pending: Timer,
    completed: CheckCircle2,
    cancelled: XCircle,
};

const STATUS_DOT: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    pending: 'bg-yellow-400',
    completed: 'bg-violet-500',
    cancelled: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Sin confirmar',
    confirmed: 'Confirmada',
    pending: 'En espera',
    completed: 'Completada',
    cancelled: 'Cancelada',
};

const DayView = ({ currentDate, appointments, getStatusColor, getChipStyle, timeSlots: propTimeSlots, isWorkingDay }: DayViewProps) => {
    const timeSlots = propTimeSlots || Array.from({ length: 24 }, (_, i) => i); // Fallback to 24h
    const now = new Date();
    const isCurrentDay = isToday(currentDate);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const timeIndicatorPosition = isCurrentDay ? (currentMinute / 60) * 100 : null;

    const getAppointmentsForHour = (hour: number) => {
        return appointments.filter(
            apt => parseISO(apt.startTime).getHours() === hour
        );
    };

    const chipStyle = (apt: any) =>
        getChipStyle ? getChipStyle(apt) : getStatusColor(apt.status);

    return (
        <div className="max-h-[600px] overflow-y-auto scrollbar-zen relative">
            {timeSlots.map(hour => {
                const hourAppointments = getAppointmentsForHour(hour);
                const isCurrentHour = isCurrentDay && hour === currentHour;

                return (
                    <div
                        key={hour}
                        className="grid grid-cols-[80px_1fr] border-b border-border last:border-b-0 relative"
                    >
                        <div className={cn(
                            "p-3 text-center text-sm text-muted-foreground border-r border-border bg-muted/30",
                            isWorkingDay === false && "text-red-400/50"
                        )}>
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        <div className={cn(
                            "p-2 min-h-[60px] transition-colors relative",
                            isWorkingDay !== false && "hover:bg-accent/30",
                            isWorkingDay === false && "bg-red-50/20"
                        )}>
                            {/* Current time indicator */}
                            {isCurrentHour && timeIndicatorPosition !== null && (
                                <div
                                    className="absolute left-0 right-0 flex items-center z-10"
                                    style={{ top: `${timeIndicatorPosition}%` }}
                                >
                                    <div className="h-0.5 w-full bg-primary relative">
                                        <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {hourAppointments.map(apt => (
                                    <div
                                        key={apt.id}
                                        className={cn(
                                            "rounded-lg border p-3 cursor-pointer transition-all hover:shadow-soft space-y-1",
                                            chipStyle(apt),
                                            apt.status === 'cancelled' && 'opacity-60'
                                        )}
                                    >
                                    <div
                                        key={apt.id}
                                        className={cn(
                                            "rounded-xl border p-2.5 cursor-pointer transition-all hover:shadow-md space-y-2 relative overflow-hidden",
                                            chipStyle(apt),
                                            apt.status === 'cancelled' && 'opacity-60 grayscale-[0.2]'
                                        )}
                                    >
                                        {/* Subtle side accent */}
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", STATUS_DOT[apt.status])} />

                                        {/* Row 1: Identity & Status */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 font-bold text-sm flex-1 min-w-0">
                                                {apt.modality === 'online' ? (
                                                    <div className="bg-blue-100 dark:bg-blue-900/40 p-1 rounded-md">
                                                        <Video className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                ) : (
                                                    <div className="bg-amber-100 dark:bg-amber-900/40 p-1 rounded-md">
                                                        <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                                    </div>
                                                )}
                                                <span className="truncate">{apt.patientName}</span>
                                            </div>

                                            {apt.status && STATUS_LABEL[apt.status] && (
                                                <div className={cn(
                                                    "flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-current/10 uppercase tracking-wider",
                                                    STATUS_DOT[apt.status],
                                                    "bg-opacity-20 text-current"
                                                )}>
                                                    {(() => {
                                                        const Icon = STATUS_ICON[apt.status] || Clock;
                                                        return <Icon className="h-2.5 w-2.5" />;
                                                    })()}
                                                    {STATUS_LABEL[apt.status]}
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 2: Time, Recurrence & Payment */}
                                        <div className="flex items-center justify-between pt-1 border-t border-current/5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-[10px] font-semibold opacity-80">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{format(parseISO(apt.startTime), 'h:mm a')}</span>
                                                    {apt.isRecurring && (
                                                        <div className="ml-1 bg-blue-500/10 p-0.5 rounded">
                                                            <Repeat className="h-2.5 w-2.5 text-blue-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                {apt.type && (
                                                    <span className="text-[9px] opacity-60 font-medium uppercase tracking-widest">{apt.type}</span>
                                                )}
                                            </div>

                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold border border-current/10",
                                                apt.paymentStatus === 'paid' ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                                            )}>
                                                {apt.paymentStatus === 'paid' ? (
                                                    <>
                                                        <CreditCard className="h-3 w-3" />
                                                        <span>PAGADA</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CircleDollarSign className="h-3 w-3 opacity-60" />
                                                        <span>SIN PAGAR</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes - Compact */}
                                        {apt.notes && (
                                            <p className="text-[10px] opacity-60 italic pt-1 line-clamp-1 border-t border-current/5">
                                                "{apt.notes}"
                                            </p>
                                        )}
                                    </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DayView;

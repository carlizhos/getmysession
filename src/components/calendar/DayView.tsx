import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayViewProps {
    currentDate: Date;
    appointments: any[];
    getStatusColor: (status: string) => string;
    getChipStyle?: (apt: any) => string;
}

const STATUS_DOT: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    pending: 'bg-yellow-400',
    completed: 'bg-violet-500',
    cancelled: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
    scheduled: 'Agendada',
    confirmed: 'Confirmada',
    pending: 'En espera',
    completed: 'Completada',
    cancelled: 'Cancelada',
};

const DayView = ({ currentDate, appointments, getStatusColor, getChipStyle }: DayViewProps) => {
    const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 0:00 to 23:00
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
                        <div className="p-3 text-center text-sm text-muted-foreground border-r border-border bg-muted/30">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        <div className="p-2 min-h-[60px] transition-colors hover:bg-accent/30 relative">
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
                                        {/* Patient + status dot */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-semibold">
                                                {apt.status && STATUS_DOT[apt.status] && (
                                                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', STATUS_DOT[apt.status])} />
                                                )}
                                                <User className="h-4 w-4" />
                                                <span>{apt.patientName}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm opacity-75">
                                                <Clock className="h-3 w-3" />
                                                <span>{format(parseISO(apt.startTime), 'h:mm a')}</span>
                                            </div>
                                        </div>

                                        {/* Type + status badge */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {apt.type && (
                                                <p className="text-xs opacity-75">{apt.type}</p>
                                            )}
                                            {apt.status && STATUS_LABEL[apt.status] && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                                                    {STATUS_LABEL[apt.status]}
                                                </span>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        {apt.notes && (
                                            <p className="text-xs opacity-60 italic border-t border-current/10 pt-1 mt-1 line-clamp-2">
                                                {apt.notes}
                                            </p>
                                        )}
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

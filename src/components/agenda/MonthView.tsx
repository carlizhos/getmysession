import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Video, MapPin, Repeat, CreditCard, CircleDollarSign, Clock, CheckCircle, Timer, XCircle, CheckCircle2 } from 'lucide-react';

interface MonthViewProps {
    currentDate: Date;
    appointments: any[];
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onDayClick?: (date: Date) => void;
    getStatusColor: (status: string) => string;
    isWorkingDay?: (date: Date) => boolean;
    isNonWorkingDay?: (date: Date) => boolean;
    isPastDay?: (date: Date) => boolean;
    onEditAppointment?: (apt: any) => void;
}

const MonthView = ({ currentDate, appointments, selectedDate, onSelectDate, onDayClick, getStatusColor, isWorkingDay, isNonWorkingDay, isPastDay, onEditAppointment }: MonthViewProps) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const getAppointmentsForDay = (date: Date) => {
        return appointments.filter(apt =>
            isSameDay(parseISO(apt.startTime), date)
        );
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const handleDayClick = (day: Date) => {
        onSelectDate(day);
        if (onDayClick) {
            onDayClick(day);
        }
    };

    return (
        <div>
            {/* Week header */}
            <div className="grid grid-cols-7 border-b border-border">
                {weekDays.map(day => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    const dayAppointments = getAppointmentsForDay(day);
                    const isCurrentMonthDay = isCurrentMonth(day);

                    const working = isWorkingDay ? isWorkingDay(day) : true;
                    const nonWorking = isNonWorkingDay ? isNonWorkingDay(day) : false;
                    const past = isPastDay ? isPastDay(day) : false;
                    const isDisabled = !working || nonWorking || past;

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => !isDisabled && handleDayClick(day)}
                            className={cn(
                                "min-h-[100px] p-2 border-r border-b border-border transition-colors last:border-r-0 relative pt-3",
                                isDisabled ? "bg-red-50/30 cursor-not-allowed" : "cursor-pointer hover:bg-accent/30",
                                !isCurrentMonthDay && !isDisabled && "bg-muted/10",
                                isToday(day) && !isDisabled && "bg-[#5da05d]/10",
                                isToday(day) && !isDisabled && "before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-primary before:rounded-full",
                                isSameDay(day, selectedDate) && !isDisabled && "ring-2 ring-primary ring-inset"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "text-sm font-semibold",
                                    isToday(day) && "text-primary",
                                    (!isCurrentMonthDay || isDisabled) && "text-muted-foreground/50",
                                    isDisabled && "text-red-400/50"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {dayAppointments.length > 0 && (
                                    <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                        {dayAppointments.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="space-y-1">
                                {dayAppointments.slice(0, 3).map(apt => (
                                    <div
                                        key={apt.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditAppointment?.(apt);
                                        }}
                                        className={cn(
                                            "text-[9px] p-1 rounded-md border flex items-center gap-1.5 min-w-0 transition-transform hover:scale-[1.02] cursor-pointer shadow-sm relative overflow-hidden",
                                            getStatusColor(apt.status)
                                        )}
                                    >
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", getStatusColor(apt.status).split(' ')[1])} />
                                        
                                        <div className="flex-shrink-0">
                                            {apt.modality === 'online' ? (
                                                <Video className="h-2.5 w-2.5 text-slate-500" title="En línea" />
                                            ) : (
                                                <MapPin className="h-2.5 w-2.5 text-amber-600" title="Presencial" />
                                            )}
                                        </div>

                                        <span className="truncate flex-1 font-bold leading-none">
                                            {apt.patientName.split(' ')[0]}
                                        </span>

                                        <div className="flex items-center gap-0.5 ml-auto">
                                            {apt.isRecurring && (
                                                <Repeat className="h-2 w-2 text-slate-600" />
                                            )}
                                            {apt.paymentStatus === 'paid' ? (
                                                <CreditCard className="h-2.5 w-2.5 text-green-600" title="Pagada" />
                                            ) : (
                                                <CircleDollarSign className="h-2.5 w-2.5 text-muted-foreground opacity-40" title="Pendiente" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {dayAppointments.length > 3 && (
                                    <div className="text-xs text-muted-foreground text-center">
                                        +{dayAppointments.length - 3} más
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthView;

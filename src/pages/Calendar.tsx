import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { format as fmtDate } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  parseISO,
  isToday,
  isBefore,
  startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import NewAppointmentDialog from '@/components/calendar/NewAppointmentDialog';
import DayView from '@/components/calendar/DayView';
import MonthView from '@/components/calendar/MonthView';

type ViewMode = 'day' | 'week' | 'month';

const CalendarPage = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
  const [nonWorkingDays, setNonWorkingDays] = useState<string[]>([]); // YYYY-MM-DD
  const [horarioFin, setHorarioFin] = useState('17:00'); // HH:mm

  // Load schedule from profile
  const [horario, setHorario] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('horario_atencion')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.horario_atencion) {
          setHorario(data.horario_atencion);
          if (data.horario_atencion.dias_no_laborables) {
            setNonWorkingDays(data.horario_atencion.dias_no_laborables);
          }
          if (data.horario_atencion.fin) {
            setHorarioFin(data.horario_atencion.fin);
          }
        }
      });
  }, [user]);

  const getDayConfig = (date: Date) => {
    if (!horario?.dias) return { inicio: '08:00', fin: '17:00' };
    return horario.dias[date.getDay()] || { inicio: '08:00', fin: '17:00' };
  };

  const isWorkingDay = (date: Date) => {
    if (!horario?.dias) return true;
    const dayNumeric = date.getDay();
    return !!horario.dias[dayNumeric]?.activo;
  };

  const isNonWorkingDay = (date: Date) => {
    if (!horario?.dias_no_laborables) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return horario.dias_no_laborables.includes(dateStr);
  };

  const isPastDay = (date: Date) => {
    const now = new Date();
    if (isBefore(startOfDay(date), startOfDay(now))) return true;
    
    if (isToday(date)) {
      const config = getDayConfig(date);
      const [finH, finM] = (config.fin || '17:00').split(':').map(Number);
      if (now.getHours() > finH || (now.getHours() === finH && now.getMinutes() >= finM)) return true;
    }
    return false;
  };

  const fetchAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      // Mapear campos de BD al formato que usa el calendario
      const mapped = (data || []).map((apt: any) => ({
        id: apt.id,
        patientId: apt.patient_id,
        patientName: apt.patient_name,
        startTime: apt.start_time,
        endTime: apt.end_time,
        status: apt.status,
        type: apt.type,
        fee: apt.fee,
        paymentStatus: apt.payment_status,
        notes: apt.notes,
        color: apt.color,
        meetingLink: apt.meeting_link,
        meetingPlatform: apt.meeting_platform,
      }));
      setAppointments(mapped);
    } catch (error) {
      console.error('Error al cargar citas:', error);
    } finally {
      // no-op
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const timeSlots = (() => {
    if (!horario?.dias) return Array.from({ length: 12 }, (_, i) => i + 8);
    
    if (viewMode === 'day') {
      const config = getDayConfig(currentDate);
      const startH = parseInt(config.inicio.split(':')[0]);
      const endH = parseInt(config.fin.split(':')[0]);
      const length = Math.max(1, endH - startH + 1);
      return Array.from({ length }, (_, i) => i + startH);
    }

    // For week view, find the global min/max across all active days
    let minStart = 24;
    let maxEnd = 0;
    let hasActive = false;
    
    Object.values(horario.dias).forEach((d: any) => {
      if (d.activo) {
        hasActive = true;
        minStart = Math.min(minStart, parseInt(d.inicio.split(':')[0]));
        maxEnd = Math.max(maxEnd, parseInt(d.fin.split(':')[0]));
      }
    });

    if (!hasActive) return Array.from({ length: 12 }, (_, i) => i + 8);
    const length = Math.max(1, maxEnd - minStart + 1);
    return Array.from({ length }, (_, i) => i + minStart);
  })();

  // Adaptive navigation handlers
  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const getDateRangeDisplay = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
      case 'week':
        return `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
      case 'month':
        return format(currentDate, "MMMM yyyy", { locale: es });
    }
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt =>
      isSameDay(parseISO(apt.startTime), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/20 border-success/40 text-success';
      case 'scheduled': return 'bg-blue-500/20 border-blue-400/40 text-blue-600 dark:text-blue-400';
      case 'pending': return 'bg-warning/20 border-warning/40 text-warning';
      case 'completed': return 'bg-violet-500/20 border-violet-400/40 text-violet-600 dark:text-violet-400';
      case 'cancelled': return 'bg-destructive/20 border-destructive/40 text-destructive line-through';
      default: return 'bg-muted border-border';
    }
  };

  // Color name -> Tailwind chip classes
  const COLOR_CHIP: Record<string, string> = {
    violet: 'bg-violet-100 border-violet-400 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
    blue: 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    cyan: 'bg-cyan-100 border-cyan-400 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
    green: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    yellow: 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    orange: 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    rose: 'bg-rose-100 border-rose-400 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
    slate: 'bg-slate-100 border-slate-400 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200',
    teal: 'bg-teal-100 border-teal-400 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  };

  const getChipStyle = (apt: any) =>
    apt.color && COLOR_CHIP[apt.color]
      ? COLOR_CHIP[apt.color]
      : getStatusColor(apt.status);

  const STATUS_DOT: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    pending: 'bg-yellow-400',
    completed: 'bg-violet-500',
    cancelled: 'bg-red-500',
  };


  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
            <p className="text-muted-foreground">
              Gestiona tus citas y disponibilidad
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex items-center border rounded-lg p-1 bg-muted/30">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="text-sm"
              >
                Día
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="text-sm"
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="text-sm"
              >
                Mes
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="zen"
                  className="gap-2"
                  disabled={isPastDay(selectedDate) || !isWorkingDay(selectedDate) || isNonWorkingDay(selectedDate)}
                  title={isPastDay(selectedDate) ? 'No puedes crear citas en días pasados' : (!isWorkingDay(selectedDate) || isNonWorkingDay(selectedDate)) ? 'Este día no es laborable' : undefined}
                >
                  <Plus className="h-4 w-4" />
                  Crear
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsNewAppointmentOpen(true)} className="gap-2 cursor-pointer">
                  <CalendarIcon className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Cita</p>
                    <p className="text-xs text-muted-foreground">Agendar una cita con paciente</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <CalendarIcon className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Evento</p>
                    <p className="text-xs text-muted-foreground">Crear un evento en el calendario</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <CheckSquare className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Tarea</p>
                    <p className="text-xs text-muted-foreground">Agregar una tarea pendiente</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Calendar Navigation */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <h2 className="text-xl font-semibold capitalize">
                  {getDateRangeDisplay()}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Zona horaria: PST (UTC-8)</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="text-sm"
              >
                Hoy
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Day View */}
            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                appointments={getAppointmentsForDay(currentDate)}
                getStatusColor={getStatusColor}
                timeSlots={timeSlots}
                isWorkingDay={isWorkingDay(currentDate)}
              />
            )}

            {/* Week View */}
            {viewMode === 'week' && (
              <div className="overflow-x-auto">
                <div className="flex flex-col min-w-[640px]">
                  {/* Week header */}
                  <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-background z-10">
                    <div className="p-3 text-center text-sm text-muted-foreground border-r border-border">
                      Hora
                    </div>
                    {weekDays.map(day => {
                      const working = isWorkingDay(day);
                      const blocked = isNonWorkingDay(day) || !working;
                      const past = isPastDay(day);
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => {
                            if (blocked) return;
                            setCurrentDate(day);
                            setSelectedDate(day);
                            setViewMode('day');
                          }}
                          title={!working ? 'Día no laborable (configuración)' : blocked ? 'Día festivo' : past ? 'Día pasado' : undefined}
                          className={cn(
                            "p-3 text-center transition-colors border-r border-border last:border-r-0 relative",
                            !past && !blocked && "cursor-pointer hover:bg-accent/50",
                            isToday(day) && "bg-primary/5",
                            isSameDay(day, selectedDate) && "bg-accent",
                            (blocked || (past && !isToday(day))) && cn(
                              "opacity-60",
                              blocked ? "bg-red-50/50" : "bg-muted/30"
                            ),
                          )}
                        >
                          <p className={cn("text-xs text-muted-foreground uppercase", blocked && "text-destructive/40")}>
                            {format(day, 'EEE', { locale: es })}
                          </p>
                          <p className={cn(
                            "text-lg font-semibold mt-1",
                            isToday(day) && "text-primary",
                            blocked && "text-destructive/50"
                          )}>
                            {format(day, 'd')}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Time grid with scroll */}
                  <div className="max-h-[500px] overflow-y-auto scrollbar-zen">
                    <div className="min-w-full">
                      {timeSlots.map(hour => {
                        const now = new Date();
                        const currentHour = now.getHours();
                        const currentMinute = now.getMinutes();
                        const isCurrentHour = hour === currentHour;
                        const timeIndicatorPosition = isCurrentHour ? (currentMinute / 60) * 100 : null;

                        return (
                          <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0 relative">
                            <div className="p-2 text-center text-sm text-muted-foreground border-r border-border">
                              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </div>
                            {weekDays.map(day => {
                              const dayAppointments = getAppointmentsForDay(day).filter(
                                apt => parseISO(apt.startTime).getHours() === hour
                              );
                              const isTodayColumn = isToday(day);
                              const showTimeIndicator = isTodayColumn && isCurrentHour && timeIndicatorPosition !== null;

                              const working = isWorkingDay(day);
                              const config = getDayConfig(day);
                              const startH = parseInt(config.inicio.split(':')[0]);
                              const endH = parseInt(config.fin.split(':')[0]);
                              
                              const dayBlocked = isNonWorkingDay(day) || !working;
                              const isOutsideHours = hour < startH || hour > endH;
                              const isPastColumn = isPastDay(day) && !isToday(day);
                              const isPastHour = isToday(day) && hour < new Date().getHours();

                              return (
                                <div
                                  key={`${day.toISOString()}-${hour}`}
                                  className={cn(
                                    "p-1 min-h-[60px] border-r border-border last:border-r-0 transition-colors relative",
                                    !isPastColumn && !isPastHour && !dayBlocked && !isOutsideHours && "hover:bg-accent/30",
                                    isToday(day) && !isPastHour && !dayBlocked && !isOutsideHours && "bg-primary/5",
                                    (isPastColumn || dayBlocked || (working && isOutsideHours)) && "bg-muted/30",
                                    isPastHour && "bg-muted/20"
                                  )}
                                >
                                  {/* Current time indicator */}
                                  {showTimeIndicator && (
                                    <div
                                      className="absolute left-0 right-0 flex items-center z-10"
                                      style={{ top: `${timeIndicatorPosition}%` }}
                                    >
                                      <div className="h-0.5 w-full bg-primary relative">
                                        <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                                      </div>
                                    </div>
                                  )}

                                  {dayAppointments.map(apt => (
                                    <div
                                      key={apt.id}
                                      onClick={() => {
                                        setEditingAppointment(apt);
                                        setIsNewAppointmentOpen(true);
                                      }}
                                      className={cn(
                                        "rounded-lg border p-2 text-xs cursor-pointer transition-all hover:shadow-soft hover:scale-[1.02] space-y-0.5",
                                        getChipStyle(apt),
                                        apt.status === 'cancelled' && 'opacity-60'
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 font-semibold">
                                        {apt.status && STATUS_DOT[apt.status] && (
                                          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', STATUS_DOT[apt.status])} />
                                        )}
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{apt.patientName.split(' ')[0]}</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-75">
                                        <Clock className="h-3 w-3" />
                                        <span>{format(parseISO(apt.startTime), 'h:mm a')}</span>
                                      </div>
                                      {apt.notes && (
                                        <p className="text-[10px] opacity-60 truncate italic mt-0.5">{apt.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Month View */}
            {viewMode === 'month' && (
              <MonthView
                currentDate={currentDate}
                appointments={appointments}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onDayClick={(day) => {
                  setSelectedDate(day);
                  setIsNewAppointmentOpen(true);
                }}
                getStatusColor={getStatusColor}
                isWorkingDay={isWorkingDay}
                isNonWorkingDay={isNonWorkingDay}
                isPastDay={isPastDay}
              />
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-blue-500" /><span className="text-sm text-muted-foreground">Agendada</span></div>
          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-green-500" /><span className="text-sm text-muted-foreground">Confirmada</span></div>
          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-yellow-400" /><span className="text-sm text-muted-foreground">En espera</span></div>
          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-violet-500" /><span className="text-sm text-muted-foreground">Completada</span></div>
          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-red-500" /><span className="text-sm text-muted-foreground">Cancelada</span></div>
        </div>

        {/* New / Edit Appointment Dialog */}
        <NewAppointmentDialog
          open={isNewAppointmentOpen}
          onOpenChange={(open) => {
            setIsNewAppointmentOpen(open);
            if (!open) setEditingAppointment(null);
          }}
          selectedDate={selectedDate}
          onAppointmentAdded={() => {
            fetchAppointments();
            setEditingAppointment(null);
          }}
          editingAppointment={editingAppointment}
        />
      </div>
    </Layout>
  );
};

export default CalendarPage;

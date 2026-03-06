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
import { mockAppointments } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';
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
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import NewAppointmentDialog from '@/components/calendar/NewAppointmentDialog';
import DayView from '@/components/calendar/DayView';
import MonthView from '@/components/calendar/MonthView';

type ViewMode = 'day' | 'week' | 'month';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>(mockAppointments);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
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
      }));
      setAppointments(mapped.length > 0 ? mapped : mockAppointments);
    } catch (error) {
      console.error('Error al cargar citas:', error);
      // Fallback a mock data si hay error de conexión
      setAppointments(mockAppointments);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

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
      case 'pending': return 'bg-warning/20 border-warning/40 text-warning';
      case 'cancelled': return 'bg-destructive/20 border-destructive/40 text-destructive line-through';
      default: return 'bg-muted border-border';
    }
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
                <Button variant="zen" className="gap-2">
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
                    {weekDays.map(day => (
                      <div
                        key={day.toISOString()}
                        onClick={() => {
                          setCurrentDate(day);
                          setSelectedDate(day);
                          setViewMode('day');
                        }}
                        className={cn(
                          "p-3 text-center cursor-pointer transition-colors border-r border-border last:border-r-0 hover:bg-accent/50",
                          isToday(day) && "bg-primary/5",
                          isSameDay(day, selectedDate) && "bg-accent"
                        )}
                      >
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(day, 'EEE', { locale: es })}
                        </p>
                        <p className={cn(
                          "text-lg font-semibold mt-1",
                          isToday(day) && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    ))}
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

                              return (
                                <div
                                  key={`${day.toISOString()}-${hour}`}
                                  className={cn(
                                    "p-1 min-h-[60px] border-r border-border last:border-r-0 transition-colors hover:bg-accent/30 relative",
                                    isToday(day) && "bg-primary/5"
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
                                        "rounded-lg border p-2 text-xs cursor-pointer transition-all hover:shadow-soft hover:scale-[1.02]",
                                        getStatusColor(apt.status)
                                      )}
                                    >
                                      <div className="flex items-center gap-1 font-medium">
                                        <User className="h-3 w-3" />
                                        <span className="truncate">{apt.patientName.split(' ')[0]}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-1 opacity-75">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {format(parseISO(apt.startTime), 'h:mm a')}
                                        </span>
                                      </div>
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
                  setCurrentDate(day);
                  setViewMode('day');
                }}
                getStatusColor={getStatusColor}
              />
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Cancelado</span>
          </div>
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

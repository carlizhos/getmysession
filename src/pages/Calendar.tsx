import Layout from '@/components/Layout';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User
} from 'lucide-react';
import { mockAppointments } from '@/lib/mockData';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks,
  isSameDay,
  parseISO,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 to 19:00

  const getAppointmentsForDay = (date: Date) => {
    return mockAppointments.filter(apt => 
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
          <Button variant="zen" className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </div>

        {/* Calendar Navigation */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
              </h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Week header */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-3 text-center text-sm text-muted-foreground border-r border-border">
                Hora
              </div>
              {weekDays.map(day => (
                <div 
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "p-3 text-center cursor-pointer transition-colors border-r border-border last:border-r-0",
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

            {/* Time grid */}
            <div className="max-h-[500px] overflow-y-auto scrollbar-zen">
              {timeSlots.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
                  <div className="p-2 text-center text-sm text-muted-foreground border-r border-border">
                    {`${hour}:00`}
                  </div>
                  {weekDays.map(day => {
                    const dayAppointments = getAppointmentsForDay(day).filter(
                      apt => parseISO(apt.startTime).getHours() === hour
                    );
                    return (
                      <div 
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          "p-1 min-h-[60px] border-r border-border last:border-r-0 transition-colors hover:bg-accent/30",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        {dayAppointments.map(apt => (
                          <div
                            key={apt.id}
                            className={cn(
                              "rounded-lg border p-2 text-xs cursor-pointer transition-all hover:shadow-soft",
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
                                {format(parseISO(apt.startTime), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
      </div>
    </Layout>
  );
};

export default CalendarPage;

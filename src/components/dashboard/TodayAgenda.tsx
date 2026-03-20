import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export interface AgendaAppointment {
  id: string;
  patientName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'pending' | 'cancelled' | 'completed';
  type: string;
}

interface TodayAgendaProps {
  appointments: AgendaAppointment[];
}

const TodayAgenda = ({ appointments }: TodayAgendaProps) => {
  const getStatusBadge = (status: AgendaAppointment['status']) => {
    const cfg: Record<string, { variant: any, label: string }> = {
      scheduled: { variant: 'default', label: 'Agendado' },
      confirmed: { variant: 'success', label: 'Confirmado' },
      pending: { variant: 'warning', label: 'Pendiente' },
      cancelled: { variant: 'destructive', label: 'Cancelado' },
      completed: { variant: 'secondary', label: 'Completado' },
    };
    const c = cfg[status] || cfg['scheduled'];
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatTime = (dateStr: string) =>
    format(parseISO(dateStr), 'HH:mm', { locale: es });

  return (
    <Card variant="default" className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Agenda de Hoy</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Badge variant="zen" size="lg">
          {appointments.length} citas
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No hay citas programadas para hoy</p>
          </div>
        ) : (
          appointments.map((appointment, index) => (
            <div
              key={appointment.id}
              className={cn(
                'flex items-center gap-4 rounded-xl p-4 transition-all duration-200 hover:bg-accent/50',
                appointment.status === 'cancelled' && 'opacity-60'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Hora */}
              <div className="flex flex-col items-center min-w-[40px]">
                <span className="text-lg font-semibold">{formatTime(appointment.startTime)}</span>
                <span className="text-xs text-muted-foreground">{formatTime(appointment.endTime)}</span>
              </div>

              {/* Barra de color */}
              <div className={cn(
                'h-12 w-1 rounded-full flex-shrink-0',
                appointment.status === 'scheduled' && 'bg-blue-500',
                appointment.status === 'confirmed' && 'bg-success',
                appointment.status === 'pending' && 'bg-warning',
                appointment.status === 'cancelled' && 'bg-destructive',
                appointment.status === 'completed' && 'bg-muted-foreground'
              )} />

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{appointment.patientName}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{appointment.type}</p>
              </div>

              {/* Estado y acción */}
              <div className="flex items-center gap-2">
                {getStatusBadge(appointment.status)}
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default TodayAgenda;

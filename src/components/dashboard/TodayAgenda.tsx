import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, MessageCircle, MoreHorizontal } from 'lucide-react';
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
  phone?: string | null;
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
    <Card variant="glass" className="animate-fade-in border-white/20 dark:border-white/5">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-slate-800 dark:text-slate-100">Agenda de Hoy</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <Badge variant="zen" size="lg" className="bg-primary/10 text-primary border-none">
          {appointments.length} citas
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-slate-500">No hay citas programadas para hoy</p>
          </div>
        ) : (
          appointments.map((appointment, index) => (
            <div
              key={appointment.id}
              className={cn(
                'flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl p-4 transition-all duration-200 border border-transparent hover:border-white/20 hover:bg-white/40 dark:hover:bg-white/5',
                appointment.status === 'cancelled' && 'opacity-60'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-row sm:flex-col items-center justify-between w-full sm:w-auto gap-4 sm:gap-0 sm:min-w-[40px]">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-semibold">{formatTime(appointment.startTime)}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(appointment.endTime)}</span>
                </div>
                
                {/* Mobile-only status color dot */}
                <div className={cn(
                  'block sm:hidden h-3 w-3 rounded-full',
                  appointment.status === 'scheduled' && 'bg-blue-500',
                  appointment.status === 'confirmed' && 'bg-success',
                  appointment.status === 'pending' && 'bg-warning',
                  appointment.status === 'cancelled' && 'bg-destructive',
                  appointment.status === 'completed' && 'bg-muted-foreground'
                )} />
              </div>

              {/* Desktop-only bar */}
              <div className={cn(
                'hidden sm:block h-12 w-1 rounded-full flex-shrink-0',
                appointment.status === 'scheduled' && 'bg-blue-500',
                appointment.status === 'confirmed' && 'bg-success',
                appointment.status === 'pending' && 'bg-warning',
                appointment.status === 'cancelled' && 'bg-destructive',
                appointment.status === 'completed' && 'bg-muted-foreground'
              )} />

              {/* Contenido */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{appointment.patientName}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{appointment.type}</p>
              </div>

              {/* Estado y acción */}
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                {getStatusBadge(appointment.status)}
                <div className="flex items-center gap-1">
                  {appointment.phone && (
                    <a
                      href={`https://wa.me/${appointment.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${appointment.patientName}, te recuerdo tu cita de ${appointment.type} hoy a las ${format(parseISO(appointment.startTime), 'HH:mm')}. ¿Confirmas asistencia?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-success/10 text-success transition-all"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default TodayAgenda;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, LogOut, Loader2, User, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  specialist_name: string;
  specialist_avatar: string | null;
  specialist_prefix: string | null;
  management_token: string;
}

interface PatientSession {
  isLoggedIn: boolean;
  accessToken: string;
  email: string;
  phone: string;
  name: string;
  expiresAt: string;
}

export default function Portal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<PatientSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('saudade_patient_session');
    if (!savedSession) {
      navigate('/portal/login');
      return;
    }

    const parsedSession: PatientSession = JSON.parse(savedSession);
    
    // Check if session is valid
    if (!parsedSession.isLoggedIn || !parsedSession.accessToken) {
      navigate('/portal/login');
      return;
    }

    // Check if token has expired
    if (parsedSession.expiresAt && new Date(parsedSession.expiresAt) < new Date()) {
      localStorage.removeItem('saudade_patient_session');
      toast.error('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
      navigate('/portal/login');
      return;
    }

    setSession(parsedSession);
    fetchAppointments(parsedSession.accessToken);
  }, [navigate]);

  const fetchAppointments = async (accessToken: string) => {
    setLoading(true);
    try {
      // Use secure token-based RPC instead of email/phone
      const { data, error } = await supabase.rpc('get_patient_appointments', {
        p_access_token: accessToken
      });

      if (error) {
        // If token is invalid, redirect to login
        if (error.message.includes('invalid') || error.code === 'PGRST202') {
          localStorage.removeItem('saudade_patient_session');
          navigate('/portal/login');
          return;
        }
        throw error;
      }
      
      // Sort: upcoming first
      const sorted = (data || []).sort((a: Appointment, b: Appointment) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setAppointments(sorted);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      toast.error('Error al cargar tus citas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string, managementToken: string) => {
    if (!session || !confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    
    setCancelingId(id);
    try {
      // Use secure token-based cancellation
      const { data, error } = await supabase.rpc('cancel_patient_appointment', {
        p_appointment_id: id,
        p_token: managementToken
      });

      if (error) throw error;
      
      if (data) {
        toast.success('Cita cancelada con éxito.');
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      } else {
        toast.error('No se pudo cancelar esta cita. El enlace puede haber expirado.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error('No se pudo cancelar la cita.');
      console.error(error);
    } finally {
      setCancelingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('saudade_patient_session');
    navigate('/portal/login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="py-4 bg-white border-b border-border/50 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm tracking-tighter">S.</span>
          </div>
          <span className="font-bold tracking-tight text-lg">Saudade Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-medium">{session.name}</span>
            <span className="text-xs text-muted-foreground">{session.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar Sesión">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Mis Citas</h1>
          <p className="text-muted-foreground">Gestiona tus próximas sesiones y tu historial de atención.</p>
        </div>

        {appointments.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed bg-muted/10 shadow-none">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tienes citas próximas</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Actualmente no encontramos citas bajo este correo electrónico. Si acabas de agendar, puede tardar minutos en aparecer.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map(apt => {
              const dateObj = parseISO(apt.start_time);
              const endObj = parseISO(apt.end_time);
              const isPast = dateObj < new Date() && apt.status !== 'cancelled';
              
              let statusText = 'Confirmada';
              let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
              if (apt.status === 'pending') { statusText = 'Pendiente'; badgeVariant = 'secondary'; }
              if (apt.status === 'cancelled') { statusText = 'Cancelada'; badgeVariant = 'destructive'; }
              if (isPast) { statusText = 'Completada'; badgeVariant = 'outline'; }

              const pName = apt.specialist_prefix && apt.specialist_prefix !== 'none' 
                ? `${apt.specialist_prefix} ${apt.specialist_name}` 
                : apt.specialist_name;

              return (
                <Card key={apt.id} className="rounded-xl overflow-hidden shadow-sm flex flex-col border-border/60">
                  <CardHeader className="p-5 pb-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-primary/5 text-primary p-2 rounded-lg">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <Badge variant={badgeVariant} className="font-medium">{statusText}</Badge>
                    </div>
                    <CardTitle className="text-lg font-bold mb-1">
                      {format(dateObj, "EEEE, d 'de' MMMM", { locale: es })}
                    </CardTitle>
                    <CardDescription className="text-base flex items-center gap-1.5 text-foreground/80">
                      <Clock className="w-4 h-4" />
                      {format(dateObj, "HH:mm")} - {format(endObj, "HH:mm")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-4 flex-1">
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                      {apt.specialist_avatar ? (
                        <img src={apt.specialist_avatar} alt={pName} className="w-10 h-10 rounded-full object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ESPECIALISTA</span>
                        <span className="text-sm font-medium leading-none mt-1">{pName}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  {apt.status !== 'cancelled' && !isPast && (
                    <CardFooter className="p-4 bg-muted/10 border-t border-border/40">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelAppointment(apt.id, apt.management_token)}
                        disabled={cancelingId === apt.id}
                      >
                        {cancelingId === apt.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        Cancelar Cita
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

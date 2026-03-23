import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, addDays, startOfToday, parseISO, isBefore, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, ArrowLeft, Clock, Calendar as CalendarIcon, User, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLogger';

interface SpecialistProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  prefix: string | null;
  horario_atencion: any;
  slug: string;
  current_organization_id: string;
}

const BookingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SpecialistProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Booking state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Date/Time, 2: Info, 3: Success
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [sessionType, setSessionType] = useState('Primera vez');
  const [modality, setModality] = useState('Videollamada');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Specialist Profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, prefix, horario_atencion, slug, current_organization_id')
          .eq('slug', slug)
          .eq('is_public', true)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  // 2. Fetch Available Slots for Selected Date
  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDate || !profile) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const dayOfWeek = selectedDate.getDay();
        const configDia = profile.horario_atencion?.dias?.[dayOfWeek];

        if (!configDia || !configDia.activo) {
          setAvailableSlots([]);
          return;
        }

        // Fetch existing appointments for this date
        const dayStartIso = startOfDay(selectedDate).toISOString();
        const dayEndIso = endOfDay(selectedDate).toISOString();
        const dateStr = format(selectedDate, 'yyyy-MM-dd'); // Kept for current and end below

        const { data: apts, error: rpcError } = await supabase.rpc('get_busy_slots', {
          p_user_id: profile.id,
          p_start_date: dayStartIso,
          p_end_date: dayEndIso
        });
        
        if (rpcError) console.error("Error fetching busy slots via RPC:", rpcError);

        const busySlots = (apts || []).map(a => format(parseISO(a.start_time), 'HH:mm'));

        // Query Edge Function for Google Calendar free/busy
        const gcalBusyRanges: { start: Date, end: Date }[] = [];
        try {
          // Generar ISO strings completos para el día seleccionado en la zona horaria del usuario
          const timeMin = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0).toISOString();
          const timeMax = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1, 0, 0, 0).toISOString();
          
          const { data: gcalData, error: gcalError } = await supabase.functions.invoke('google-calendar-freebusy', {
            body: { slug: profile.slug, timeMin, timeMax }
          });
          
          if (!gcalError && gcalData?.busy) {
            for (const b of gcalData.busy) {
              gcalBusyRanges.push({ start: parseISO(b.start), end: parseISO(b.end) });
            }
          }
        } catch (e) {
          console.error('Error al obtener disponibilidad de Google Calendar:', e);
        }

        // Generate 60-min slots between configDia.inicio and configDia.fin
        const slots: string[] = [];
        let current = parseISO(`${dateStr}T${configDia.inicio}`);
        const end = parseISO(`${dateStr}T${configDia.fin}`);

        while (isBefore(current, end)) {
          const timeStr = format(current, 'HH:mm');
          // Check if it's in the past (if today)
          const isToday = isSameDay(selectedDate, new Date());
          const isPast = isToday && isBefore(current, new Date());
          
          const slotEnd = new Date(current.getTime() + 60 * 60 * 1000); // Add 1 hour
          
          // Verificar colisión con Google Calendar
          const hasGoogleCollision = gcalBusyRanges.some(busy => {
            // Hay traslape si: inicio_slot < fin_busy Y fin_slot > inicio_busy
            return current < busy.end && slotEnd > busy.start;
          });

          if (!busySlots.includes(timeStr) && !isPast && !hasGoogleCollision) {
            slots.push(timeStr);
          }
          current = slotEnd;
        }

        setAvailableSlots(slots);
      } catch (err) {
        console.error('Error loading slots:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [selectedDate, profile]);

  // Helpers
  const isDateDisabled = (date: Date) => {
    if (!profile) return true;
    if (isBefore(date, startOfToday())) return true;
    
    // Check if day is active in settings
    const day = date.getDay();
    const isActivo = profile.horario_atencion?.dias?.[day]?.activo;
    
    // Check non-working days
    const dateStr = format(date, 'yyyy-MM-dd');
    const isNoLaborable = profile.horario_atencion?.dias_no_laborables?.includes(dateStr);

    return !isActivo || isNoLaborable;
  };

  const displayName = profile?.prefix && profile.prefix !== 'none' 
    ? `${profile.prefix} ${profile.full_name}`
    : profile?.full_name;

  // Actions
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      // 1. Create a "lead" or "patient" record ideally, or just save on appointment
      // For this MVP, we save directly to appointment, but we need patient_id.
      // Since it's public, we might want to create a patient if it doesn't exist, or a lead.
      // Let's create a lead first.
      
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          name: patientInfo.name,
          email: patientInfo.email,
          phone: patientInfo.phone,
          source: 'web',
          status: 'nuevo_lead',
          user_id: profile.id,
          organization_id: profile.current_organization_id,
        });
        
      if (leadError) throw leadError;

      const startTime = parseISO(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

      // Sincronizar hacia Google Calendar a través de la Edge Function (y generar Meet si aplica)
      let finalMeetLink = null;
      let finalPlatform = null;

      if (modality === 'Videollamada') {
        finalPlatform = 'Google Meet';
        try {
          const { data, error: syncErr } = await supabase.functions.invoke('google-calendar-sync', {
            body: {
              slug: profile.slug,
              createMeet: true,
              event: {
                summary: `Cita Saudade: ${patientInfo.name}`,
                description: `Teléfono: ${patientInfo.phone}\nCorreo: ${patientInfo.email}\nAgendada desde el Portal Público.`,
                start: { dateTime: startTime.toISOString() },
                end: { dateTime: endTime.toISOString() },
              }
            }
          });
          if (!syncErr && data?.meetLink) {
            finalMeetLink = data.meetLink;
          }
        } catch (err) {
          console.error("Error sincronizando y creando Meet:", err);
        }
      } else {
        // Presencial: sincronizamos asíncronamente en el fondo sin esperar
        supabase.functions.invoke('google-calendar-sync', {
          body: {
            slug: profile.slug,
            event: {
              summary: `Cita Saudade: ${patientInfo.name} (Presencial)`,
              description: `Teléfono: ${patientInfo.phone}\nCorreo: ${patientInfo.email}\nAgendada desde el Portal Público.`,
              start: { dateTime: startTime.toISOString() },
              end: { dateTime: endTime.toISOString() },
            }
          }
        }).catch(err => console.error('Error sincronizando calendario:', err));
      }

      // 2. Create the appointment
      const { error: aptError } = await supabase
        .from('appointments')
        .insert({
          user_id: profile.id,
          patient_name: patientInfo.name, 
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          type: 'primera_vez', 
          fee: 0,
          payment_status: 'pending',
          meeting_platform: finalPlatform,
          meeting_link: finalMeetLink,
          notes: `Reservado desde Portal Público.\nEmail: ${patientInfo.email}\nTeléfono: ${patientInfo.phone}\nModalidad: ${modality}`,
          organization_id: profile.current_organization_id,
        });

      if (aptError) throw aptError;

      // 3. Send Email Notifications
      supabase.functions.invoke('notify-appointment', {
        body: {
          psychologistId: profile.id,
          patientName: patientInfo.name,
          patientEmail: patientInfo.email,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          sessionType: 'primera_vez',
          fee: 0,
          meetingLink: finalMeetLink,
          meetingPlatform: finalPlatform,
          notes: `Reservado desde Portal Público.\nEmail: ${patientInfo.email}\nTeléfono: ${patientInfo.phone}\nModalidad: ${modality}`
        }
      }).catch(err => console.error('Error enviando notificación:', err));

      // 4. Log Activity
      await logActivity({
        profile_id: profile.id,
        type: 'appointment_created',
        title: 'Nueva Cita Agendada',
        description: `${patientInfo.name} ha agendado una sesión el ${format(selectedDate!, "d 'de' MMMM", { locale: es })} a las ${selectedTime}.`,
        organization_id: profile.current_organization_id,
      });

      setStep(3);
    } catch (err: any) {
      toast.error(err?.message || 'Hubo un error al reservar. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md text-center p-8">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <CardTitle className="mb-2">Perfil no encontrado</CardTitle>
          <CardDescription>El enlace parece ser incorrecto o el especialista no ha hecho su perfil público.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-foreground flex flex-col font-sans">
      {/* Top Banner */}
      <header className="py-6 bg-white border-b border-border/50 px-4 md:px-8 flex justify-center sticky top-0 z-10">
        <div className="w-full max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm tracking-tighter">S.</span>
            </div>
            <span className="font-bold tracking-tight text-lg">Saudade</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-4 flex justify-center">
        <Card className="w-full max-w-4xl shadow-xl shadow-black/5 overflow-hidden flex flex-col md:flex-row border-border/60">
          
          {/* Left Panel: Profile Info */}
          <div className="bg-muted/30 p-8 w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border/60 flex flex-col">
            <div className="mb-6">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 rounded-full border shadow-sm object-cover mb-4" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
              )}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cita con</h2>
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            </div>

            <div className="space-y-4 my-8 flex-1">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-5 h-5 flex-shrink-0" />
                <span>Sesión de 60 minutos</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <CalendarIcon className="w-5 h-5 flex-shrink-0" />
                <span>Videollamada o Presencial</span>
              </div>
            </div>

            {step === 2 && (
              <Button variant="ghost" className="justify-start px-0 w-fit text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al calendario
              </Button>
            )}
          </div>

          {/* Right Panel: Interactive Content */}
          <div className="p-8 w-full md:w-2/3 bg-white">
            {step === 1 && (
              <div className="animate-fade-in flex flex-col h-full">
                <h2 className="text-xl font-bold mb-6">Selecciona fecha y hora</h2>
                
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      disabled={isDateDisabled}
                      className="rounded-xl border shadow-sm p-3 w-full max-w-full flex justify-center bg-background"
                      classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                      }}
                    />
                  </div>
                  
                  {selectedDate && (
                    <div className="w-full lg:w-48 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
                      <p className="text-sm font-medium mb-2 text-center sticky top-0 bg-white pb-2">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      
                      {loadingSlots ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-muted/30 rounded-lg border border-dashed border-border">
                          <p className="text-sm text-muted-foreground">No hay horas disponibles este día.</p>
                        </div>
                      ) : (
                        availableSlots.map(time => (
                          <div key={time} className="flex gap-2 w-full animate-fade-in">
                            <Button
                              variant={selectedTime === time ? "default" : "outline"}
                              className={cn(
                                "w-full transition-all duration-200", 
                                selectedTime === time ? "w-1/2 bg-primary hover:bg-primary/90" : ""
                              )}
                              onClick={() => setSelectedTime(time)}
                            >
                              {time}
                            </Button>
                            {selectedTime === time && (
                              <Button 
                                variant="zen" 
                                className="w-1/2 animate-fade-in px-2"
                                onClick={() => setStep(2)}
                              >
                                Siguiente
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in max-w-md mx-auto">
                <h2 className="text-xl font-bold mb-6">Completa tus datos</h2>
                <div className="mb-6 p-4 rounded-xl border bg-muted/20 text-sm font-medium text-muted-foreground">
                  <span className="block text-foreground text-base mb-1">
                    {format(selectedDate!, "EEEE, d 'de' MMMM", { locale: es })} a las {selectedTime}
                  </span>
                  Se confirmará vía correo y WhatsApp (opcional).
                </div>

                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input 
                      id="name" 
                      required 
                      value={patientInfo.name} 
                      onChange={e => setPatientInfo({...patientInfo, name: e.target.value})}
                      placeholder="Ej. Ana García"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      value={patientInfo.email} 
                      onChange={e => setPatientInfo({...patientInfo, email: e.target.value})}
                      placeholder="ana@ejemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono / WhatsApp *</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      required 
                      value={patientInfo.phone} 
                      onChange={e => setPatientInfo({...patientInfo, phone: e.target.value})}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                  <Button type="submit" className="w-full mt-6" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                    ) : (
                      'Confirmar Reserva'
                    )}
                  </Button>
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Reserva Confirmada!</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Se ha enviado una notificación al especialista. {displayName} se pondrá en contacto contigo pronto.
                </p>
                <div className="p-4 rounded-xl border bg-muted/20 w-full max-w-sm text-left">
                  <p className="text-sm text-muted-foreground mb-1">Cuándo</p>
                  <p className="font-semibold mb-3">
                    {format(selectedDate!, "EEEE, d 'de' MMMM, yyyy", { locale: es })} <br/>
                    {selectedTime}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">Especialista</p>
                  <p className="font-semibold">{displayName}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default BookingPage;

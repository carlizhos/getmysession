import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, addDays, startOfToday, parseISO, isBefore, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, ArrowLeft, Clock, Calendar as CalendarIcon, User, CheckCircle2, LayoutGrid, DollarSign, BookOpen, ShieldCheck, Video, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLogger';

interface SpecialistProfile {
  id: string;
  full_name: string;
  prefix: string | null;
  horario_atencion: {
    dias: Record<number, { activo: boolean; inicio: string; fin: string; max_sesiones?: number }>;
    dias_no_laborables: string[];
  } | null;
  slug: string;
  current_organization_id: string;
  porcentaje_consultorio?: number;
  reschedule_policy_hours?: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  commission_percentage?: number | null;
  reschedule_policy_hours?: number | null;
}

interface BookingQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'yes_no' | 'select_one' | 'select_many';
  options: string[];
  is_required: boolean;
  sort_order: number;
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
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [bookingQuestions, setBookingQuestions] = useState<BookingQuestion[]>([]);
  const [bookingAnswers, setBookingAnswers] = useState<Record<string, string | string[]>>({});

  // Form state
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0: Service Selection, 1: Date/Time, 2: Info, 3: Success
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    reason: '',
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
          .select('id, full_name, avatar_url, prefix, horario_atencion, slug, current_organization_id, porcentaje_consultorio, reschedule_policy_hours')
          .eq('slug', slug)
          .eq('is_public', true)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile(data);
          // Fetch services for this profile
          fetchServices(data.id);
          // Fetch booking questions
          fetchBookingQuestions(data.id);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchServices = async (userId: string) => {
      setIsLoadingServices(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name, description, duration, price, color, commission_percentage, reschedule_policy_hours')
          .eq('user_id', userId)
          .eq('is_public', true)
          .eq('active', true)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          setServices(data);
          if (data.length === 1) {
            setSelectedService(data[0]);
            setStep(1);
          } else if (data.length > 1) {
            setStep(0);
          } else {
            setStep(1); // No public services, fall back to default
          }
        } else {
          setStep(1);
        }
      } catch (err) {
        setStep(1);
      } finally {
        setIsLoadingServices(false);
      }
    };

    const fetchBookingQuestions = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('booking_questions')
          .select('id, label, type, options, is_required, sort_order')
          .eq('user_id', userId)
          .eq('active', true)
          .order('sort_order', { ascending: true });
        if (!error && data) {
          setBookingQuestions(data);
        }
      } catch (err) {
        console.error('Error fetching booking questions:', err);
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

        const busySlots = (apts || []).map((a: { start_time: string }) => format(parseISO(a.start_time), 'HH:mm'));
        
        // Count non-cancelled appointments for capacity check
        const { count: nonCancelledCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .neq('status', 'cancelled')
          .gte('start_time', dayStartIso)
          .lte('start_time', dayEndIso);

        // Check Daily Session Limit
        const maxSesiones = configDia.max_sesiones;
        if (maxSesiones != null && maxSesiones > 0) {
          if ((nonCancelledCount || 0) >= maxSesiones) {
            setAvailableSlots([]);
            setLoadingSlots(false);
            return;
          }
        }

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

        // Generate slots based on selected service duration
        const slots: string[] = [];
        let current = parseISO(`${dateStr}T${configDia.inicio}`);
        const end = parseISO(`${dateStr}T${configDia.fin}`);

        while (isBefore(current, end)) {
          const timeStr = format(current, 'HH:mm');
          const duration = selectedService?.duration || 60;
          const slotEnd = new Date(current.getTime() + duration * 60 * 1000);
          
          // Verificar si el slot ya pasó (en el día actual)
          const isPastSlot = isBefore(current, new Date());
          
          // Verificar colisión con Google Calendar
          const hasGoogleCollision = gcalBusyRanges.some(busy => {
            // Hay traslape si: inicio_slot < fin_busy Y fin_slot > inicio_busy
            return current < busy.end && slotEnd > busy.start;
          });

          if (!busySlots.includes(timeStr) && !isPastSlot && !hasGoogleCollision) {
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
          age: patientInfo.age ? parseInt(patientInfo.age) : null,
          reason_for_consultation: patientInfo.reason || null,
          service_id: selectedService?.id || null,
          booking_answers: Object.keys(bookingAnswers).length > 0 ? bookingAnswers : null,
        });
        
      if (leadError) throw leadError;

      const startTime = parseISO(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`);
      const duration = selectedService?.duration || 60;
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      // Sincronizar hacia Google Calendar a través de la Edge Function (y generar Meet si aplica)
      let finalMeetLink = null;
      let finalPlatform = null;
      const appointmentId = crypto.randomUUID();

      if (modality === 'Videollamada') {
        finalPlatform = 'meet';
        try {
          const { data, error: syncErr } = await supabase.functions.invoke('google-calendar-sync', {
            body: {
              slug: profile.slug,
              createMeet: true,
              event: {
                summary: `Cita Saudade: ${patientInfo.name}`,
                description: `Teléfono: ${patientInfo.phone}\nCorreo: ${patientInfo.email}\nEdad: ${patientInfo.age}\nMotivo: ${patientInfo.reason}\nAgendada desde el Portal Público.`,
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

        // Si no se generó enlace de Meet (por ejemplo, Google Calendar no conectado), usar Saudade integrado
        if (!finalMeetLink) {
          finalPlatform = 'saudade';
          finalMeetLink = `${window.location.origin}/join/${appointmentId}`;
        }
      } else {
        // Presencial: sincronizamos asíncronamente en el fondo sin esperar
        supabase.functions.invoke('google-calendar-sync', {
          body: {
            slug: profile.slug,
            event: {
              summary: `Cita Saudade: ${patientInfo.name} (Presencial)`,
              description: `Teléfono: ${patientInfo.phone}\nCorreo: ${patientInfo.email}\nEdad: ${patientInfo.age}\nMotivo: ${patientInfo.reason}\nAgendada desde el Portal Público.`,
              start: { dateTime: startTime.toISOString() },
              end: { dateTime: endTime.toISOString() },
              location: 'Consultorio físico (Dirección por confirmar)',
            }
          }
        }).catch(err => console.error('Error sincronizando agenda:', err));
      }

      // 2. Create the appointment
      let finalCommission = 30;
      if (profile && profile.porcentaje_consultorio !== undefined && profile.porcentaje_consultorio !== null) {
        finalCommission = profile.porcentaje_consultorio;
      }
      if (selectedService && selectedService.commission_percentage !== undefined && selectedService.commission_percentage !== null) {
        finalCommission = selectedService.commission_percentage;
      }

      let finalReschedulePolicy = 24;
      if (profile && profile.reschedule_policy_hours !== undefined && profile.reschedule_policy_hours !== null) {
        finalReschedulePolicy = profile.reschedule_policy_hours;
      }
      if (selectedService && selectedService.reschedule_policy_hours !== undefined && selectedService.reschedule_policy_hours !== null) {
        finalReschedulePolicy = selectedService.reschedule_policy_hours;
      }

      const { error: aptError } = await supabase
        .from('appointments')
        .insert({
          id: appointmentId,
          user_id: profile.id,
          patient_name: patientInfo.name, 
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          type: selectedService?.name || 'primera_vez', 
          fee: selectedService?.price || 0,
          payment_status: 'pending',
          meeting_platform: finalPlatform,
          meeting_link: finalMeetLink,
          notes: `Reservado desde Portal Público.\nServicio: ${selectedService?.name || 'No especificado'}\nEmail: ${patientInfo.email}\nTeléfono: ${patientInfo.phone}\nEdad: ${patientInfo.age}\nMotivo: ${patientInfo.reason}\nModalidad: ${modality}`,
          organization_id: profile.current_organization_id,
          patient_age: patientInfo.age ? parseInt(patientInfo.age) : null,
          reason_for_consultation: patientInfo.reason || null,
          service_id: selectedService?.id || null,
          booking_answers: Object.keys(bookingAnswers).length > 0 ? bookingAnswers : null,
          modality: modality === 'Videollamada' ? 'online' : 'presencial',
          location: modality === 'Videollamada' ? null : 'Consultorio físico (Dirección por confirmar)',
          commission_percentage: finalCommission,
          reschedule_policy_hours: finalReschedulePolicy,
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
          notes: `Reservado desde Portal Público.\nEmail: ${patientInfo.email}\nTeléfono: ${patientInfo.phone}\nEdad: ${patientInfo.age}\nMotivo: ${patientInfo.reason}\nModalidad: ${modality}`
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
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || 'Hubo un error al reservar. Intenta de nuevo.');
      console.error(error);
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
    <div className="min-h-screen text-foreground flex flex-col font-sans">
      {/* Top Banner (Floating Glass Header) */}
      <header className="fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-40 h-14 flex items-center justify-between border border-white/20 backdrop-blur-2xl bg-white/50 px-4 shadow-soft rounded-[16px] sm:rounded-[20px] max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm tracking-tighter">S.</span>
          </div>
          <span className="font-bold tracking-tight text-lg">Saudade</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2 sm:p-4 pt-20 sm:pt-24 flex justify-center w-full mx-auto">
        <Card className="w-full max-w-5xl backdrop-blur-2xl bg-white/50 shadow-elevated overflow-hidden flex flex-col md:flex-row border border-white/30 rounded-[18px] sm:rounded-[24px]">
          
          {/* Left Panel: Profile Info */}
          <div className="p-8 w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/20 flex flex-col bg-white/40">
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
                <span>Sesión de {selectedService?.duration || 60} minutos</span>
              </div>
              {selectedService && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <DollarSign className="w-5 h-5 flex-shrink-0" />
                  <span>{selectedService.name} — ${selectedService.price}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted-foreground">
                <CalendarIcon className="w-5 h-5 flex-shrink-0" />
                <span>Videollamada o Presencial</span>
              </div>
            </div>

            {(step === 1 && services.length > 1) && (
              <Button variant="ghost" className="justify-start px-0 w-fit text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cambiar servicio
              </Button>
            )}

            {step === 2 && (
              <Button variant="ghost" className="justify-start px-0 w-fit text-muted-foreground hover:text-foreground hover:bg-transparent" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a la agenda
              </Button>
            )}
          </div>

          {/* Right Panel: Interactive Content */}
          <div className="p-8 w-full md:w-2/3 bg-white/60">
            {step === 0 && (
              <div className="animate-fade-in flex flex-col h-full">
                <h2 className="text-xl font-bold mb-6">Selecciona el tipo de servicio</h2>
                <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep(1);
                      }}
                      className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all group",
                        "hover:border-primary/50 hover:bg-primary/5",
                        "border-border/40 bg-white/40 shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                        {
                          'bg-violet-500/10 text-violet-600': service.color === 'violet',
                          'bg-blue-500/10 text-blue-600': service.color === 'blue',
                          'bg-emerald-500/10 text-emerald-600': service.color === 'green',
                          'bg-amber-500/10 text-amber-600': service.color === 'amber',
                          'bg-rose-500/10 text-rose-600': service.color === 'rose',
                          'bg-indigo-500/10 text-indigo-600': service.color === 'indigo',
                        }
                      )}>
                        <LayoutGrid className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{service.name}</h3>
                          <span className="text-sm font-bold text-primary">${service.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                          {service.description || 'Sesión de terapia personalizada.'}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                            <Clock className="h-3 w-3" /> {service.duration} min
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                            <BookOpen className="h-3 w-3" /> Online/Presencial
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                      className="rounded-xl border shadow-sm p-3 w-full max-w-full flex justify-center glass border-white/20"
                      classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                      }}
                    />
                  </div>
                  
                  {selectedDate && (
                    <div className="w-full lg:w-48 flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar animate-fade-in">
                      <p className="text-sm font-medium mb-2 text-center sticky top-0 bg-white/60 backdrop-blur-md pb-2 z-10 rounded-t-md">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      
                      {loadingSlots ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-white/40 rounded-lg border border-dashed border-white/40">
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
                <div className="mb-6 p-4 rounded-xl border glass border-white/20 text-sm font-medium text-muted-foreground">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="age">Edad</Label>
                      <Input 
                        id="age" 
                        type="number" 
                        value={patientInfo.age} 
                        onChange={e => setPatientInfo({...patientInfo, age: e.target.value})}
                        placeholder="Ej. 25"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Modalidad de la sesión *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setModality('Videollamada')}
                        className={cn(
                          "flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all shadow-sm",
                          modality === 'Videollamada'
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white/40 border-border/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <Video className="w-4 h-4" />
                        Videollamada
                      </button>
                      <button
                        type="button"
                        onClick={() => setModality('Presencial')}
                        className={cn(
                          "flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all shadow-sm",
                          modality === 'Presencial'
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white/40 border-border/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <MapPin className="w-4 h-4" />
                        Presencial
                      </button>
                    </div>
                    {modality === 'Presencial' && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        La dirección física se te enviará automáticamente en la confirmación.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo de consulta</Label>
                    <textarea 
                      id="reason" 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={patientInfo.reason} 
                      onChange={e => setPatientInfo({...patientInfo, reason: e.target.value})}
                      placeholder="Cuéntanos brevemente el motivo de tu consulta"
                    />
                  </div>

                  {/* Dynamic Booking Questions */}
                  {bookingQuestions.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border/30">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preguntas adicionales</p>
                      {bookingQuestions.map((q) => (
                        <div key={q.id} className="space-y-2">
                          <Label htmlFor={`bq-${q.id}`}>
                            {q.label} {q.is_required && <span className="text-destructive">*</span>}
                          </Label>

                          {q.type === 'text' && (
                            <Input
                              id={`bq-${q.id}`}
                              required={q.is_required}
                              value={(bookingAnswers[q.id] as string) || ''}
                              onChange={e => setBookingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Tu respuesta..."
                            />
                          )}

                          {q.type === 'textarea' && (
                            <textarea
                              id={`bq-${q.id}`}
                              required={q.is_required}
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value={(bookingAnswers[q.id] as string) || ''}
                              onChange={e => setBookingAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Tu respuesta..."
                            />
                          )}

                          {q.type === 'yes_no' && (
                            <div className="flex gap-2">
                              {['Sí', 'No'].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setBookingAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  className={cn(
                                    "flex-1 h-10 rounded-lg border text-sm font-medium transition-all",
                                    bookingAnswers[q.id] === opt
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-background border-input text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'select_one' && q.options.length > 0 && (
                            <div className="space-y-1.5">
                              {q.options.map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setBookingAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  className={cn(
                                    "flex items-center gap-2.5 w-full p-2.5 px-3 rounded-lg border text-sm text-left transition-all",
                                    bookingAnswers[q.id] === opt
                                      ? "bg-primary/5 border-primary text-primary font-medium"
                                      : "bg-background border-input text-muted-foreground hover:border-primary/30"
                                  )}
                                >
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                                    bookingAnswers[q.id] === opt ? "border-primary" : "border-border"
                                  )}>
                                    {bookingAnswers[q.id] === opt && <div className="h-2 w-2 rounded-full bg-primary" />}
                                  </div>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'select_many' && q.options.length > 0 && (
                            <div className="space-y-1.5">
                              {q.options.map(opt => {
                                const selected = Array.isArray(bookingAnswers[q.id]) && (bookingAnswers[q.id] as string[]).includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setBookingAnswers(prev => {
                                        const current = Array.isArray(prev[q.id]) ? [...prev[q.id] as string[]] : [];
                                        if (current.includes(opt)) {
                                          return { ...prev, [q.id]: current.filter(v => v !== opt) };
                                        } else {
                                          return { ...prev, [q.id]: [...current, opt] };
                                        }
                                      });
                                    }}
                                    className={cn(
                                      "flex items-center gap-2.5 w-full p-2.5 px-3 rounded-lg border text-sm text-left transition-all",
                                      selected
                                        ? "bg-primary/5 border-primary text-primary font-medium"
                                        : "bg-background border-input text-muted-foreground hover:border-primary/30"
                                    )}
                                  >
                                    <div className={cn(
                                      "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center",
                                      selected ? "border-primary bg-primary" : "border-border"
                                    )}>
                                      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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
              <div className="relative animate-fade-in flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-0 right-0 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary hover:text-white hover:shadow-medium transition-all duration-300 px-6 scale-100 hover:scale-105 active:scale-95"
                  onClick={() => window.location.href = 'https://saudade.mx'}
                >
                  Salir
                </Button>
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Reserva Confirmada!</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Se ha enviado una notificación al especialista. {displayName} se pondrá en contacto contigo pronto.
                </p>
                <div className="p-4 rounded-xl border glass border-white/20 w-full max-w-sm text-left">
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

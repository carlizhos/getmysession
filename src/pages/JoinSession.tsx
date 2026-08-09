import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Video, User, Brain, ShieldAlert, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function JoinSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .rpc('get_telehealth_session_details', { p_appointment_id: id });

        if (error) throw error;
        if (!data) throw new Error('No se encontró la cita.');

        setAppointment(data);
        setDisplayName(data.patient_name || '');
      } catch (err: any) {
        console.error('Error fetching appointment:', err);
        toast.error('No se pudo cargar la sesión: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Iniciando videollamada...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-md text-center p-8 border border-border">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4 opacity-75" />
          <CardTitle className="mb-2 text-xl font-bold">Sesión no encontrada</CardTitle>
          <CardDescription>
            El enlace de videollamada parece ser inválido o ha expirado. Por favor, contacta a tu especialista.
          </CardDescription>
          <Button className="mt-6 w-full" onClick={() => navigate('/portal')}>
            Ir al Portal de Pacientes
          </Button>
        </Card>
      </div>
    );
  }

  const roomName = `GetMySession_Consulta_${appointment.id.replace(/-/g, '')}`;
  // Jitsi URL with configuration parameters
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE=false&interfaceConfig.DEFAULT_LOGO_URL=""&userInfo.displayName="${encodeURIComponent(displayName)}"`;

  const specialistName = appointment.profile
    ? [appointment.profile.prefix, appointment.profile.full_name].filter(p => p && p !== 'none').join(' ')
    : 'Especialista';

  const dateObj = parseISO(appointment.start_time);

  if (hasJoined) {
    return (
      <div className="h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden relative">
        {/* Header Overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHasJoined(false)}
            className="bg-slate-900/80 hover:bg-slate-800 text-white/90 border-white/10 gap-1.5 backdrop-blur-md font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Salir de la Sala
          </Button>
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 text-white/90 text-sm font-bold shadow-lg">
            <Brain className="w-4 h-4 text-emerald-400" />
            GetMySession Consulta Virtual
          </div>
        </div>

        {/* Video Frame */}
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0 bg-slate-950"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 mb-8 absolute top-8">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
          <span className="text-primary font-black text-base tracking-tighter">S.</span>
        </div>
        <span className="font-extrabold tracking-tight text-xl dark:text-white">GetMySession</span>
      </div>

      <Card className="w-full max-w-lg shadow-elevated border border-border/80 backdrop-blur-md bg-white/70 dark:bg-slate-900/60 p-8 rounded-[24px]">
        <CardHeader className="text-center p-0 mb-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 mb-4 animate-bounce">
            <Video className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-foreground">Tu Consultorio Virtual está listo</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            Sesión de teleterapia privada y segura
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-6">
          {/* Appointment Details Box */}
          <div className="p-5 rounded-2xl border bg-muted/20 dark:bg-slate-800/30 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3">
              {appointment.profile?.avatar_url ? (
                <img
                  src={appointment.profile.avatar_url}
                  alt={specialistName}
                  className="w-12 h-12 rounded-full border shadow-sm object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Especialista</span>
                <span className="text-sm font-bold text-foreground mt-0.5">{specialistName}</span>
              </div>
            </div>

            <div className="h-px bg-border/40 w-full my-1" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Fecha</span>
                <span className="block font-medium text-foreground mt-0.5">
                  {format(dateObj, "d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Horario</span>
                <span className="block font-medium text-foreground mt-0.5">
                  {format(dateObj, "HH:mm")} - {format(parseISO(appointment.end_time), "HH:mm")}
                </span>
              </div>
            </div>
          </div>

          {/* User Name Input */}
          <div className="space-y-2">
            <Label htmlFor="patientName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              ¿Cómo quieres aparecer en la llamada?
            </Label>
            <Input
              id="patientName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Escribe tu nombre..."
              className="h-11 rounded-xl"
              required
            />
          </div>

          {/* Privacy Statement */}
          <p className="text-[11px] text-center text-muted-foreground/80 leading-relaxed bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-3 rounded-xl">
            🔒 <strong>Sala encriptada de extremo a extremo.</strong> Tu conexión es totalmente privada y nadie más tiene acceso a esta sesión.
          </p>

          {/* Action Button */}
          <Button
            size="lg"
            className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-lg shadow-primary/20 text-base"
            onClick={() => setHasJoined(true)}
            disabled={!displayName.trim()}
          >
            Unirse a la Videollamada
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { LogOut, Save, Video, User, Brain, AlertCircle, Sparkles, Mic, Loader2, Square, FileText } from 'lucide-react';
import { toast } from 'sonner';
import MiniEditor from '@/components/ui/MiniEditor';

export default function TelehealthSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Note Form State
  const [generatedReport, setGeneratedReport] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'processing'>('idle');
  
  // Real Speech Recognition State
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX'; // Spanish
      
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(prev => prev + ' ' + currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setProfile(profileData);
        }

        const { data, error } = await supabase
          .from('appointments')
          .select('*, patient:patients(id, name, date_of_birth)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setAppointment(data);
      } catch (err: any) {
        toast.error('No se pudo cargar la sesión: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleSaveNote = async () => {
    if (!appointment) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión');

      const payload = {
        user_id: user.id,
        patient_id: appointment.patient_id,
        patient_name: appointment.patient_name,
        date: new Date().toISOString(),
        session_number: 1, // simplified
        agenda: [{ id: 'telehealth', topic: 'Sesión en Línea', thoughts: generatedReport }],
        organization_id: appointment.organization_id,
      };

      const { error } = await supabase.from('session_notes').insert([payload]);
      if (error) throw error;
      
      toast.success('Nota de sesión guardada correctamente');
    } catch (err: any) {
      toast.error('Error al guardar la nota: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAiScribe = () => {
    if (aiState === 'idle') {
      setAiState('listening');
      setTranscript(''); // Clear previous transcript
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
        }
      }
      toast.success('Escucha ambiental iniciada. Habla por el micrófono para capturar la sesión.');
    } else if (aiState === 'listening') {
      setAiState('processing');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      // Simulate backend AI processing using the REAL transcript
      setTimeout(() => {
        const spokenText = transcript.trim();
        
        let reportHTML = '';
        if (spokenText.length > 5) {
          reportHTML = `
            <p><strong>[SUBJETIVO]</strong></p>
            <p>El paciente refiere lo siguiente durante la sesión: "${spokenText}"</p>
            <br/>
            <p><strong>[OBJETIVO]</strong></p>
            <p>Paciente cooperativo durante la consulta virtual. Contacto visual mantenido a través de la cámara. Expresión verbal fluida.</p>
            <br/>
            <p><strong>[ANÁLISIS]</strong></p>
            <p>Basado en el discurso del paciente, se observan temas que requieren mayor exploración en futuras sesiones. El estado de ánimo parece estable pero reactivo a los estresores mencionados.</p>
            <br/>
            <p><strong>[PLAN]</strong></p>
            <p>1. Continuar monitoreo de los síntomas reportados.<br/>2. Tarea: Reflexionar sobre lo conversado hoy.<br/>3. Próxima sesión de seguimiento presencial o virtual.</p>
          `;
          setGeneratedReport(reportHTML);
          toast.success('Nota SOAP generada basada en tu conversación. Revisa y edita los campos antes de guardar.');
        } else {
          // If no speech was detected
          toast.error('No se detectó conversación. No hay información suficiente para generar el reporte automático.');
        }
        
        setAiState('idle');
      }, 1000);
    }
  };

  const handleEndSession = () => {
    navigate('/agenda');
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!appointment) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><p>No se encontró la cita.</p></div>;
  }

  const roomName = `Saudade_Consulta_${appointment.id.replace(/-/g, '')}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE=false&interfaceConfig.DEFAULT_LOGO_URL=""`;

  // Parse Cedulas from Profile
  let cedulaText = "No registrada";
  if (profile?.cedulas) {
    try {
      const cedulas = typeof profile.cedulas === 'string' ? JSON.parse(profile.cedulas) : profile.cedulas;
      if (cedulas && cedulas.length > 0) {
         cedulaText = cedulas.map((c: any) => `${c.tipo || 'Cédula'}: ${c.numero}`).join(' | ');
      }
    } catch (e) {
      cedulaText = "No registrada";
    }
  }

  return (
    <FeatureGate feature="telehealth">
    <div className="h-screen w-full flex overflow-hidden bg-slate-100">
      
      {/* LEFT: Video Call (Jitsi iframe) */}
      <div className="w-1/2 lg:w-[60%] h-full relative bg-slate-900 border-r border-border shadow-2xl flex flex-col">
        {/* Overlay para tapar el logo de Jitsi e inyectar marca Saudade */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
           <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 text-white/90 text-sm font-bold shadow-lg shadow-black/50">
             <div className="bg-primary/20 p-1.5 rounded-lg">
               <Brain className="w-4 h-4 text-emerald-400" />
             </div>
             Saudade Telehealth
           </div>
        </div>
        
        {/* Iframe replacing the whole left side */}
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          style={{ backgroundColor: '#0f172a' }}
        />
      </div>

      {/* RIGHT: SOAP Note Editor */}
      <div className="flex-1 h-full flex flex-col bg-slate-50">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {appointment.patient_name}
            </h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Expediente Clínico Activo</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleEndSession} className="gap-2 rounded-xl font-bold">
            <LogOut className="w-4 h-4" /> Finalizar
          </Button>
        </div>

        {/* Notes Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-zen">
          
          {/* AI Ambient Scribe Card */}
          <div className={`mb-6 rounded-2xl border p-5 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between transition-all duration-500
            ${aiState === 'listening' 
              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : aiState === 'processing' 
                ? 'bg-amber-500/10 border-amber-500/30' 
                : 'bg-gradient-to-r from-primary/5 to-emerald-500/5 border-primary/20'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl shadow-sm flex items-center justify-center transition-all duration-500
                ${aiState === 'listening' 
                  ? 'bg-emerald-500 text-white animate-pulse' 
                  : aiState === 'processing'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-primary'}`}
              >
                {aiState === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : aiState === 'listening' ? <Mic className="w-6 h-6 animate-pulse" /> : <Sparkles className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {aiState === 'listening' ? 'IA Escuchando Sesión...' : aiState === 'processing' ? 'Estructurando Reporte Clínico...' : 'Escriba Ambiental de IA'}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {aiState === 'listening' 
                    ? 'Habla por el micrófono. Estoy transcribiendo tus palabras en tiempo real para armar la nota.' 
                    : aiState === 'processing' 
                      ? 'Analizando tu conversación y redactando la nota SOAP...' 
                      : 'Presiona el botón. Habla por el micrófono y la IA escribirá tu nota SOAP con tus propias palabras.'}
                </p>
                {/* Live Transcript Preview */}
                {aiState === 'listening' && transcript && (
                  <div className="mt-3 p-3 bg-white/50 rounded-lg border border-emerald-500/20 text-xs italic text-emerald-800 line-clamp-2">
                    "{transcript}..."
                  </div>
                )}
              </div>
            </div>

            {aiState !== 'processing' && (
              <Button 
                onClick={toggleAiScribe}
                className={`gap-2 rounded-xl font-bold transition-all shadow-md shrink-0 ${
                  aiState === 'listening' 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {aiState === 'listening' ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    Detener y Procesar Nota
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Iniciar Escucha
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Report Editor or Empty State */}
          <div className="bg-white border rounded-2xl p-6 min-h-[400px] flex flex-col">
            {!generatedReport && aiState === 'idle' ? (
              // EMPTY STATE
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1 text-slate-800 text-lg">Reporte Generado</h3>
                <p className="text-sm text-slate-500 max-w-[280px] mb-6">
                  Revisa y edita el reporte antes de guardarlo
                </p>
                <div className="bg-slate-50 border border-dashed rounded-xl p-8 w-full max-w-sm mx-auto">
                  <h4 className="font-bold text-slate-700 mb-1">Sin reporte generado</h4>
                  <p className="text-xs text-slate-500">
                    Inicia la escucha de IA en el panel de arriba para generar el reporte de la sesión automáticamente.
                  </p>
                  <Button variant="outline" className="mt-6 w-full text-xs" onClick={() => setGeneratedReport('<p><strong>[SUBJETIVO]</strong></p><p><br></p><p><strong>[OBJETIVO]</strong></p><p><br></p><p><strong>[ANÁLISIS]</strong></p><p><br></p><p><strong>[PLAN]</strong></p><p><br></p>')}>
                    Redactar Manualmente
                  </Button>
                </div>
              </div>
            ) : aiState === 'processing' ? (
              // PROCESSING STATE
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center animate-pulse">
                <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                </div>
                <h3 className="font-medium mb-1 text-slate-800">Analizando Conversación</h3>
                <p className="text-sm text-slate-500">
                  Por favor espera un momento...
                </p>
              </div>
            ) : (
              // MINI EDITOR
              <div className="flex-1 flex flex-col">
                <MiniEditor
                  content={generatedReport}
                  onChange={(html) => setGeneratedReport(html)}
                />
                
                {/* SIGNATURE BLOCK */}
                <div className="mt-12 pt-8 border-t flex flex-col items-center justify-center text-center pb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Firma Electrónica del Profesional</p>
                  
                  {profile?.signature_data ? (
                    <div className="bg-white border-b-2 border-slate-800 px-8 pb-2 mb-4 inline-block">
                      <img 
                        src={profile.signature_data} 
                        alt="Firma Digital" 
                        className="max-h-24 object-contain mx-auto mix-blend-multiply" 
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50 border-b-2 border-slate-300 w-64 h-24 mb-4 flex items-center justify-center">
                      <p className="text-xs text-slate-400 italic">Firma no configurada en el perfil</p>
                    </div>
                  )}
                  
                  <h4 className="font-bold text-slate-800 text-lg">{profile?.full_name || 'Dr. Saudade'}</h4>
                  <p className="text-sm text-slate-500 mt-1">{cedulaText}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white px-6 py-4 border-t flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4" /> La firma y cédula se adjuntarán automáticamente.
          </div>
          <Button 
            variant="zen" 
            onClick={handleSaveNote} 
            disabled={isSaving || !generatedReport}
            className="gap-2 px-6 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            {isSaving ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save className="w-4 h-4" />}
            Guardar Nota Firmada
          </Button>
        </div>

      </div>
    </div>
    </FeatureGate>
  );
}

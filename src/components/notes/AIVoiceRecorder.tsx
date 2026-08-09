import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIVoiceRecorderProps {
  onCancel: () => void;
  onSuccess: (mockText: string) => void;
}

const MOCK_SOAP_NOTE = `[SUBJETIVO]
El paciente reporta sentirse "abrumado y con una presión constante en el pecho" durante la última semana. Menciona haber experimentado un episodio de pánico en el supermercado el día martes, lo que lo llevó a abandonar sus compras. Refiere dificultad para conciliar el sueño (duerme aprox. 4 horas).

[OBJETIVO]
Durante la sesión, el paciente muestra inquietud motora (movimiento constante de las manos). Contacto visual intermitente. Tono de voz acelerado al describir el episodio del supermercado. Afecto congruente con ansiedad.

[ANÁLISIS]
Los síntomas reportados (presión en el pecho, insomnio, evitación de lugares públicos tras el ataque de pánico) son consistentes con el Trastorno de Pánico con agorafobia incipiente. Se observa una leve mejora en la identificación de detonantes comparado con la sesión anterior.

[PLAN]
1. Se entrenó al paciente en técnica de respiración diafragmática (4-7-8) para uso preventivo.
2. Tarea: Completar el Registro de Pensamientos Automáticos (RPA) cuando experimente síntomas de ansiedad antes de salir de casa.
3. Próxima sesión en 7 días para revisar el RPA y continuar con psicoeducación sobre la ansiedad.`;

export default function AIVoiceRecorder({ onCancel, onSuccess }: AIVoiceRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'success'>('idle');
  const [time, setTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio visualization simulation
  const [audioLevel, setAudioLevel] = useState(0);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'recording') {
      interval = setInterval(() => setTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  // Audio simulation logic when recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'recording') {
      interval = setInterval(() => {
        // Random level between 20 and 100 for visualizer
        setAudioLevel(Math.floor(Math.random() * 80) + 20);
      }, 150);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState('recording');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('No se pudo acceder al micrófono. Por favor, revisa los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setState('processing');
      
      // Simulate processing time (3 seconds)
      setTimeout(() => {
        setState('success');
        
        // After 1.5 seconds of success state, trigger completion
        setTimeout(() => {
          onSuccess(MOCK_SOAP_NOTE);
        }, 1500);
      }, 3000);
    }
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  return (
    <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2rem] overflow-hidden p-8 flex flex-col items-center text-center relative max-w-lg mx-auto animate-in zoom-in-95 duration-500">
      
      <button 
        onClick={handleCancel}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-6 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
        <Sparkles className="w-3.5 h-3.5" />
        Inteligencia Artificial
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">Dictado por Voz</h2>
      
      <p className="text-slate-500 text-sm mb-10 max-w-[280px]">
        {state === 'idle' && 'Habla sobre la sesión. GetMySession redactará una nota SOAP perfecta automáticamente.'}
        {state === 'recording' && 'Te estamos escuchando...'}
        {state === 'processing' && 'Analizando y estructurando tu nota clínica...'}
        {state === 'success' && '¡Nota estructurada con éxito!'}
      </p>

      {/* Main Mic Interface */}
      <div className="relative mb-12 flex justify-center items-center">
        {/* Pulsing Background when recording */}
        {state === 'recording' && (
          <>
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ transform: 'scale(1.5)' }} />
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" style={{ transform: 'scale(2)', animationDelay: '0.2s' }} />
          </>
        )}

        <button
          onClick={state === 'idle' ? startRecording : stopRecording}
          disabled={state === 'processing' || state === 'success'}
          className={cn(
            "relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl",
            state === 'idle' ? "bg-primary hover:bg-primary/90 hover:scale-105 text-white" : "",
            state === 'recording' ? "bg-red-500 text-white animate-pulse" : "",
            state === 'processing' ? "bg-slate-100 text-primary" : "",
            state === 'success' ? "bg-emerald-500 text-white" : ""
          )}
        >
          {state === 'idle' && <Mic className="w-10 h-10" />}
          {state === 'recording' && <Square className="w-8 h-8 fill-current" />}
          {state === 'processing' && <Loader2 className="w-10 h-10 animate-spin" />}
          {state === 'success' && <CheckCircle2 className="w-10 h-10" />}
        </button>

        {/* Visualizer bars when recording */}
        {state === 'recording' && (
          <div className="absolute -bottom-8 flex items-end gap-1 h-6">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-primary rounded-full transition-all duration-150"
                style={{ height: `${Math.max(20, Math.random() * audioLevel)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="text-3xl font-mono text-slate-800 tracking-tight font-medium">
        {formatTime(time)}
      </div>
    </div>
  );
}

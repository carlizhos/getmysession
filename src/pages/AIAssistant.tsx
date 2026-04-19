import Layout from '@/components/Layout';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MiniEditor from '@/components/ui/MiniEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Upload,
  Camera,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  Image,
  X,
  Copy,
  Download,
  Brain,
  ScanText,
  BookOpen,
  Send,
  User,
  Bot,
  Mic,
  MicOff,
  Edit3,
  Plus,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
// pdfjs-dist and mammoth are loaded dynamically in processFile() to avoid bundling ~1.5MB on page load
import DOMPurify from 'dompurify';
import { reportFormats } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';

// Configure PDF.js worker
// PDF.js worker is configured lazily when a PDF is first processed

// Helper function to detect file type
const getFileType = (file: File): 'image' | 'pdf' | 'text' | 'docx' => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (ext === 'txt' || file.type === 'text/plain') return 'text';
  if (ext === 'docx' || ext === 'doc' || file.type.includes('wordprocessingml') || file.type.includes('msword')) return 'docx';
  return 'text';
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Helper: build patient context string from Supabase ────────────────────────
async function buildPatientContext(patientId: string): Promise<string> {
  const [{ data: patient }, { data: notes }] = await Promise.all([
    supabase
      .from('patients')
      .select('name, date_of_birth, birth_date, sex, occupation, notes, status, tags, curp')
      .eq('id', patientId)
      .single(),
    supabase
      .from('session_notes')
      .select('date, session_number, bridge, agenda, cie10_code, cie10_description, diagnostico_principal')
      .eq('patient_id', patientId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(5),
  ]);

  if (!patient) return '';

  const sexLabel = patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : patient.sex || 'No especificado';
  const dob = patient.birth_date || patient.date_of_birth;
  const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
  const statusMap: Record<string, string> = {
    primer_contacto: 'Primer Contacto', cita_agendada: 'Cita Agendada',
    evaluacion_inicial: 'Evaluación Inicial', en_tratamiento: 'En Tratamiento', alta: 'Alta',
  };

  let ctx = `=== EXPEDIENTE DEL PACIENTE ===\n`;
  ctx += `Nombre: ${patient.name}\n`;
  if (age) ctx += `Edad: ${age} años\n`;
  ctx += `Sexo: ${sexLabel}\n`;
  if (patient.occupation) ctx += `Ocupación: ${patient.occupation}\n`;
  ctx += `Etapa clínica: ${statusMap[patient.status] || patient.status}\n`;
  if (patient.notes) ctx += `Notas generales: ${patient.notes}\n`;
  if (patient.tags?.length) ctx += `Etiquetas: ${patient.tags.join(', ')}\n`;

  if (notes && notes.length > 0) {
    ctx += `\n=== ÚLTIMAS ${notes.length} NOTA(S) CLÍNICA(S) ===\n`;
    notes.forEach((n, i) => {
      ctx += `\n--- Sesión ${n.session_number || i + 1} (${n.date}) ---\n`;
      if (n.cie10_code) ctx += `Diagnóstico CIE-10: ${n.cie10_code} - ${n.cie10_description || ''}\n`;
      if (n.diagnostico_principal) ctx += `Diagnóstico principal: ${n.diagnostico_principal}\n`;
      const bridge = n.bridge as any;
      if (bridge?.notes) ctx += `Notas puente: ${bridge.notes}\n`;
      const agenda = n.agenda as any[];
      if (agenda?.length) {
        agenda.forEach((a: any) => {
          if (a.interventions) ctx += `Intervenciones: ${a.interventions}\n`;
          if (a.thoughts) ctx += `Observaciones: ${a.thoughts}\n`;
        });
      }
    });
  } else {
    ctx += `\nSin notas clínicas previas registradas.\n`;
  }

  return ctx;
}

const AIAssistant = () => {
  const { organization } = useOrganization();
  // ── Shared tab state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'notas' | 'chat'>('notas');

  // ── Note generation state ──────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [bulletPoints, setBulletPoints] = useState('');
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [fileProcessingStep, setFileProcessingStep] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [patientContext, setPatientContext] = useState<string | null>(null);
  const [isFetchingContext, setIsFetchingContext] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const patientSearchRef = useRef<HTMLInputElement>(null);

  // ── Dictation state ────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const toggleDictation = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    
    // Lazy initialize to avoid SSR issues or premature blocking
    if (!recognitionRef.current) {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast.error("Tu navegador no soporta el dictado por voz. Usa Chrome o Edge.", {
          position: 'top-center'
        });
        return;
      }
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX'; // Soporte en español

      recognition.onstart = () => {
        setIsListening(true);
        toast.success("Micrófono activado. Puedes empezar a hablar.", { icon: <Mic className="h-4 w-4" /> });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
            toast.error(`Error en el micrófono: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (final) {
          setBulletPoints(prev => prev + (prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '') + final);
        }
        setInterimTranscript(interim);
      };

      recognitionRef.current = recognition;
    }
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      // In case it was already started but states got out of sync
      recognitionRef.current.stop();
      setTimeout(() => recognitionRef.current.start(), 100);
    }
  };

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Scroll chat to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Fetch context for note generation tab ─────────────────────────────────
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  useEffect(() => {
    if (!selectedPatientId) { 
      setPatientContext(null); 
      setChatMessages([]);
      return; 
    }
    setIsFetchingContext(true);
    setChatMessages([]);
    buildPatientContext(selectedPatientId)
      .then(ctx => {
        setPatientContext(ctx);
        // Welcome message with patient info
        if (activeTab === 'chat') {
          setChatMessages([{
            role: 'assistant',
            content: `Hola. He cargado el expediente de **${selectedPatientName}**. Puedes preguntarme sobre su historial, pedirme sugerencias de técnicas, análisis de progreso o cualquier consulta clínica relacionada con este paciente.`,
          }]);
        }
      })
      .catch(err => console.error('Error fetching patient context:', err))
      .finally(() => setIsFetchingContext(false));
  }, [selectedPatientId, selectedPatientName]);



  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      toast.error("No se pudo acceder a la cámara. Verifique los permisos.");
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) { handleFile(new File([blob], "foto_nota.jpg", { type: "image/jpeg" })); stopCamera(); }
        }, 'image/jpeg');
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  }, []);

  const handleFile = (file: File) => { setUploadedFile(file); processFile(file); };

  const processFile = async (file: File) => {
    setIsProcessing(true); setBulletPoints('');
    const fileType = getFileType(file);
    setFileProcessingStep('Iniciando procesamiento...');
    try {
      let extractedText = '';
      switch (fileType) {
        case 'image':
          setFileProcessingStep('Extrayendo texto con OCR...');
          await new Promise(r => setTimeout(r, 300));
          const worker = await createWorker('spa');
          const ret = await worker.recognize(file);
          await worker.terminate();
          extractedText = ret.data.text;
          break;
        case 'pdf':
          setFileProcessingStep('Cargando lector de PDF...');
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          setFileProcessingStep('Extrayendo texto de PDF...');
          const pdfBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
          const textParts: string[] = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            let lastY = -1, lines: string[] = [], line = '';
            content.items.forEach((item: any) => {
              const y = item.transform[5];
              if (lastY !== -1 && Math.abs(y - lastY) > 5) { if (line.trim()) lines.push(line.trim()); line = item.str; }
              else { line += (line ? ' ' : '') + item.str; }
              lastY = y;
            });
            if (line.trim()) lines.push(line.trim());
            textParts.push(lines.join('\n'));
          }
          extractedText = textParts.join('\n\n');
          break;
        case 'text':
          setFileProcessingStep('Leyendo archivo de texto...');
          await new Promise(r => setTimeout(r, 300));
          extractedText = await file.text();
          break;
        case 'docx':
          setFileProcessingStep('Cargando lector de Word...');
          const mammothLib = await import('mammoth');
          setFileProcessingStep('Extrayendo texto de documento Word...');
          const docBuffer = await file.arrayBuffer();
          const htmlResult = await mammothLib.default.convertToHtml({ arrayBuffer: docBuffer });
          const sanitizedHtml = DOMPurify.sanitize(htmlResult.value, { ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'], ALLOWED_ATTR: [] });
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = sanitizedHtml;
          tempDiv.querySelectorAll('p').forEach(p => { p.innerHTML = p.innerHTML + '\n'; });
          tempDiv.querySelectorAll('br').forEach(br => { br.replaceWith('\n'); });
          extractedText = tempDiv.textContent || tempDiv.innerText || '';
          break;
      }
      if (!extractedText.trim()) { toast.warning("No se detectó texto en el archivo."); return; }
      setBulletPoints(extractedText);
      toast.success("Texto extraído correctamente", { icon: <CheckCircle2 className="h-4 w-4" /> });
      setDetectedFormat('tcc-clasica'); setSelectedFormat('tcc-clasica');
      setFileProcessingStep('');
    } catch (error: any) {
      toast.error("Error al procesar archivo: " + error.message);
      setFileProcessingStep('');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReport = async () => {
    if (!bulletPoints.trim()) { toast.error("Por favor ingresa puntos de la sesión o sube una nota."); return; }
    setIsProcessing(true); setGeneratedReport(null); setProcessingStep('Iniciando procesamiento con IA...');
    try {
      setProcessingStep('Analizando puntos de sesión...');
      await new Promise(r => setTimeout(r, 500));
      setProcessingStep('Generando formato SOAP profesional...');
      const { data, error } = await supabase.functions.invoke('process-clinical-note', {
        body: { text: bulletPoints, action: 'generate_soap', patient_context: patientContext || undefined }
      });
      if (error) throw new Error(error.message || 'Error al generar reporte');
      setProcessingStep('Finalizando reporte...');
      await new Promise(r => setTimeout(r, 300));
      setGeneratedReport(data.report); setProcessingStep('');
      toast.success("Reporte SOAP generado con IA", { icon: <Sparkles className="h-4 w-4" /> });
    } catch (error: any) {
      toast.error("Error al generar reporte: " + error.message); setProcessingStep('');
    } finally { setIsProcessing(false); }
  };

  const clearAll = () => {
    setUploadedFile(null); setBulletPoints(''); setGeneratedReport(null);
    setDetectedFormat(null); setSelectedFormat(''); setSelectedPatientId('');
    setSelectedPatientName(''); setPatientContext(null);
    setChatMessages([]);
    
    // Focus clinical search after small timeout to ensure DOM is ready
    setTimeout(() => {
      patientSearchRef.current?.focus();
    }, 100);
  };

  const handleSave = async () => {
    if (!generatedReport) return;
    if (!selectedPatientId) { toast.error('Selecciona un paciente antes de guardar la nota'); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');
      const format = selectedFormat || detectedFormat || 'SOAP';
      const reportText = generatedReport.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      const { error } = await supabase.from('session_notes').insert({
        user_id: user.id, patient_id: selectedPatientId, patient_name: selectedPatientName,
        date: new Date().toISOString().split('T')[0], session_number: 1, mood: {},
        bridge: { items: [], notes: bulletPoints },
        agenda: [{ topic: format, situation: '', thoughts: reportText, emotions: '', interventions: '' }],
        beliefs: {}, action_plan: [],
        organization_id: organization?.id,
      });
      if (error) throw error;
      toast.success(`Nota guardada en el expediente de ${selectedPatientName}`);
      clearAll();
    } catch (error: any) { toast.error('Error al guardar la nota: ' + error.message); }
  };

  // ── Chat send ──────────────────────────────────────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    if (!selectedPatientId) { toast.error('Selecciona un paciente primero'); return; }

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-clinical-note', {
        body: {
          action: 'chat',
          patient_context: patientContext,
          messages: newMessages,
        }
      });
      if (error) throw new Error(error.message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      toast.error('Error al consultar IA: ' + err.message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Hubo un error al procesar tu consulta. Intenta de nuevo.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight">IA Asistente</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Genera notas clínicas y consulta el expediente con IA</p>
            </div>
          </div>

          {/* Right: Global Patient Selector & Actions */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 mt-4 lg:mt-0">
            <div className="w-full sm:w-72 relative group">
              <PatientAutocomplete
                ref={patientSearchRef}
                value={selectedPatientId}
                onSelect={(id, name) => { 
                  setSelectedPatientId(id); 
                  setSelectedPatientName(name); 
                }}
              />
              {selectedPatientId && (
                <button 
                  onClick={() => { setSelectedPatientId(''); setSelectedPatientName(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors z-10"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Button 
              variant="zen" 
              className="w-full sm:w-auto gap-2 shadow-soft hover:scale-[1.02] transition-all"
              onClick={clearAll}
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Nota</span>
            </Button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="notas" className="flex-1 sm:flex-none gap-2">
              <FileText className="h-4 w-4" />
              Generar Nota
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-1 sm:flex-none gap-2">
              <Bot className="h-4 w-4" />
              Consultar Paciente
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Generar Nota ───────────────────────────────────────── */}
          <TabsContent value="notas" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Input */}
              <div className="space-y-6">
                {/* Upload Zone */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="text-lg">Subir Nota</CardTitle>
                    <CardDescription>Arrastra una imagen, PDF o documento de texto</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      className={cn(
                        "drop-zone flex flex-col items-center justify-center p-8 text-center min-h-[200px] transition-all duration-300 ease-out",
                        isDragging && "border-primary border-4 bg-primary/10 ring-4 ring-primary/20 scale-[1.02] shadow-xl animate-pulse-soft"
                      )}
                    >
                      {uploadedFile ? (
                        <div className="flex flex-col items-center animate-scale-in">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mb-4">
                            {getFileType(uploadedFile) === 'image' ? <Image className="h-8 w-8 text-success" /> : <FileText className="h-8 w-8 text-success" />}
                          </div>
                          <p className="font-medium">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setUploadedFile(null)}>
                            <X className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        </div>
                      ) : isCameraOpen ? (
                        <div className="relative w-full h-full flex flex-col items-center">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-[300px] object-cover rounded-lg mb-4 bg-black" />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="flex gap-2">
                            <Button variant="destructive" size="sm" onClick={stopCamera}>Cancelar</Button>
                            <Button variant="default" size="sm" onClick={capturePhoto}><Camera className="h-4 w-4 mr-2" />Capturar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="font-medium">Arrastra tu archivo aquí</p>
                          <p className="text-sm text-muted-foreground mt-1">Imágenes, PDF, TXT, DOC, DOCX</p>
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                              <Image className="h-4 w-4 mr-2" />Seleccionar
                            </Button>
                            <Button variant="outline" size="sm" onClick={startCamera}>
                              <Camera className="h-4 w-4 mr-2" />Cámara
                            </Button>
                          </div>
                        </>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Bullet Points */}
                <Card variant="default">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-lg">Puntos de la Sesión</CardTitle>
                        <CardDescription>Ingresa los puntos clave o edita el texto extraído</CardDescription>
                    </div>
                    <Button 
                        variant={isListening ? "destructive" : "outline"}
                        size="sm"
                        onClick={toggleDictation}
                        className={cn("gap-2 shadow-sm transition-all duration-300", isListening && "animate-pulse-soft ring-4 ring-destructive/20")}
                    >
                        {isListening ? (
                            <><MicOff className="h-4 w-4" /> Detener grabación</>
                        ) : (
                            <><Mic className="h-4 w-4 text-primary" /> Dictar con voz</>
                        )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {patientContext && !isFetchingContext && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium text-primary">Contexto clínico cargado</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          La nota SOAP se personalizará con el historial de <strong>{selectedPatientName}</strong>.
                        </p>
                      </div>
                    )}

                    <div className="relative">
                      <Textarea
                        placeholder={"• Paciente reporta mejora en síntomas...\n• Técnicas aplicadas...\n• Próximos pasos..."}
                        value={bulletPoints} onChange={(e) => setBulletPoints(e.target.value)}
                        className={cn("min-h-[150px] resize-none whitespace-pre-wrap transition-colors", 
                            isListening && "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
                        )}
                      />
                      {isListening && (
                          <div className="absolute -bottom-6 left-0 text-xs italic text-primary animate-pulse">
                              Escuchando... {interimTranscript}
                          </div>
                      )}
                    </div>

                    {detectedFormat && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 animate-fade-in">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm">Formato detectado: <strong>{detectedFormat}</strong></span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Formato del Reporte</label>
                      <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                        <SelectTrigger><SelectValue placeholder="Selecciona un formato o usa el detectado" /></SelectTrigger>
                        <SelectContent>
                          {reportFormats.map(format => (
                            <SelectItem key={format.value} value={format.value}>
                              <div className="flex flex-col">
                                <span>{format.label}</span>
                                <span className="text-xs text-muted-foreground">{format.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button variant="zen" className="w-full gap-2" onClick={generateReport} disabled={!bulletPoints || isProcessing}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generar Reporte
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Generated Report */}
              <div>
                <Card variant="zen" className="sticky top-24 min-h-[500px]">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Reporte Generado</CardTitle>
                      <CardDescription>Revisa y edita el reporte antes de guardarlo</CardDescription>
                    </div>
                    {generatedReport && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          const text = generatedReport.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                          navigator.clipboard.writeText(text); toast.success('Reporte copiado al portapapeles');
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          const text = generatedReport.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                          const blob = new Blob([text], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `reporte_clinico_${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                          toast.success('Reporte descargado');
                        }}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {generatedReport ? (
                      <div className="animate-fade-in space-y-4">
                        <div className="flex items-center gap-2 px-1 mb-2">
                          <Edit3 className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Edita el reporte antes de guardarlo</span>
                        </div>
                        <MiniEditor
                          content={generatedReport}
                          onChange={(html) => setGeneratedReport(html)}
                        />
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" className="flex-1" onClick={clearAll}>Limpiar</Button>
                          <Button variant="zen" className="flex-1" onClick={handleSave}>Guardar en Expediente</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium mb-1">Sin reporte generado</h3>
                        <p className="text-sm text-muted-foreground max-w-[250px]">
                          Sube una imagen o escribe los puntos de la sesión para generar un reporte
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 2: Consultar Paciente ─────────────────────────────────── */}
          <TabsContent value="chat" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              {/* Left: Patient selector */}
              <div className="space-y-4">
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Seleccionar Paciente
                    </CardTitle>
                    <CardDescription>
                      La IA tendrá acceso al expediente completo para responder tus consultas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isFetchingContext && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                        Cargando expediente...
                      </div>
                    )}

                    {selectedPatientId && !isFetchingContext && (
                      <div className="rounded-lg bg-success/5 border border-success/20 p-3 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                          <span className="text-sm font-medium text-success">Expediente cargado</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Historial clínico de <strong>{selectedPatientName}</strong> disponible para la IA.
                        </p>
                      </div>
                    )}


                    {!selectedPatientId && (
                      <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground text-center space-y-1">
                        <BookOpen className="h-6 w-6 mx-auto opacity-40 mb-2" />
                        <p>Selecciona un paciente en la cabecera para comenzar</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Suggestions */}
                {patientContext && (
                  <Card variant="default">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Sugerencias de preguntas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        '¿Cuál es el progreso clínico del paciente?',
                        '¿Qué técnicas TCC recomiendas para la próxima sesión?',
                        '¿Hay patrones recurrentes en las notas?',
                        '¿Qué aspectos debo reforzar en el plan de tratamiento?',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setChatInput(suggestion)}
                          className="w-full text-left text-xs p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Chat */}
              <Card variant="default" className="flex flex-col min-h-[600px]">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    {selectedPatientName ? `Consulta sobre ${selectedPatientName}` : 'Chat Clínico IA'}
                  </CardTitle>
                  <CardDescription>
                    {selectedPatientName
                      ? 'La IA responde usando únicamente la información del expediente del paciente'
                      : 'Seleccione un paciente en la parte superior para comenzar'}
                  </CardDescription>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && !selectedPatientId && (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Brain className="h-8 w-8 text-primary opacity-60" />
                      </div>
                      <h3 className="font-medium mb-1">Sin paciente seleccionado</h3>
                      <p className="text-sm text-muted-foreground max-w-[260px]">
                        Elige un paciente en la cabecera para consultar su expediente con IA
                      </p>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'assistant' && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted/60 text-foreground rounded-tl-sm'
                      )}>
                        {msg.content.split('**').map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1.5 items-center h-5">
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </CardContent>

                {/* Input */}
                <div className="border-t border-border/50 p-4">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder={selectedPatientId ? "Escribe tu consulta... (Enter para enviar, Shift+Enter para nueva línea)" : "Selecciona un paciente en la parte superior para comenzar"}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      disabled={!selectedPatientId || isChatLoading}
                      rows={2}
                      className="resize-none flex-1"
                    />
                    <Button
                      variant="zen"
                      size="icon"
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || !selectedPatientId || isChatLoading}
                      className="flex-shrink-0"
                    >
                      {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* File Processing Modal */}
      {isProcessing && fileProcessingStep && !processingStep && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-primary/20">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <ScanText className="h-10 w-10 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Procesando archivo</h3>
              <p className="text-muted-foreground text-sm mb-6">{fileProcessingStep}</p>
              <div className="w-full bg-primary/20 rounded-full h-2 overflow-hidden mb-6">
                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Processing Modal */}
      {isProcessing && processingStep && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-primary/20">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Brain className="h-10 w-10 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Procesando con IA</h3>
              <p className="text-muted-foreground text-sm mb-6">{processingStep}</p>
              <div className="w-full bg-primary/20 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" style={{ width: '75%' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AIAssistant;

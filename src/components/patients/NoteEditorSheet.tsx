import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Save,
  X,
  Sparkles,
  FileText,
  Loader2,
  Download,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import MiniEditor from '@/components/ui/MiniEditor';
import { SessionNote } from '@/types';
import { useOrganization } from '@/hooks/useOrganization';
import { generateSessionNotePDF } from '@/lib/generateExpedientePDF';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface NoteEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  note: SessionNote | null;
  patientId: string;
  patientName: string;
  patientDOB?: string;
  initialMode: 'manual' | 'ai';
  onNoteUpdated: () => void;
}

export default function NoteEditorSheet({
  isOpen,
  onClose,
  note,
  patientId,
  patientName,
  patientDOB,
  initialMode,
  onNoteUpdated,
}: NoteEditorSheetProps) {
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  
  // Note data states
  const [editorContent, setEditorContent] = useState('');
  const [bulletPoints, setBulletPoints] = useState('');
  const [cie10Code, setCie10Code] = useState('');
  const [cie10Description, setCie10Description] = useState('');
  const [diagnosticoPrincipal, setDiagnosticoPrincipal] = useState('');
  
  // UX states
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  
  // AI Refinement states
  const [aiRefinePrompt, setAiRefinePrompt] = useState('');
  const [isRefiningAI, setIsRefiningAI] = useState(false);

  // Synchronize with selected note
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (note) {
        // Load manual editor text (from agenda[0].thoughts or fallback to transcript_summary)
        const thoughtsText = note.agenda?.[0]?.thoughts || note.transcript_summary || '';
        setEditorContent(thoughtsText);
        setBulletPoints(note.bridge?.notes || '');
        setCie10Code(note.cie10_code || '');
        setCie10Description(note.cie10_description || '');
        setDiagnosticoPrincipal(note.diagnostico_principal || '');
      } else {
        // Clear for new note
        setEditorContent('');
        setBulletPoints('');
        setCie10Code('');
        setCie10Description('');
        setDiagnosticoPrincipal('');
      }
    }
  }, [isOpen, note, initialMode]);

  // Fetch patient clinical context for better AI analysis
  const fetchPatientContext = async (): Promise<string> => {
    if (!organization?.id) return '';
    try {
      const [{ data: patient }, { data: prevNotes }] = await Promise.all([
        supabase
          .from('patients')
          .select('name, date_of_birth, birth_date, gender, occupation, status, tags, curp, patient_clinical_data(notes)')
          .eq('id', patientId)
          .eq('organization_id', organization.id)
          .single(),
        supabase
          .from('session_notes')
          .select('date, session_number, bridge, agenda, cie10_code, cie10_description, diagnostico_principal')
          .eq('patient_id', patientId)
          .eq('organization_id', organization.id)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .limit(3),
      ]);

      if (!patient) return '';

      const dob = patient.birth_date || patient.date_of_birth;
      const age = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

      let ctx = `=== EXPEDIENTE DEL PACIENTE ===\n`;
      ctx += `Nombre: ${patient.name}\n`;
      if (age) ctx += `Edad: ${age} años\n`;
      ctx += `Género: ${patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : patient.gender || 'No especificado'}\n`;
      
      const clinicalNotes = patient.patient_clinical_data?.[0]?.notes;
      if (clinicalNotes) ctx += `Notas generales: ${clinicalNotes}\n`;

      if (prevNotes && prevNotes.length > 0) {
        ctx += `\n=== ÚLTIMAS NOTAS CLÍNICAS ===\n`;
        prevNotes.forEach((n: any, i: number) => {
          ctx += `\n--- Sesión ${n.session_number || i + 1} (${n.date}) ---\n`;
          if (n.diagnostico_principal) ctx += `Diagnóstico: ${n.diagnostico_principal}\n`;
          const thoughtsText = n.agenda?.[0]?.thoughts || n.transcript_summary;
          if (thoughtsText) ctx += `Resumen: ${thoughtsText.slice(0, 300)}...\n`;
        });
      }
      return ctx;
    } catch (e) {
      console.error('Error fetching patient context:', e);
      return '';
    }
  };

  // Generate note using Supabase Edge Function
  const handleGenerateAI = async () => {
    if (!bulletPoints.trim()) {
      toast.error('Por favor escribe algunos puntos clave de la sesión.');
      return;
    }

    setIsProcessingAI(true);
    try {
      const patientContext = await fetchPatientContext();
      
      const { data, error } = await supabase.functions.invoke('process-clinical-note', {
        body: {
          text: bulletPoints,
          action: 'generate_soap',
          patient_context: patientContext,
        },
      });

      if (error) throw error;

      if (data?.report) {
        setEditorContent(data.report);
        if (data.cie10) setCie10Code(data.cie10);
        if (data.diagnostico) setDiagnosticoPrincipal(data.diagnostico);
        
        toast.success('Reporte clínico estructurado generado', {
          icon: <Sparkles className="h-4 w-4 text-primary animate-pulse" />,
        });
        
        // Auto switch to manual tab for review
        setActiveTab('manual');
      } else {
        throw new Error('No se recibió el reporte generado de la IA');
      }
    } catch (err: any) {
      console.error('Error generating AI report:', err);
      toast.error('Error al generar con IA: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Refine note using Writing Tools
  const handleRefineAI = async (instruction: string) => {
    if (!instruction.trim()) return;
    if (!editorContent.trim()) {
      toast.error('No hay contenido en el editor para refinar.');
      return;
    }

    setIsRefiningAI(true);
    try {
      let finalInstruction = instruction;
      if (instruction === 'Hacer más formal / clínico') {
        finalInstruction = 'Reescribe el reporte clínico para hacerlo más formal, técnico y profesional, utilizando terminología psicológica precisa y estructuración impecable.';
      } else if (instruction === 'Corregir ortografía y redacción') {
        finalInstruction = 'Corrige errores ortográficos, de puntuación, concordancia y gramática, sin alterar el contenido clínico ni eliminar información relevante.';
      } else if (instruction === 'Resumir nota') {
        finalInstruction = 'Resume este reporte clínico manteniendo la esencia de cada sección SOAP de forma muy sintética y clara.';
      } else {
        finalInstruction = `Modifica el reporte aplicando esta instrucción: "${instruction}". Mantén la coherencia del resto del texto.`;
      }

      const { data, error } = await supabase.functions.invoke('process-clinical-note', {
        body: {
          text: finalInstruction,
          action: 'refine_note',
          patient_context: editorContent,
        },
      });

      if (error) throw error;

      if (data?.report) {
        setEditorContent(data.report);
        setAiRefinePrompt('');
        toast.success('Nota refinada con IA', {
          icon: <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
        });
      } else {
        throw new Error('No se recibió la nota refinada');
      }
    } catch (err: any) {
      console.error('Error refining note with AI:', err);
      toast.error('Error al refinar nota: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsRefiningAI(false);
    }
  };

  // Save changes to Supabase
  const handleSave = async () => {
    if (!editorContent.trim()) {
      toast.error('El reporte clínico no puede estar vacío.');
      return;
    }

    if (!organization?.id) {
      toast.error('Contexto de organización no disponible.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión de usuario inactiva');

      const updatedAgenda = note?.agenda ? [...note.agenda] : [];
      if (updatedAgenda.length === 0) {
        updatedAgenda.push({
          id: '',
          topic: 'Reporte Clínico',
          situation: '',
          thoughts: editorContent,
          emotions: '',
          interventions: '',
        });
      } else {
        updatedAgenda[0] = { ...updatedAgenda[0], thoughts: editorContent };
      }

      const notePayload = {
        transcript_summary: editorContent,
        cie10_code: cie10Code || null,
        cie10_description: cie10Description || null,
        diagnostico_principal: diagnosticoPrincipal || null,
        bridge: { notes: bulletPoints },
        agenda: updatedAgenda,
      };

      if (note?.id) {
        // Update existing note
        const { error } = await supabase
          .from('session_notes')
          .update(notePayload)
          .eq('id', note.id);

        if (error) throw error;
        toast.success('Nota clínica actualizada correctamente');
      } else {
        // Create new note
        // 1. Get next session number
        const { data: lastNotes } = await supabase
          .from('session_notes')
          .select('session_number')
          .eq('patient_id', patientId)
          .eq('organization_id', organization.id)
          .order('session_number', { ascending: false })
          .limit(1);

        const nextSession = (lastNotes?.[0]?.session_number || 0) + 1;

        const { error } = await supabase
          .from('session_notes')
          .insert({
            ...notePayload,
            patient_id: patientId,
            organization_id: organization.id,
            session_number: nextSession,
            date: new Date().toISOString().split('T')[0],
          });

        if (error) throw error;
        toast.success('Nueva nota clínica guardada en el expediente');
      }

      onNoteUpdated();
      onClose();
    } catch (err: any) {
      console.error('Error saving note:', err);
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!note) return;
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, prefix, cedulas, signature_data')
        .eq('id', user.id)
        .single();

      generateSessionNotePDF(
        { name: patientName, id: patientId, date_of_birth: patientDOB },
        { ...note, transcript_summary: editorContent, cie10_code: cie10Code, diagnostico_principal: diagnosticoPrincipal } as any,
        prof || undefined
      );
      toast.success('Reporte PDF descargado con éxito');
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      toast.error('Error al generar PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Format note date nicely
  const getNoteDateFormatted = () => {
    if (!note?.date) return 'Nueva Nota';
    try {
      return format(parseISO(note.date), "d 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return note.date;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full bg-background border-l border-border p-0 shadow-elevated">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/80 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="space-y-1">
            <SheetTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {note ? `Edición de Nota` : 'Nueva Nota Clínica'}
            </SheetTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Paciente: <span className="text-foreground font-semibold">{patientName}</span>
              {note && ` • Sesión ${note.session_number || 1} (${getNoteDateFormatted()})`}
            </p>
          </div>
          <div className="flex items-center gap-2 pr-6">
            {note && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 rounded-xl"
                onClick={handleExportPDF}
                disabled={isExporting}
                title="Exportar Reporte PDF"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-slate-500" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 rounded-xl"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Tab Controls / Navigation */}
        <div className="px-6 py-4 bg-muted/20 border-b border-border/50">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'manual' | 'ai')}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50">
              <TabsTrigger
                value="manual"
                className="flex items-center gap-2 rounded-xl text-xs font-semibold py-2 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Edición Manual
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="flex items-center gap-2 rounded-xl text-xs font-semibold py-2 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Asistente de IA
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Sheet Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-zen">
          {activeTab === 'manual' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* AI Writing Tools Panel */}
              <div className="bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-primary/5 border border-primary/10 p-4 rounded-2xl space-y-3 shadow-sm relative overflow-hidden animate-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
                  <span>Herramientas de Escritura con IA</span>
                </div>
                
                {/* Custom Instruction Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Instrucción libre (ej: 'traduce a tono TCC', 'añade que asistió puntual')"
                    value={aiRefinePrompt}
                    onChange={(e) => setAiRefinePrompt(e.target.value)}
                    disabled={isRefiningAI || !editorContent.trim()}
                    className="bg-white rounded-xl text-xs h-9 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRefineAI(aiRefinePrompt);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="zen"
                    disabled={isRefiningAI || !aiRefinePrompt.trim() || !editorContent.trim()}
                    onClick={() => handleRefineAI(aiRefinePrompt)}
                    className="h-9 px-4 rounded-xl text-xs font-bold shrink-0 shadow-sm"
                  >
                    {isRefiningAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
                  </Button>
                </div>
                
                {/* Quick Action Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    disabled={isRefiningAI || !editorContent.trim()}
                    onClick={() => handleRefineAI('Hacer más formal / clínico')}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ✨ Profesionalizar
                  </button>
                  <button
                    type="button"
                    disabled={isRefiningAI || !editorContent.trim()}
                    onClick={() => handleRefineAI('Corregir ortografía y redacción')}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    📝 Corregir Redacción
                  </button>
                  <button
                    type="button"
                    disabled={isRefiningAI || !editorContent.trim()}
                    onClick={() => handleRefineAI('Resumir nota')}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    📊 Resumir
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Reporte Clínico
                </label>
                <div className="relative min-h-[350px] border border-border rounded-2xl overflow-hidden bg-white shadow-soft focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  {isRefiningAI && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                      <div className="relative h-12 w-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10">
                        <Sparkles className="h-6 w-6 text-violet-500 animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 animate-pulse">Aplicando herramientas de escritura...</p>
                    </div>
                  )}
                  <MiniEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    className="min-h-[350px] p-4 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Diagnostic Fields Accordion */}
              <div className="border border-border/80 rounded-2xl bg-white shadow-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-widest opacity-80">
                      Diagnóstico y Códigos CIE-10
                    </span>
                  </div>
                  {showDiagnosticPanel ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </button>

                {showDiagnosticPanel && (
                  <div className="p-5 border-t border-border/60 bg-slate-50/20 space-y-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Código CIE-10
                        </label>
                        <Input
                          value={cie10Code}
                          onChange={(e) => setCie10Code(e.target.value)}
                          placeholder="Ej. F41.1"
                          className="bg-white rounded-xl text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Descripción CIE-10
                        </label>
                        <Input
                          value={cie10Description}
                          onChange={(e) => setCie10Description(e.target.value)}
                          placeholder="Ej. Trastorno de ansiedad generalizada"
                          className="bg-white rounded-xl text-xs h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Diagnóstico Principal
                      </label>
                      <Input
                        value={diagnosticoPrincipal}
                        onChange={(e) => setDiagnosticoPrincipal(e.target.value)}
                        placeholder="Ej. Ansiedad generalizada exacerbada por estrés laboral"
                        className="bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10 p-5 rounded-2xl">
                <div className="flex items-center gap-2 text-primary font-bold text-sm mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span>¿Cómo funciona el Asistente de IA?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingresa las ideas clave de la sesión en el recuadro inferior (notas sueltas, temas tratados, observaciones rápidas). La IA se encargará de darle estructura clínica profesional, generar diagnósticos probables y redactar el reporte final en formato SOAP.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  Notas Clave o Puntos de la Sesión
                </label>
                <Textarea
                  value={bulletPoints}
                  onChange={(e) => setBulletPoints(e.target.value)}
                  placeholder="Ej: Paciente asiste a sesión manifestando alto nivel de estrés debido a sobrecarga laboral. Presenta insomnio secundario de conciliación. Se aplica técnica de reestructuración cognitiva y se sugieren técnicas de higiene del sueño..."
                  className="min-h-[180px] bg-white border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                />
              </div>

              <Button
                type="button"
                variant="zen"
                onClick={handleGenerateAI}
                disabled={isProcessingAI}
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-primary/10"
              >
                {isProcessingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando reporte clínico...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generar Reporte con IA
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl h-10 px-5 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            variant="zen"
            onClick={handleSave}
            disabled={isSaving || isProcessingAI}
            className="rounded-xl h-10 px-6 font-bold shadow-md shadow-primary/15 transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}

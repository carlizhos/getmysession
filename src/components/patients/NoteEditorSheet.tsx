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

interface DiffPart {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  id: string;
}

function getSentenceDiff(original: string, modified: string): DiffPart[] {
  const cleanText = (html: string) => {
    return html
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '') // Strip remaining HTML
      .replace(/\s+/g, ' ')
      .trim();
  };

  const origClean = cleanText(original);
  const modClean = cleanText(modified);

  const origSentences = origClean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const modSentences = modClean.split(/(?<=[.!?])\s+/).filter(Boolean);

  const n = origSentences.length;
  const m = modSentences.length;

  const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origSentences[i - 1] === modSentences[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffPart[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origSentences[i - 1] === modSentences[j - 1]) {
      result.unshift({
        type: 'unchanged',
        text: origSentences[i - 1],
        id: `unchanged-${i}-${j}`
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: 'added',
        text: modSentences[j - 1],
        id: `added-${j}-${Math.random().toString(36).substr(2, 4)}`
      });
      j--;
    } else {
      result.unshift({
        type: 'removed',
        text: origSentences[i - 1],
        id: `removed-${i}-${Math.random().toString(36).substr(2, 4)}`
      });
      i--;
    }
  }

  return result;
}

interface NoteEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  note: SessionNote | null;
  patientId: string;
  patientName: string;
  patientDOB?: string;
  initialMode: 'manual' | 'ai';
  onNoteUpdated: () => void;
  /** When true, renders inline within the page instead of as a Sheet overlay */
  inline?: boolean;
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
  inline = false,
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

  // Autosave and Draft states
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Inline AI states
  const [isInlineAIPanelOpen, setIsInlineAIPanelOpen] = useState(false);
  const [inlineAIInstruction, setInlineAIInstruction] = useState('');

  // Interactive Diff states
  const [diffParts, setDiffParts] = useState<DiffPart[] | null>(null);

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
      setIsDirty(false);
    }
  }, [isOpen, note, initialMode]);

  // Check for draft on open
  useEffect(() => {
    if (isOpen) {
      const draftKey = `mindful-flow-draft-${patientId}-${note?.id || 'new'}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          
          const dbThoughts = note?.agenda?.[0]?.thoughts || note?.transcript_summary || '';
          const dbBullet = note?.bridge?.notes || '';
          const dbCieCode = note?.cie10_code || '';
          const dbCieDesc = note?.cie10_description || '';
          const dbDiag = note?.diagnostico_principal || '';
          
          const hasChanges = 
            parsed.editorContent !== dbThoughts ||
            parsed.bulletPoints !== dbBullet ||
            parsed.cie10Code !== dbCieCode ||
            parsed.cie10Description !== dbCieDesc ||
            parsed.diagnosticoPrincipal !== dbDiag;

          if (hasChanges && (parsed.editorContent || parsed.bulletPoints)) {
            setDraftData(parsed);
            setHasDraft(true);
          }
        } catch (e) {
          console.error('Error parsing draft:', e);
        }
      }
    } else {
      setHasDraft(false);
      setDraftData(null);
      setAutosaveStatus('idle');
    }
  }, [isOpen, note, patientId]);

  // Debounced Autosave effect
  useEffect(() => {
    if (!isOpen || !isDirty) return;

    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      const draftKey = `mindful-flow-draft-${patientId}-${note?.id || 'new'}`;
      const payload = {
        editorContent,
        bulletPoints,
        cie10Code,
        cie10Description,
        diagnosticoPrincipal,
        timestamp: Date.now()
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setAutosaveStatus('saved');
    }, 1000);

    return () => clearTimeout(timer);
  }, [editorContent, bulletPoints, cie10Code, cie10Description, diagnosticoPrincipal, isOpen, isDirty, patientId, note]);

  const handleRestoreDraft = () => {
    if (!draftData) return;
    setEditorContent(draftData.editorContent || '');
    setBulletPoints(draftData.bulletPoints || '');
    setCie10Code(draftData.cie10Code || '');
    setCie10Description(draftData.cie10Description || '');
    setDiagnosticoPrincipal(draftData.diagnosticoPrincipal || '');
    setHasDraft(false);
    setIsDirty(true);
    toast.success('Borrador local restaurado');
  };

  const handleDiscardDraft = () => {
    const draftKey = `mindful-flow-draft-${patientId}-${note?.id || 'new'}`;
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setDraftData(null);
    toast.info('Borrador descartado');
  };

  // Shortcut effect for Cmd+J / Ctrl+J
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (activeTab === 'manual') {
          setIsInlineAIPanelOpen((prev) => !prev);
        }
      }
    };
    if (isOpen && activeTab === 'manual') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeTab]);

  const applyFinalText = (parts: DiffPart[]) => {
    const text = parts.map(p => p.text).join(' ');
    const formatted = text
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${p}</p>`)
      .join('');

    setEditorContent(formatted || text);
    setDiffParts(null);
    setIsDirty(true);
  };

  const handleAcceptPart = (id: string) => {
    if (!diffParts) return;
    const updated = diffParts.map(part => {
      if (part.id === id) {
        if (part.type === 'added') {
          return { ...part, type: 'unchanged' as const };
        }
        if (part.type === 'removed') {
          return null;
        }
      }
      return part;
    }).filter(Boolean) as DiffPart[];

    setDiffParts(updated);
    
    const remainingChanges = updated.some(p => p.type === 'added' || p.type === 'removed');
    if (!remainingChanges) {
      applyFinalText(updated);
    }
  };

  const handleRejectPart = (id: string) => {
    if (!diffParts) return;
    const updated = diffParts.map(part => {
      if (part.id === id) {
        if (part.type === 'added') {
          return null;
        }
        if (part.type === 'removed') {
          return { ...part, type: 'unchanged' as const };
        }
      }
      return part;
    }).filter(Boolean) as DiffPart[];

    setDiffParts(updated);

    const remainingChanges = updated.some(p => p.type === 'added' || p.type === 'removed');
    if (!remainingChanges) {
      applyFinalText(updated);
    }
  };

  const handleAcceptAllDiff = () => {
    if (!diffParts) return;
    const finalParts = diffParts.map(part => {
      if (part.type === 'added') return { ...part, type: 'unchanged' as const };
      if (part.type === 'removed') return null;
      return part;
    }).filter(Boolean) as DiffPart[];
    applyFinalText(finalParts);
    toast.success('Todos los cambios sugeridos fueron aplicados');
  };

  const handleRejectAllDiff = () => {
    if (!diffParts) return;
    const finalParts = diffParts.map(part => {
      if (part.type === 'added') return null;
      if (part.type === 'removed') return { ...part, type: 'unchanged' as const };
      return part;
    }).filter(Boolean) as DiffPart[];
    applyFinalText(finalParts);
    toast.info('Cambios de la IA rechazados');
  };

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
        const diff = getSentenceDiff(editorContent, data.report);
        const hasDiffChanges = diff.some(p => p.type === 'added' || p.type === 'removed');
        
        if (hasDiffChanges) {
          setDiffParts(diff);
          toast.info('Revisa los cambios sugeridos por la IA en el editor');
        } else {
          setEditorContent(data.report);
          toast.success('Nota refinada con IA');
        }
        setAiRefinePrompt('');
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

      // Clear local draft on successful save
      const draftKey = `mindful-flow-draft-${patientId}-${note?.id || 'new'}`;
      localStorage.removeItem(draftKey);

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
        .select('full_name, prefix, cedulas, signature_data, logo_data')
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

  // ── Shared inner content (used by both Sheet and inline modes) ──
  const editorHeader = (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {note ? `Edición de Nota` : 'Nueva Nota Clínica'}
        </h2>
        <p className="text-xs text-muted-foreground font-medium">
              Paciente: <span className="text-foreground font-semibold">{patientName}</span>
              {note && ` • Sesión ${note.session_number || 1} (${getNoteDateFormatted()})`}
            </p>
      </div>
      <div className="flex items-center gap-2">
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
          title="Volver al expediente"
        >
          <X className="h-4 w-4 text-slate-500" />
        </Button>
      </div>
    </div>
  );

  const editorTabs = (
    <div className="px-6 py-4 bg-muted/20 border-b border-border/50">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'manual' | 'ai')}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <TabsTrigger
            value="manual"
            className="flex items-center gap-2 rounded-xl text-xs font-semibold py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Edición Manual
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="flex items-center gap-2 rounded-xl text-xs font-semibold py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Asistente de IA
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  const editorBody = (
    <>
      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-zen">
        
        {hasDraft && draftData && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Tienes un borrador sin guardar de esta sesión</h4>
                <p className="text-[10px] text-muted-foreground">
                  Guardado localmente el {draftData.timestamp ? format(new Date(draftData.timestamp), "d 'de' MMMM, h:mm a", { locale: es }) : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button size="sm" variant="ghost" onClick={handleDiscardDraft} className="h-8 text-[10px] font-bold rounded-xl text-slate-500 hover:text-slate-800">
                Descartar
              </Button>
              <Button size="sm" variant="zen" onClick={handleRestoreDraft} className="h-8 text-[10px] font-bold rounded-xl px-4 shadow-sm">
                Restaurar
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'manual' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* AI Writing Tools Panel */}
            <div className="bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-primary/5 border border-primary/10 p-4 rounded-2xl space-y-3 shadow-sm relative overflow-hidden animate-in slide-in-from-top-1 duration-300">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
                <span>Herramientas de Escritura con IA</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Instrucción libre (ej: 'traduce a tono TCC', 'añade que asistió puntual')"
                  value={aiRefinePrompt}
                  onChange={(e) => setAiRefinePrompt(e.target.value)}
                  className="flex-1 h-9 rounded-xl border-primary/15 bg-white/70 dark:bg-slate-800/70 text-xs placeholder:text-slate-400"
                  onKeyDown={(e) => { if (e.key === 'Enter' && aiRefinePrompt.trim()) handleRefineWithAI(aiRefinePrompt); }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-xl border-primary/20 hover:bg-primary/5 gap-1" onClick={() => handleRefineWithAI('Profesionaliza el lenguaje clínico')} disabled={isRefiningAI || !editorContent.trim()}>
                  <Sparkles className="h-3 w-3 text-primary" /> Profesionalizar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-xl border-primary/20 hover:bg-primary/5 gap-1" onClick={() => handleRefineWithAI('Corrige la redacción y ortografía')} disabled={isRefiningAI || !editorContent.trim()}>
                  <Sparkles className="h-3 w-3 text-orange-500" /> Corregir Redacción
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-xl border-primary/20 hover:bg-primary/5 gap-1" onClick={() => handleRefineWithAI('Resume de forma concisa')} disabled={isRefiningAI || !editorContent.trim()}>
                  <Sparkles className="h-3 w-3 text-blue-500" /> Resumir
                </Button>
              </div>
            </div>

            {/* Diagnostic Panel */}
            <div>
              <button type="button" onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                {showDiagnosticPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Datos Diagnósticos (CIE-10)
              </button>
              {showDiagnosticPanel && (
                <div className="mt-3 p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-3 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Código CIE-10</label>
                      <Input value={cie10Code} onChange={(e) => { setCie10Code(e.target.value); setIsDirty(true); }} placeholder="Ej: F41.1" className="mt-1 h-9 rounded-xl text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Descripción CIE-10</label>
                      <Input value={cie10Description} onChange={(e) => { setCie10Description(e.target.value); setIsDirty(true); }} placeholder="Ej: Trastorno de ansiedad generalizada" className="mt-1 h-9 rounded-xl text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Diagnóstico Principal</label>
                    <Input value={diagnosticoPrincipal} onChange={(e) => { setDiagnosticoPrincipal(e.target.value); setIsDirty(true); }} placeholder="Diagnóstico clínico principal" className="mt-1 h-9 rounded-xl text-xs" />
                  </div>
                </div>
              )}
            </div>

            {/* Main Editor */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 mb-2 block">Reporte Clínico</label>
              {isRefiningAI && (
                <div className="flex items-center gap-2 text-xs text-primary font-semibold mb-2 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> La IA está refinando tu nota...
                </div>
              )}
              {diffParts ? (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Revisión de cambios sugeridos por la IA
                    </h4>
                    <div className="text-sm leading-relaxed space-x-1">
                      {diffParts.map((part) => (
                        <span key={part.id} className={part.type === 'added' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-0.5 rounded' : part.type === 'removed' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 line-through px-0.5 rounded opacity-70' : ''}>
                          {part.text}{' '}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={handleRejectDiff}>Rechazar</Button>
                    <Button size="sm" variant="zen" className="rounded-xl text-xs" onClick={handleAcceptDiff}>Aceptar cambios</Button>
                  </div>
                </div>
              ) : (
                <MiniEditor content={editorContent} onChange={(val) => { setEditorContent(val); setIsDirty(true); }} />
              )}
            </div>

            {/* Bridge Notes */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 mb-2 block">Notas Puente / Bullet Points</label>
              <Textarea
                value={bulletPoints}
                onChange={(e) => { setBulletPoints(e.target.value); setIsDirty(true); }}
                placeholder="Puntos clave a retomar en la siguiente sesión..."
                className="min-h-[100px] rounded-2xl text-sm border-border/80 resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-primary/5 border border-primary/10 p-6 rounded-2xl text-center space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10"><Sparkles className="h-8 w-8 text-primary" /></div>
              <h3 className="text-lg font-bold">Asistente de IA para Notas</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Dicta o escribe puntos clave de la sesión y la IA generará un reporte clínico estructurado.</p>
              <Textarea value={bulletPoints} onChange={(e) => { setBulletPoints(e.target.value); setIsDirty(true); }} placeholder="Escribe los puntos clave de la sesión aquí..." className="min-h-[150px] rounded-2xl text-sm" />
              <Button variant="zen" className="gap-2" onClick={handleGenerateWithAI} disabled={isProcessingAI || !bulletPoints.trim()}>
                {isProcessingAI ? (<><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>) : (<><Sparkles className="h-4 w-4" /> Generar Nota con IA</>)}
              </Button>
            </div>
            {editorContent && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 mb-2 block">Resultado Generado</label>
                <MiniEditor content={editorContent} onChange={(val) => { setEditorContent(val); setIsDirty(true); }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky bottom-0 z-10">
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          {autosaveStatus === 'saving' && (<><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /><span>Guardando...</span></>)}
          {autosaveStatus === 'saved' && (<><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /><span>Borrador guardado</span></>)}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSaving} className="rounded-xl h-10 px-5 text-slate-600 font-bold hover:bg-slate-100 transition-colors">
            Cancelar
          </Button>
          <Button variant="zen" onClick={handleSave} disabled={isSaving || isProcessingAI || !!diffParts} className="rounded-xl h-10 px-6 font-bold shadow-md shadow-primary/15 transition-all">
            {isSaving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</>) : (<><Save className="h-4 w-4 mr-2" />Guardar Cambios</>)}
          </Button>
        </div>
      </div>
    </>
  );

  // ── Inline mode: render directly within the page ──
  if (inline) {
    if (!isOpen) return null;
    return (
      <div className="flex flex-col bg-card rounded-2xl shadow-soft border border-border overflow-hidden min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        {editorHeader}
        {editorTabs}
        {editorBody}
      </div>
    );
  }

  // ── Sheet mode: render as overlay (fallback for non-patient pages) ──
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full bg-background border-l border-border p-0 shadow-elevated">
        <SheetTitle className="sr-only">{note ? 'Edición de Nota' : 'Nueva Nota Clínica'}</SheetTitle>
        {editorHeader}
        {editorTabs}
        {editorBody}
      </SheetContent>
    </Sheet>
  );
}


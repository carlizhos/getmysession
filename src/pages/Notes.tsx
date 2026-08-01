import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import FeatureGate from '@/components/subscription/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Filter,
  FileText,
  Calendar,
  Brain,
  ArrowLeft,
  Loader2,
  Trash2,
  Pencil,
  Save,
  X,
  ChevronRight,
  Activity,
  Download,
  Sparkles,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import StructuredNoteForm from '@/components/notes/StructuredNoteForm';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { SessionNote } from '@/types';
import { generateSessionNotePDF } from '@/lib/generateExpedientePDF';
import AIVoiceRecorder from '@/components/notes/AIVoiceRecorder';
import MiniEditor from '@/components/ui/MiniEditor';
import DOMPurify from 'dompurify';
import { useNotes, useNoteTemplates, useProfessionalProfile, useMutateNotes } from '@/hooks/useNotes';

const Notes = () => {
  const { organization } = useOrganization();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  
  const { data: notes = [], isLoading: loading } = useNotes(selectedPatient);
  const { data: noteTemplates = [], isLoading: isLoadingTemplates } = useNoteTemplates();
  const { data: professionalProfile } = useProfessionalProfile();
  const { createNote, archiveNote, updateNote } = useMutateNotes();

  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [isExportingNote, setIsExportingNote] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);

  useEffect(() => {
    const pId = searchParams.get('patientId');
    const nId = searchParams.get('noteId');
    const newNote = searchParams.get('newNote');
    if (pId) {
      setSelectedPatient(pId);
      supabase
        .from('patients')
        .select('name')
        .eq('id', pId)
        .single()
        .then(({ data }) => {
          if (data) setSelectedPatientName(data.name);
        });
    }
    if (nId) {
      setSelectedNote(nId);
    }
    if (newNote === 'true') {
      setIsCreatingNote(true);
    }
  }, [searchParams]);

  const handleDownloadNote = async (note: SessionNote) => {
    setIsExportingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, prefix, cedulas, signature_data, logo_data')
        .eq('id', user.id)
        .single();

      let dateOfBirth: string | undefined = undefined;
      if (selectedPatient) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('date_of_birth')
          .eq('id', selectedPatient)
          .single();
        if (patientData) {
          dateOfBirth = patientData.date_of_birth;
        }
      }

      generateSessionNotePDF(
        { name: selectedPatientName, id: selectedPatient!, date_of_birth: dateOfBirth },
        note as any,
        prof || undefined
      );
      toast.success('Reporte generado con éxito');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar PDF: ' + err.message);
    } finally {
      setIsExportingNote(false);
    }
  };

  const handleSaveNote = async (noteData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión activa');

    const payload = {
      user_id: user.id,
      patient_id: noteData.patientId || null,
      patient_name: noteData.patientName || 'Sin paciente',
      date: noteData.date,
      session_number: noteData.patientId ? notes.filter((n: any) => n.patient_id === noteData.patientId).length + 1 : 1,
      mood: noteData.mood,
      bridge: noteData.bridge,
      agenda: noteData.agenda,
      beliefs: noteData.beliefs,
      action_plan: noteData.actionPlan,
      cie10_code: noteData.cie10Code || null,
      cie10_description: noteData.cie10Description || null,
      diagnostico_principal: noteData.diagnosticoPrincipal || null,
      mental_status: noteData.mentalStatus || null,
      organization_id: organization?.id,
    };

    createNote.mutate(payload, {
      onSuccess: () => setIsCreatingNote(false)
    });
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    setIsDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    archiveNote.mutate({ noteId: selectedNote, userId: user?.id }, {
      onSuccess: () => {
        setSelectedNote(null);
        setConfirmDelete(false);
        setIsDeleting(false);
      },
      onError: () => setIsDeleting(false)
    });
  };

  const handleUpdateReport = async () => {
    if (!selectedNote || !selectedNoteData) return;
    const updatedAgenda = [...(selectedNoteData.agenda || [])];
    if (updatedAgenda.length === 0) {
      updatedAgenda.push({ id: '', topic: 'Reporte', situation: '', thoughts: editingText, emotions: '', interventions: '' });
    } else {
      updatedAgenda[0] = { ...updatedAgenda[0], thoughts: editingText };
    }
    
    updateNote.mutate({ noteId: selectedNote, payload: { agenda: updatedAgenda } }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const selectedNoteData = notes.find((n: any) => n.id === selectedNote);

  if (isCreatingNote) {
    if (isDictating) {
      return (
        <Layout>
          <FeatureGate feature="core_notes">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-12">
            <FeatureGate feature="ai_voice">
            <AIVoiceRecorder 
              onCancel={() => setIsDictating(false)}
              onSuccess={async (mockText) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Sesión inválida');
                  
                  const sessionNum = selectedPatient ? notes.filter((n: any) => n.patient_id === selectedPatient).length + 1 : 1;

                  const payload = {
                    user_id: user.id,
                    patient_id: selectedPatient || null,
                    patient_name: selectedPatientName || 'Sin paciente',
                    date: new Date().toISOString(),
                    session_number: sessionNum,
                    agenda: [{ id: 'ai-gen', topic: 'Reporte Generado por IA', situation: '', thoughts: mockText, emotions: '', interventions: '' }],
                    organization_id: organization?.id,
                  };

                  const { error } = await supabase.from('session_notes').insert([payload]);
                  if (error) throw error;

                  toast.success('Nota estructurada y guardada con éxito.');
                  setIsDictating(false);
                  setIsCreatingNote(false);
                  if (searchParams.get('newNote') === 'true' && selectedPatient) {
                    navigate('/patients', { state: { selectPatientId: selectedPatient } });
                  }
                } catch (err: any) {
                  toast.error('Error al guardar la nota: ' + err.message);
                }
              }}
            />
            </FeatureGate>
          </div>
          </FeatureGate>
        </Layout>
      );
    }

    return (
      <Layout>
        <FeatureGate feature="core_notes">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              setIsCreatingNote(false);
              setSelectedTemplateId(null);
              if (searchParams.get('newNote') === 'true' && selectedPatient) {
                navigate('/patients', { state: { selectPatientId: selectedPatient } });
              }
            }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-black text-primary tracking-tight">Nueva Nota Clínica</h1>
          </div>

          {!selectedTemplateId ? (
            <div className="space-y-6">
              <button 
                onClick={() => setIsDictating(true)}
                className="w-full relative overflow-hidden group rounded-2xl bg-gradient-to-r from-primary to-emerald-600 p-8 text-left transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.01]"
              >
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                  <Brain className="w-32 h-32 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Nuevo
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">Redactar con Inteligencia Artificial</h3>
                  <p className="text-white/80 max-w-md leading-relaxed text-sm">
                    Solo presiona grabar y habla sobre la sesión. Saudade extraerá, estructurará y redactará la nota SOAP automáticamente.
                  </p>
                </div>
              </button>

              <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Selecciona una Plantilla</CardTitle>
                    <CardDescription>O elige redactar manualmente con una estructura predefinida</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                {isLoadingTemplates ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                    <p className="text-xs text-muted-foreground font-medium">Cargando plantillas...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {noteTemplates.map((template: any) => (
                      <div
                        key={template.id}
                        className="group flex flex-col p-5 rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                            template.is_system ? "bg-primary/5 text-primary" : "bg-violet-50 text-violet-600"
                          )}>
                            <FileText className="h-5 w-5" />
                          </div>
                          
                          <Badge variant="outline" className={cn(
                            "text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 border",
                            template.is_system ? "bg-primary/5 text-primary border-primary/20" : "bg-violet-50 text-violet-600 border-violet-200"
                          )}>
                            {template.is_system ? 'Sistema' : 'Personalizada'}
                          </Badge>
                        </div>

                        <h4 className="font-bold text-sm mb-1.5">{template.name}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-6 flex-1">
                          {template.description}
                        </p>

                        <div className="mt-auto pt-4 flex flex-row items-center gap-2 border-t border-border/40 w-full">
                          <Button 
                            variant="zen"
                            size="sm"
                            className="flex-1 h-8 text-xs font-bold shadow-sm px-2"
                            onClick={() => setSelectedTemplateId(template.id)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">Redactar</span>
                          </Button>

                          {!template.is_system && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-bold text-slate-600 hover:text-violet-700 hover:bg-violet-50 border-border/50 shrink-0"
                              onClick={() => navigate('/settings?tab=plantillas')}
                            >
                              <Settings className="h-3.5 w-3.5 mr-1.5" />
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          ) : (
            <StructuredNoteForm
              templateId={selectedTemplateId}
              initialPatientId={selectedPatient || undefined}
              initialPatientName={selectedPatientName || undefined}
              onCancel={() => {
                setIsCreatingNote(false);
                setSelectedTemplateId(null);
                if (searchParams.get('newNote') === 'true' && selectedPatient) {
                  navigate('/patients', { state: { selectPatientId: selectedPatient } });
                }
              }}
              onSave={async (noteData) => {
                const { data: { user } } = await supabase.auth.getUser();
                const { error } = await supabase
                  .from('session_notes')
                  .insert({
                    user_id: user?.id,
                    patient_id: noteData.patientId || null,
                    patient_name: noteData.patientName || 'Sin paciente',
                    date: noteData.date,
                    session_number: parseInt(noteData.sessionNumber) || 1,
                    mood: noteData.mood,
                    bridge: noteData.bridge,
                    agenda: noteData.agenda,
                    beliefs: noteData.beliefs,
                    action_plan: noteData.actionPlan,
                    cie10_code: noteData.cie10Code || null,
                    cie10_description: noteData.cie10Description || null,
                    diagnostico_principal: noteData.diagnosticoPrincipal || null,
                    mental_status: noteData.mentalStatus || null,
                    content: noteData,
                    organization_id: organization?.id,
                    template_id: selectedTemplateId
                  });
                if (error) {
                  toast.error('Error al guardar: ' + error.message);
                } else {
                  toast.success('Nota guardada con éxito');
                  setIsCreatingNote(false);
                  setSelectedTemplateId(null);
                  if (searchParams.get('newNote') === 'true' && selectedPatient) {
                    navigate('/patients', { state: { selectPatientId: selectedPatient } });
                  }
                }
              }}
            />
          )}
        </div>
        </FeatureGate>
      </Layout>
    );
  }

  return (
    <Layout>
      <FeatureGate feature="core_notes">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight">Notas Clínicas</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Historial de Reportes Estructurados</p>
            </div>
          </div>

          <div className="w-full lg:max-w-md">
            <PatientAutocomplete
              value={selectedPatient || ''}
              onSelect={(id, name) => {
                setSelectedPatient(id);
                setSelectedPatientName(name);
                setSelectedNote(null);
              }}
              placeholder="Selecciona un paciente..."
            />
          </div>

          <div className="flex gap-3 w-full lg:w-auto justify-end">
            <Button 
              variant="zen" 
              size="sm" 
              className="h-10 text-xs font-bold px-4 shadow-lg shadow-primary/20" 
              onClick={() => setIsCreatingNote(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Nota
            </Button>
          </div>
        </div>

        {!selectedPatient ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 ring-8 ring-primary/[0.02]">
                <Search className="h-10 w-10 text-primary/30" />
              </div>
              <h2 className="text-2xl font-black text-primary tracking-tight mb-2">Consulta un Expediente</h2>
              <p className="text-muted-foreground max-w-[320px] mx-auto text-sm leading-relaxed">
                Utiliza el buscador superior para seleccionar un paciente y ver su historial clínico completo.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
          </div>
        ) : notes.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">No hay notas registradas</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Este paciente aún no tiene sesiones registradas. Comienza creando su primera nota clínica.
              </p>
              <Button variant="zen" className="gap-2" onClick={() => setIsCreatingNote(true)}>
                <Plus className="h-4 w-4" /> Crear Primera Nota
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
              {notes.map((note: any) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note.id)}
                  className="group relative cursor-pointer overflow-hidden transition-all duration-300 rounded-2xl border-2 bg-card border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                        Sesión #{note.session_number}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Calendar className="h-3 w-3 opacity-60" />
                        {format(parseISO(note.date), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground leading-tight">
                        {note.agenda?.[0]?.topic || 'Consulta General'}
                      </p>
                      {note.cie10_code && (
                        <p className="text-[10px] text-muted-foreground font-medium truncate">
                          {note.cie10_code} - {note.cie10_description}
                        </p>
                      )}
                    </div>
                    
                    {note.mood?.rating != null && (
                      <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-primary/60" />
                        <span className="text-[11px] font-bold text-muted-foreground">
                          Ánimo: {note.mood.rating}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Dialog open={!!selectedNoteData} onOpenChange={(open) => {
              if (!open) {
                setSelectedNote(null);
                setIsEditing(false);
                setConfirmDelete(false);
              }
            }}>
              <DialogContent className="w-[95vw] max-w-5xl sm:max-w-5xl h-[95vh] p-0 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden border-border/50 shadow-2xl">
                {selectedNoteData && (
                  <>
                    <DialogHeader className="p-4 md:p-6 bg-background border-b shadow-sm z-10 flex-shrink-0">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="zen" className="px-3 py-1 rounded-lg shadow-sm">Sesión #{selectedNoteData.session_number}</Badge>
                            <span className="text-xs md:text-sm font-bold text-muted-foreground/60 flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(parseISO(selectedNoteData.date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                            </span>
                          </div>
                          <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-primary mt-2 md:mt-3">
                            {selectedPatientName}
                          </DialogTitle>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          {!isEditing ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 px-4 rounded-xl border-primary/20 hover:bg-primary/5 text-primary gap-2 transition-all font-bold"
                                onClick={() => {
                                  setEditingText(selectedNoteData.agenda?.[0]?.thoughts || '');
                                  setIsEditing(true);
                                  setConfirmDelete(false);
                                }}
                              >
                                <Pencil className="h-4 w-4" /> Editar Modo Completo
                              </Button>
                              <Button
                                variant="zen"
                                size="sm"
                                className="h-10 px-4 rounded-xl gap-2 font-bold shadow-sm"
                                onClick={() => handleDownloadNote(selectedNoteData)}
                                disabled={isExportingNote}
                              >
                                {isExportingNote ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                                Descargar Reporte
                              </Button>

                              {confirmDelete ? (
                                <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 p-1.5 rounded-xl animate-in fade-in zoom-in-95">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-3 text-xs font-black uppercase tracking-widest"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                  >
                                    Confirmar
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-lg"
                                    onClick={() => setConfirmDelete(false)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 px-4 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 font-bold"
                                  onClick={() => setConfirmDelete(true)}
                                >
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </Button>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button variant="zen" size="sm" className="h-10 px-6 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20" onClick={handleUpdateReport}>
                                <Save className="h-4 w-4" /> Guardar Cambios
                              </Button>
                              <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl font-bold" onClick={() => setIsEditing(false)}>
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                      {/* Document Sheet - "Word-like print preview" effect */}
                      <div className="max-w-4xl mx-auto bg-background rounded-sm shadow-2xl border border-border/50 min-h-[850px] p-8 sm:p-16 ring-1 ring-slate-900/5">
                        
                        {/* Quick Metadata inside document */}
                        {(!isEditing && (selectedNoteData.cie10_code || selectedNoteData.mood?.rating != null)) && (
                          <div className="flex flex-wrap gap-4 mb-10 pb-6 border-b border-border/40">
                            {selectedNoteData.cie10_code && (
                              <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
                                <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{selectedNoteData.cie10_code}</span>
                                <span className="text-xs font-bold text-muted-foreground truncate max-w-[200px]">{selectedNoteData.cie10_description}</span>
                              </div>
                            )}
                            {selectedNoteData.mood?.rating != null && (
                              <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
                                <Activity className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-bold text-muted-foreground">Estado de Ánimo: {selectedNoteData.mood.rating}/100</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Report Section */}
                        <div className="space-y-6">
                          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                            <Brain className="h-5 w-5" /> Reporte Clínico Estructurado
                          </h4>
                          
                          {isEditing ? (
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-2 border-2 border-primary/20 shadow-inner focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
                              <MiniEditor
                                content={editingText}
                                onChange={(html) => setEditingText(html)}
                                className="border-none min-h-[500px]"
                              />
                            </div>
                          ) : (
                            <div 
                              className="text-[15px] bg-transparent whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 prose prose-sm max-w-none prose-headings:text-primary prose-a:text-primary prose-p:mb-4"
                              dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(selectedNoteData.agenda?.[0]?.thoughts || 'Sin reporte detallado registrado.') 
                              }}
                            />
                          )}
                        </div>

                        {/* Visual Signature Block (only shown in view mode) */}
                        {!isEditing && professionalProfile && (
                          <div className="pt-24 mt-24 border-t border-border/60 flex flex-col items-center animate-in fade-in duration-1000">
                            {professionalProfile.signature_data && (
                              <img 
                                src={professionalProfile.signature_data} 
                                alt="Firma" 
                                className="h-20 w-auto mb-4 grayscale hover:grayscale-0 transition-all duration-500 opacity-80"
                              />
                            )}
                            <div className="h-px w-64 bg-slate-200 dark:bg-slate-800 mb-6" />
                            <p className="text-base font-bold text-foreground">
                              {[professionalProfile.prefix, professionalProfile.full_name].filter(Boolean).join(' ')}
                            </p>
                            {professionalProfile.cedulas?.map((ced: any, i: number) => (
                              <p key={i} className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">
                                Céd. Prof. {ced.numero}
                              </p>
                            ))}
                            <p className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] mt-8">
                              Psicólogo Responsable
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      </FeatureGate>
    </Layout>
  );
};

export default Notes;

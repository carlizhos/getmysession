import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Sparkles
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
import FeatureGate from '@/components/subscription/FeatureGate';



// ── Componente ────────────────────────────────────────────────────────────────
const Notes = () => {
  const { organization } = useOrganization();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [isExportingNote, setIsExportingNote] = useState(false);
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);
  const [noteTemplates, setNoteTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isDictating, setIsDictating] = useState(false);



  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!selectedPatient) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('session_notes')
      .select('*')
      .eq('patient_id', selectedPatient)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (error) {
      toast.error('Error al cargar notas: ' + error.message);
    } else {
      setNotes((data as SessionNote[]) ?? []);
      if (data && data.length > 0 && !selectedNote) {
        setSelectedNote(data[0].id);
      }
    }
    setLoading(false);
  }, [selectedPatient, selectedNote]);

  const fetchTemplates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('note_templates')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${user.id}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      if (data) setNoteTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);


  const handleDownloadNote = async (note: SessionNote) => {
    setIsExportingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, prefix, cedulas, signature_data')
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

  useEffect(() => { 
    fetchNotes(); 
    fetchProfessionalProfile();
  }, [selectedPatient]); // Fetch when patient changes

  const fetchProfessionalProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, prefix, cedulas, signature_data')
      .eq('id', user.id)
      .single();
    if (data) setProfessionalProfile(data);
  };


  // ── Guardar nota ───────────────────────────────────────────────────────────
  const handleSaveNote = async (noteData: {
    patientId?: string;
    patientName?: string;
    date: string;
    sessionNumber: string;
    mood: any;
    bridge: any;
    agenda: any[];
    beliefs: any;
    actionPlan: string[];
    cie10Code?: string;
    cie10Description?: string;
    diagnosticoPrincipal?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión activa');

    const payload = {
      user_id: user.id,
      patient_id: noteData.patientId || null,
      patient_name: noteData.patientName || 'Sin paciente',
      date: noteData.date,
      session_number: noteData.patientId ? notes.filter(n => n.patient_id === noteData.patientId).length + 1 : 1,
      mood: noteData.mood,
      bridge: noteData.bridge,
      agenda: noteData.agenda,
      beliefs: noteData.beliefs,
      action_plan: noteData.actionPlan,
      cie10_code: noteData.cie10Code || null,
      cie10_description: noteData.cie10Description || null,
      diagnostico_principal: noteData.diagnosticoPrincipal || null,
      organization_id: organization?.id,
    };

    const { error } = await supabase.from('session_notes').insert([payload]);

    if (error) {
      toast.error('Error al guardar la nota: ' + error.message);
      return;
    }

    toast.success('Nota clínica guardada correctamente');
    setIsCreatingNote(false);
    await fetchNotes(); // Recarga lista
  };

  // ── Archivar nota (soft delete NOM-024 — retención 5 años) ────────────────
  const handleDelete = async () => {
    if (!selectedNote) return;
    setIsDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('session_notes')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq('id', selectedNote);
    if (error) {
      toast.error('Error al archivar: ' + error.message);
    } else {
      toast.success('Nota archivada (retenida 5 años según NOM-024)');
      setSelectedNote(null);
      setConfirmDelete(false);
      await fetchNotes();
    }
    setIsDeleting(false);
  };

  // ── Actualizar reporte de texto ────────────────────────────────────────────
  const handleUpdateReport = async () => {
    if (!selectedNote || !selectedNoteData) return;
    const updatedAgenda = [...(selectedNoteData.agenda || [])];
    if (updatedAgenda.length === 0) {
      updatedAgenda.push({ id: '', topic: 'Reporte', situation: '', thoughts: editingText, emotions: '', interventions: '' });
    } else {
      updatedAgenda[0] = { ...updatedAgenda[0], thoughts: editingText };
    }
    const { error } = await supabase
      .from('session_notes')
      .update({ agenda: updatedAgenda })
      .eq('id', selectedNote);
    if (error) {
      toast.error('Error al guardar cambios: ' + error.message);
    } else {
      toast.success('Nota actualizada');
      setIsEditing(false);
      await fetchNotes();
    }
  };

  const selectedNoteData = notes.find(n => n.id === selectedNote);

  // ── Vista: Formulario de nueva nota ───────────────────────────────────────
  if (isCreatingNote) {
    if (isDictating) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] py-12">
            <FeatureGate feature="ai_voice">
            <AIVoiceRecorder 
              onCancel={() => setIsDictating(false)}
              onSuccess={async (mockText) => {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Sesión inválida');
                  
                  // Calcular número de sesión aproximado
                  const sessionNum = selectedPatient ? notes.filter(n => n.patient_id === selectedPatient).length + 1 : 1;

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
                  fetchNotes();
                } catch (err: any) {
                  toast.error('Error al guardar la nota: ' + err.message);
                }
              }}
            />
            </FeatureGate>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setIsCreatingNote(false); setSelectedTemplateId(null); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-black text-primary tracking-tight">Nueva Nota Clínica</h1>
          </div>

          {!selectedTemplateId ? (
            <div className="space-y-6">
              {/* Premium AI Banner */}
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
                    {noteTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className="group flex flex-col items-start p-5 rounded-2xl border border-border bg-card text-left transition-all hover:border-primary hover:shadow-md hover:-translate-y-1"
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                          template.is_system ? "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white" : "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
                        )}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{template.name}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-4">{template.description}</p>
                        <div className="mt-auto pt-4 w-full flex items-center justify-between border-t border-border/40">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                            {template.is_system ? 'Sistema' : 'Personalizada'}
                          </span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </button>
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
              onCancel={() => { setIsCreatingNote(false); setSelectedTemplateId(null); }}
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
                  fetchNotes();
                }
              }}
            />
          )}
        </div>
      </Layout>
    );
  }

  // ── Vista: Lista de notas ─────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6">
        {/* Unified Header: Title, Search & Actions */}
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

        {/* Dynamic Content */}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar: Session History */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground px-1 mb-4">
                Historial de Sesiones
              </h3>
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-2 scrollbar-zen pb-4">
                {notes.map((note, index) => {
                  const isActive = selectedNote === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note.id)}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden transition-all duration-500 rounded-2xl border-2",
                        isActive
                          ? "bg-primary border-primary shadow-md shadow-primary/20"
                          : "bg-primary/5 border-transparent hover:border-primary/30 hover:bg-primary/[0.12] hover:-translate-y-0.5"
                      )}
                    >
                      <div className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                              isActive ? "bg-white text-primary" : "bg-primary/20 text-primary"
                            )}>
                              S #{note.session_number}
                            </span>
                            <div className={cn(
                              "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                              isActive ? "text-white/80" : "text-muted-foreground"
                            )}>
                              <Calendar className="h-3 w-3 opacity-60" />
                              {format(parseISO(note.date), "d MMM yyyy", { locale: es })}
                            </div>
                          </div>
                          {isActive && <ChevronRight className="h-4 w-4 text-white animate-pulse" />}
                        </div>
                        
                        <div className="space-y-0.5">
                          <p className={cn(
                            "text-sm font-bold truncate transition-colors",
                            isActive ? "text-white" : "text-foreground"
                          )}>
                            {note.agenda?.[0]?.topic || 'Consulta General'}
                          </p>
                          {note.mood?.rating != null && (
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "h-1 flex-1 rounded-full overflow-hidden max-w-[40px]",
                                isActive ? "bg-white/20" : "bg-primary/20"
                              )}>
                                <div 
                                  className={cn(
                                    "h-full",
                                    isActive ? "bg-white" : "bg-primary"
                                  )} 
                                  style={{ width: `${note.mood.rating}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-[10px] font-medium",
                                isActive ? "text-white/60" : "text-muted-foreground/60"
                              )}>
                                {note.mood.rating}% ánimo
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content: Note Details */}
            <div className="lg:col-span-8">
              {selectedNoteData && (
                <Card className="border-2 shadow-xl overflow-hidden">
                  <div className="bg-primary/5 border-b border-primary/10 p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="zen" className="px-3 py-1 rounded-lg">Sesión #{selectedNoteData.session_number}</Badge>
                          <span className="text-sm font-bold text-muted-foreground/60">
                            {format(parseISO(selectedNoteData.date), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-primary mt-4">
                          {selectedPatientName}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
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
                              <Pencil className="h-4 w-4" /> Editar
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

                    {/* Quick Metadata */}
                    <div className="flex flex-wrap gap-4 mt-6">
                      {selectedNoteData.cie10_code && (
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary/10 px-4 py-2 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{selectedNoteData.cie10_code}</span>
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{selectedNoteData.cie10_description}</span>
                        </div>
                      )}
                      {selectedNoteData.mood?.rating != null && (
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary/10 px-4 py-2 rounded-2xl shadow-sm">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-slate-600">Estado de Ánimo: {selectedNoteData.mood.rating}/100</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-420px)] scrollbar-zen">
                    {/* Report Section */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-4 flex items-center gap-2">
                        <Brain className="h-4 w-4" /> Reporte Clínico Estructurado
                      </h4>
                      {isEditing ? (
                        <textarea
                          className="w-full min-h-[350px] text-[15px] bg-muted/40 rounded-[1.5rem] p-6 whitespace-pre-wrap leading-relaxed border-2 border-primary/10 focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <div className="text-[15px] bg-muted/30 rounded-[1.5rem] p-8 whitespace-pre-wrap leading-relaxed border border-border/40 text-slate-700 shadow-inner italic">
                          {selectedNoteData.agenda?.[0]?.thoughts || 'Sin reporte detallado registrado.'}
                        </div>
                      )}
                    </div>

                    {/* Visual Signature Block */}
                    {!isEditing && professionalProfile && (
                      <div className="pt-12 mt-12 border-t border-border/60 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                        {professionalProfile.signature_data && (
                          <img 
                            src={professionalProfile.signature_data} 
                            alt="Firma" 
                            className="h-16 w-auto mb-2 grayscale hover:grayscale-0 transition-all duration-500 opacity-80"
                          />
                        )}
                        <div className="h-px w-48 bg-slate-200 mb-4" />
                        <p className="text-sm font-bold text-slate-800">
                          {[professionalProfile.prefix, professionalProfile.full_name].filter(Boolean).join(' ')}
                        </p>
                        {professionalProfile.cedulas?.map((ced: any, i: number) => (
                          <p key={i} className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">
                            Céd. Prof. {ced.numero}
                          </p>
                        ))}
                        <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em] mt-6">
                          Psicólogo Responsable
                        </p>
                      </div>
                    )}


                    {/* Agenda Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Temas Tratados</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedNoteData.agenda?.map((item, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                            <span className="text-sm font-bold text-primary">{item.topic || `Tema ${i + 1}`}</span>
                            {item.situation && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                <span className="font-black opacity-40 mr-1">SIT:</span> {item.situation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notes;

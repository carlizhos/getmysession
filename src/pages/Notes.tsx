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
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import StructuredNoteForm from '@/components/notes/StructuredNoteForm';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { toast } from 'sonner';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface SessionNote {
  id: string;
  patient_id: string | null;
  patient_name: string;
  date: string;
  session_number: number;
  mood: { rating: number; notes: string };
  bridge: { items: { text: string; completed: boolean }[]; notes: string };
  agenda: { id: string; topic: string; situation: string; thoughts: string; emotions: string; interventions: string }[];
  beliefs: { core: string; alternative: string };
  action_plan: string[];
  created_at: string;
}

// ── Componente ────────────────────────────────────────────────────────────────
const Notes = () => {
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

  useEffect(() => { 
    fetchNotes(); 
  }, [selectedPatient]); // Fetch when patient changes

  // ── Guardar nota ───────────────────────────────────────────────────────────
  const handleSaveNote = async (noteData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión activa');

    const payload = {
      user_id: user.id,
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
    return (
      <Layout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsCreatingNote(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nueva Nota</h1>
              <p className="text-muted-foreground">Registra los detalles de la sesión</p>
            </div>
          </div>
          <StructuredNoteForm
            initialPatientId={selectedPatient || undefined}
            initialPatientName={selectedPatientName || undefined}
            onSave={handleSaveNote}
            onCancel={() => setIsCreatingNote(false)}
          />
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
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-2 scrollbar-zen">
                {notes.map((note, index) => (
                  <Card
                    key={note.id}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      selectedNote === note.id 
                      ? 'border-primary bg-primary/5 shadow-md scale-[1.02] ring-1 ring-primary/20' 
                      : 'border-transparent bg-muted/30 hover:bg-muted/50 hover:border-primary/20'
                    }`}
                    onClick={() => setSelectedNote(note.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-primary/40">#{note.session_number}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {format(parseISO(note.date), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        {selectedNote === note.id && <ChevronRight className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-sm font-bold truncate">
                        {note.agenda?.[0]?.topic || 'Consulta General'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
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
                      {(selectedNoteData as any).cie10_code && (
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary/10 px-4 py-2 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{(selectedNoteData as any).cie10_code}</span>
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{(selectedNoteData as any).cie10_description}</span>
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

                    {/* Split View for Agenda & Action Plan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Temas Tratados</h4>
                        <div className="space-y-3">
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

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Plan de Acción</h4>
                        <ul className="space-y-3">
                          {selectedNoteData.action_plan?.map((item, i) => (
                            <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/5">
                              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-black text-primary">{i + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-slate-700 leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
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

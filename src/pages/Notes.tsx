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
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import StructuredNoteForm from '@/components/notes/StructuredNoteForm';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('session_notes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar notas: ' + error.message);
    } else {
      setNotes((data as SessionNote[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

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

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filteredNotes = notes.filter(note =>
    note.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.agenda?.some(a => a.topic?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notas Clínicas</h1>
            <p className="text-muted-foreground">Historial de notas y reportes de sesiones</p>
          </div>
          <Button variant="zen" className="gap-2" onClick={() => setIsCreatingNote(true)}>
            <Plus className="h-4 w-4" />
            Nueva Nota
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente o tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Lista */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <Card variant="flat">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">
                    {searchQuery ? 'No se encontraron notas' : 'Aún no hay notas clínicas'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery ? 'Intenta con otros términos' : 'Crea la primera nota clínica'}
                  </p>
                  {!searchQuery && (
                    <Button variant="zen" className="gap-2" onClick={() => setIsCreatingNote(true)}>
                      <Plus className="h-4 w-4" /> Nueva Nota
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredNotes.map((note, index) => (
                <Card
                  key={note.id}
                  variant={selectedNote === note.id ? 'zen' : 'interactive'}
                  onClick={() => setSelectedNote(note.id)}
                  className="animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-semibold text-primary">
                            {note.patient_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{note.patient_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(note.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Sesión #{note.session_number}</Badge>
                        <Badge variant="zen">Estructurada</Badge>
                      </div>
                    </div>

                    {/* Resumen de agenda */}
                    {note.agenda?.length > 0 && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <span className="font-medium">Temas: </span>
                        {note.agenda.map(a => a.topic).filter(Boolean).join(' · ') || 'Sin temas registrados'}
                      </p>
                    )}

                    {/* Estado de ánimo */}
                    {note.mood?.rating != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Ánimo:</span>
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${note.mood.rating}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{note.mood.rating}/100</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Detalle */}
          <div className="lg:col-span-1">
            {selectedNoteData ? (
              <Card variant="default" className="lg:sticky lg:top-24 animate-scale-in">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="zen">Sesión #{selectedNoteData.session_number}</Badge>
                    {/* Acciones */}
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar reporte"
                          onClick={() => {
                            setEditingText(selectedNoteData.agenda?.[0]?.thoughts || '');
                            setIsEditing(true);
                            setConfirmDelete(false);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {confirmDelete ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={handleDelete}
                              disabled={isDeleting}
                            >
                              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : '¿Eliminar?'}
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Eliminar nota"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelete(true)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Guardar/Cancelar edición */}
                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <Button variant="zen" size="sm" className="text-xs h-7 px-2 gap-1" onClick={handleUpdateReport}>
                          <Save className="h-3 w-3" /> Guardar
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{selectedNoteData.patient_name}</CardTitle>
                  <CardDescription>
                    {format(parseISO(selectedNoteData.created_at), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 overflow-y-auto max-h-[70vh]">
                  {/* CIE-10 badge (NOM-024) */}
                  {(selectedNoteData as any).cie10_code && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                      <span className="font-mono font-semibold text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">{(selectedNoteData as any).cie10_code}</span>
                      <span className="text-muted-foreground truncate">{(selectedNoteData as any).cie10_description}</span>
                    </div>
                  )}
                  {(selectedNoteData as any).diagnostico_principal && (
                    <div className="text-sm text-muted-foreground italic px-1">
                      Dx: {(selectedNoteData as any).diagnostico_principal}
                    </div>
                  )}
                  {/* Reporte IA completo */}
                  {((selectedNoteData.agenda?.length > 0 && selectedNoteData.agenda[0]?.thoughts && selectedNoteData.agenda[0].thoughts.length > 60) || isEditing) && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
                        <Brain className="h-4 w-4" /> Reporte Clínico
                      </h4>
                      {isEditing ? (
                        <textarea
                          className="w-full min-h-[240px] text-sm bg-muted/40 rounded-xl p-4 whitespace-pre-wrap leading-relaxed border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm bg-muted/40 rounded-xl p-4 whitespace-pre-wrap leading-relaxed border border-border/50">
                          {selectedNoteData.agenda[0].thoughts}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estado de ánimo */}
                  {selectedNoteData.mood?.rating != null && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Estado de ánimo</h4>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${selectedNoteData.mood.rating}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold">{selectedNoteData.mood.rating}/100</span>
                      </div>
                      {selectedNoteData.mood.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{selectedNoteData.mood.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Agenda: temas con detalle */}
                  {selectedNoteData.agenda?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" /> Temas de sesión
                      </h4>
                      <div className="space-y-2">
                        {selectedNoteData.agenda.map((item, i) => (
                          <div key={i} className="text-sm p-3 rounded-lg bg-muted/50 space-y-1">
                            <span className="font-medium block">{item.topic || `Tema ${i + 1}`}</span>
                            {item.situation && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Situación:</span> {item.situation}
                              </p>
                            )}
                            {item.thoughts && item.thoughts.length < 60 && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Pensamientos:</span> {item.thoughts}
                              </p>
                            )}
                            {item.interventions && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">Intervenciones:</span> {item.interventions}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plan de acción */}
                  {selectedNoteData.action_plan?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Plan de acción</h4>
                      <ul className="space-y-1">
                        {selectedNoteData.action_plan.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card variant="flat" className="sticky top-24">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">Selecciona una nota</h3>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en una nota para ver sus detalles
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout >
  );
};

export default Notes;

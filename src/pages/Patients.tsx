import Layout from '@/components/Layout';
import { ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  FileText,
  User,
  Brain,
  Loader2,
  Clock,
  Pencil,
  Trash2,
  X,
  Download
} from 'lucide-react';
import { mockPatients, tagColors } from '@/lib/mockData';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import NewPatientDialog from '@/components/patients/NewPatientDialog';
import { generateExpedientePDF } from '@/lib/generateExpedientePDF';

interface SessionNote {
  id: string;
  date: string;
  session_number: number;
  agenda: any[];
  mood: any;
  created_at: string;
}

const Patients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);

  const selectPatient = (id: string) => {
    setSelectedPatient(id);
    setConfirmDeletePatient(false);
  };
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Notas del paciente seleccionado
  const [patientNotes, setPatientNotes] = useState<SessionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Editar / Eliminar / Exportar
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [confirmDeletePatient, setConfirmDeletePatient] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Cargar pacientes desde Supabase
  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const now = new Date().toISOString();

      const { data: patientsData, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      if (pErr) throw pErr;

      // Traer citas
      const { data: aptsData } = await supabase
        .from('appointments')
        .select('patient_id, start_time, status')
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      const apts = aptsData || [];
      const nextByPatient: Record<string, string> = {};
      const lastByPatient: Record<string, string> = {};

      apts.forEach((apt: any) => {
        if (!apt.patient_id) return;
        if (apt.start_time >= now) {
          if (!nextByPatient[apt.patient_id]) nextByPatient[apt.patient_id] = apt.start_time;
        } else {
          lastByPatient[apt.patient_id] = apt.start_time;
        }
      });

      const enriched = (patientsData || []).map((p: any) => ({
        ...p,
        _next_appointment: nextByPatient[p.id] || null,
        _last_appointment: lastByPatient[p.id] || null,
      }));

      setPatients(enriched);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      setPatients(mockPatients);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Cargar historial clínico cuando se selecciona un paciente
  useEffect(() => {
    const fetchPatientHistory = async () => {
      if (!selectedPatient) return;

      setNotesLoading(true);
      try {
        const { data, error } = await supabase
          .from('session_notes')
          .select('id, date, session_number, agenda, mood, created_at')
          .eq('patient_id', selectedPatient)
          .order('date', { ascending: false }); // Ordenar por fecha de sesión, más reciente primero

        if (error) throw error;
        setPatientNotes(data || []);
      } catch (err) {
        console.error('Error fetching patient notes:', err);
        setPatientNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };

    fetchPatientHistory();
  }, [selectedPatient]);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.tags && patient.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const getSessionLabel = (patient: any): { label: string; prefix: string; isFuture: boolean } => {
    const nextRaw = patient._next_appointment || patient.next_session || patient.nextSession;
    const lastRaw = patient._last_appointment || patient.last_session || patient.lastSession;

    if (nextRaw) {
      return { label: format(parseISO(nextRaw), "d MMM, HH:mm", { locale: es }), prefix: 'Próxima', isFuture: true };
    }
    if (lastRaw) {
      return { label: format(parseISO(lastRaw), "d MMM yyyy", { locale: es }), prefix: 'Última sesión', isFuture: false };
    }
    return { label: 'Sin citas registradas', prefix: '', isFuture: false };
  };

  const handleEditPatient = () => {
    if (!selectedPatientData) return;
    setEditingPatient(selectedPatientData);
    setIsNewPatientOpen(true);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    setIsDeletingPatient(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('patients')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
        .eq('id', selectedPatient);
      if (error) throw error;
      toast.success('Expediente archivado (retenido 5 años según NOM-024)');
      setSelectedPatient(null);
      setConfirmDeletePatient(false);
      await fetchPatients();
    } catch (err: any) {
      toast.error('Error al archivar: ' + err.message);
    } finally {
      setIsDeletingPatient(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedPatientData) return;
    setIsExportingPDF(true);
    try {
      // Fetch notas completas (todos los campos)
      const { data: notesData } = await supabase
        .from('session_notes')
        .select('id, date, session_number, mood, bridge, agenda, beliefs, action_plan, cie10_code, cie10_description, diagnostico_principal')
        .eq('patient_id', selectedPatientData.id)
        .is('deleted_at', null)
        .order('session_number', { ascending: true });

      // Fetch consentimientos del paciente
      const { data: consentsData } = await supabase
        .from('consent_forms')
        .select('id, form_type, signed_at, is_valid')
        .eq('patient_id', selectedPatientData.id)
        .is('deleted_at', null)
        .order('signed_at', { ascending: true });

      generateExpedientePDF(
        selectedPatientData,
        notesData || [],
        consentsData || [],
      );
      toast.success('Expediente exportado como PDF');
    } catch (err: any) {
      toast.error('Error al exportar: ' + err.message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
            <p className="text-muted-foreground">
              Gestiona tu base de pacientes y expedientes clínicos
            </p>
          </div>
          <Button variant="zen" className="gap-2" onClick={() => setIsNewPatientOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Paciente
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o etiqueta..."
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

        {/* Patient Grid — 50/50 */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Patient List */}
          <div className="space-y-4">
            <Card variant="flat" className="lg:h-[calc(100vh-260px)] overflow-hidden flex flex-col">
              <CardContent className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground mt-2">Cargando pacientes...</p>
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No se encontraron pacientes
                    </div>
                  ) : (
                    filteredPatients.map((patient, index) => (
                      <div
                        key={patient.id}
                        onClick={() => selectPatient(patient.id)}
                        className={cn(
                          "flex items-center gap-4 p-4 cursor-pointer transition-all duration-200",
                          selectedPatient === patient.id
                            ? "bg-accent border-l-4 border-l-primary"
                            : "hover:bg-accent/50 border-l-4 border-l-transparent",
                          "animate-fade-in"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Avatar */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <span className="text-lg font-semibold text-primary">
                            {patient.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{patient.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {(() => {
                              const { label, prefix, isFuture } = getSessionLabel(patient);
                              return (
                                <>
                                  <Clock className="h-3 w-3" />
                                  {prefix ? (
                                    <span className={isFuture ? 'text-primary font-medium' : ''}>
                                      {prefix}: {label}
                                    </span>
                                  ) : (
                                    <span className="italic">{label}</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Tags mini */}
                        <div className="hidden sm:flex items-center gap-1">
                          {patient.tags?.slice(0, 2).map((tag: string) => (
                            <div key={tag} className={cn(
                              "h-2 w-2 rounded-full",
                              // Simple color mapping based on tag name length/char code roughly
                              tag === 'Activo' ? 'bg-green-500' :
                                tag === 'Nuevo' ? 'bg-blue-500' : 'bg-gray-400'
                            )} title={tag} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Detail Panel */}
          <div className="lg:col-span-1 lg:h-[calc(100vh-260px)] lg:overflow-y-auto">
            {selectedPatientData ? (
              <Card variant="default" className="animate-scale-in h-full flex flex-col">
                <CardHeader className="text-center pb-2 flex-shrink-0 relative">
                  {/* Botones acción en esquina superior derecha */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Exportar expediente PDF"
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                    >
                      {isExportingPDF
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Editar paciente" onClick={handleEditPatient}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {confirmDeletePatient ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={handleDeletePatient}
                          disabled={isDeletingPatient}
                        >
                          {isDeletingPatient ? <Loader2 className="h-3 w-3 animate-spin" /> : '¿Eliminar?'}
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDeletePatient(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Eliminar paciente"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeletePatient(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-3xl font-bold text-primary">
                      {selectedPatientData?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??'}
                    </span>
                  </div>
                  <CardTitle className="text-xl">{selectedPatientData?.name || 'Sin nombre'}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {(selectedPatientData?.date_of_birth || selectedPatientData?.dateOfBirth)
                      ? `${differenceInYears(new Date(), parseISO(selectedPatientData.date_of_birth || selectedPatientData.dateOfBirth))} años`
                      : 'Edad desconocida'}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0">
                  <Tabs defaultValue="info" className="w-full">
                    <div className="px-6"> {/* Padding wrapper for TabsList */}
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="info">Información</TabsTrigger>
                        <TabsTrigger value="history">Historial Clínico</TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Tab: INFORMACIÓN */}
                    <TabsContent value="info" className="p-6 space-y-6 pt-4">
                      {/* Contact Info */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/30">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{selectedPatientData.email || 'Sin email'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/30">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedPatientData.phone || 'Sin teléfono'}</span>
                        </div>
                        {/* CURP, Sexo, Ocupaci\u00f3n (NOM-024) */}
                        {(selectedPatientData.curp || selectedPatientData.sex || selectedPatientData.occupation) && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Datos oficiales (NOM-024)
                            </p>
                            {selectedPatientData.curp && (
                              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                                <span className="text-muted-foreground">CURP</span>
                                <span className="font-mono font-medium tracking-wide text-xs">{selectedPatientData.curp}</span>
                              </div>
                            )}
                            {selectedPatientData.sex && (
                              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                                <span className="text-muted-foreground">Sexo</span>
                                <span>{selectedPatientData.sex === 'F' ? 'Femenino' : selectedPatientData.sex === 'M' ? 'Masculino' : 'No especificado'}</span>
                              </div>
                            )}
                            {selectedPatientData.occupation && (
                              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                                <span className="text-muted-foreground">Ocupaci\u00f3n</span>
                                <span>{selectedPatientData.occupation}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contacto de emergencia */}
                        {(selectedPatientData.emergency_contact_name || selectedPatientData.emergency_contact_phone) && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto de emergencia</p>
                            {selectedPatientData.emergency_contact_name && (
                              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                                <span className="text-muted-foreground">Nombre</span>
                                <span>{selectedPatientData.emergency_contact_name}</span>
                              </div>
                            )}
                            {selectedPatientData.emergency_contact_phone && (
                              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                                <span className="text-muted-foreground">Tel\u00e9fono</span>
                                <span>{selectedPatientData.emergency_contact_phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div>
                        <h4 className="text-sm font-medium mb-3">Etiquetas</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPatientData.tags?.length > 0 ? selectedPatientData.tags.map((tag: string) => (
                            <Badge
                              key={tag}
                              variant={(tagColors[tag] || 'secondary') as any}
                            >
                              {tag}
                            </Badge>
                          )) : (
                            <p className="text-sm text-muted-foreground italic">Sin etiquetas</p>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Notas Administrativas</h4>
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 min-h-[80px]">
                          {selectedPatientData.notes || 'Sin notas administrativas.'}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => navigate('/calendar')}
                        >
                          <Calendar className="h-4 w-4" />
                          Agendar Nueva Cita
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Tab: HISTORIAL */}
                    <TabsContent value="history" className="p-6 pt-4 space-y-4">
                      {notesLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : patientNotes.length === 0 ? (
                        <div className="text-center py-8 space-y-3">
                          <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center mx-auto">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground text-sm">
                            No hay notas clínicas registradas
                          </p>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                            Crear nota manualmente en Notas
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {patientNotes.map((note) => (
                            <div key={note.id} className="border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors bg-card">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="bg-background">
                                  Sesión #{note.session_number}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {format(parseISO(note.date), "d MMM yyyy", { locale: es })}
                                </span>
                              </div>

                              {/* Agenda Topics */}
                              {note.agenda && note.agenda.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                    <Brain className="h-3 w-3" />
                                    Temas
                                  </div>
                                  <p className="text-sm pl-4.5 border-l-2 border-primary/20 pl-2">
                                    {note.agenda.map((a: any) => a.topic).filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                              )}

                              {/* Mood Short View */}
                              {note.mood?.rating && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                  <span>Ánimo:</span>
                                  <div className="h-1.5 w-16 bg-muted-foreground/20 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${note.mood.rating}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{note.mood.rating}/100</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card variant="flat" className="h-full flex flex-col items-center justify-center text-center p-8 sticky top-24">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                  <User className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">Selecciona un paciente</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  Elige un paciente de la lista para ver su expediente completo e historial.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* New Patient Dialog */}
        <NewPatientDialog
          open={isNewPatientOpen}
          onOpenChange={(open) => {
            setIsNewPatientOpen(open);
            if (!open) setEditingPatient(null);
          }}
          onPatientAdded={() => {
            fetchPatients();
            setEditingPatient(null);
          }}
          editingPatient={editingPatient}
        />
      </div>
    </Layout>
  );
};

export default Patients;

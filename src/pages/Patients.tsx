import Layout from '@/components/Layout';
import {
  ShieldCheck,
  Brain,
  FileText,
  ShoppingCart,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  User,
  Loader2,
  Clock,
  Pencil,
  Trash2,
  Users,
  Download,
  ClipboardList,
  TrendingUp,
  X,
  Activity,
  DollarSign,
  LineChart as LucideLineChart
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import {
    LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { psychometricTests } from '@/lib/psychometricTests';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mockPatients, tagColors } from '@/lib/mockData';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import NewPatientDialog from '@/components/patients/NewPatientDialog';
import AssignTestDialog from '@/components/patients/AssignTestDialog';
import { useOrganization } from '@/hooks/useOrganization';
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
  const { organization } = useOrganization();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);

  const selectPatient = (id: string) => {
    setSelectedPatient(id);
    setConfirmDeletePatient(false);
  };
  const [patients, setPatients] = useState<any[]>([]);

  // Hover tooltip
  const [hoveredPatient, setHoveredPatient] = useState<string | null>(null);
  const [tooltipSummaries, setTooltipSummaries] = useState<Record<string, string>>({});
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTooltipSummary = useCallback(async (patientId: string) => {
    if (tooltipSummaries[patientId] !== undefined) return;
    const { data } = await supabase
      .from('session_notes')
      .select('agenda, action_plan, bridge, date')
      .eq('organization_id', organization?.id)
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    let summary = 'Sin notas clínicas registradas.';
    if (data) {
      const topics = data.agenda?.map((a: any) => a.topic).filter(Boolean).join(', ');
      const plan = data.action_plan?.trim();
      if (plan) summary = plan.length > 90 ? plan.slice(0, 90) + '…' : plan;
      else if (topics) summary = `Temas: ${topics}`;
    }
    setTooltipSummaries(prev => ({ ...prev, [patientId]: summary }));
  }, [tooltipSummaries]);

  const handleMouseEnter = (patientId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimer.current = setTimeout(() => {
      fetchTooltipSummary(patientId);
      setHoveredPatient(patientId);
      setTooltipPos({ x: rect.left + 60, y: rect.top - 8 });
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredPatient(null);
    setTooltipPos(null);
  };
  const [isLoading, setIsLoading] = useState(true);

  // 360 View States
  const [patientTests, setPatientTests] = useState<any[]>([]);
  const [patientPayments, setPatientPayments] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [viewingTest, setViewingTest] = useState<any | null>(null);
  const [isAssignTestOpen, setIsAssignTestOpen] = useState(false);


  // Notas del paciente seleccionado
  const [patientNotes, setPatientNotes] = useState<SessionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Editar / Eliminar / Exportar
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [confirmDeletePatient, setConfirmDeletePatient] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Cargar pacientes desde Supabase
  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date().toISOString();

      const { data: patientsData, error: pErr } = await supabase
        .from('patients')
        .select('*')
        .eq('organization_id', organization?.id)
        .is('deleted_at', null)
        .order('name');
      if (pErr) throw pErr;

      // Traer citas
      const { data: aptsData } = await supabase
        .from('appointments')
        .select('patient_id, start_time, status')
        .eq('organization_id', organization?.id)
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
  }, [organization?.id]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const fetchPatientDetails = useCallback(async (patientId: string) => {
    setDataLoading(true);
    setNotesLoading(true);
    try {
      // 1. Fetch Clinical Notes
      const { data: notesData, error: notesErr } = await supabase
        .from('session_notes')
        .select('id, date, session_number, agenda, mood, created_at')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });
      if (notesErr) throw notesErr;
      setPatientNotes((notesData as SessionNote[]) || []);

      // 2. Fetch Tests
      const { data: testsData, error: testsErr } = await supabase
        .from('patient_tests')
        .select('id, test_type, status, score, interpretation, created_at, completed_at, answers')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (testsErr) throw testsErr;
      setPatientTests(testsData || []);

      // 3. Fetch Payments
      const { data: paymentsData, error: paymentsErr } = await supabase
        .from('payments')
        .select(`
            id, amount, method, status, paid_at, created_at,
            appointments!inner (
                patient_id,
                start_time
            )
        `)
        .eq('appointments.patient_id', patientId)
        .order('created_at', { ascending: false });
      if (paymentsErr) throw paymentsErr;
      setPatientPayments(paymentsData || []);

    } catch (err: any) {
      toast.error('Error al cargar expediente: ' + err.message);
    } finally {
      setDataLoading(false);
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientDetails(selectedPatient);
    } else {
      setPatientNotes([]);
      setPatientTests([]);
      setPatientPayments([]);
    }
  }, [selectedPatient, fetchPatientDetails]);

  // Timeline consolidation
  const timelineItems = [
    ...patientNotes.map(n => ({ 
      type: 'note', 
      date: n.date, 
      title: `Sesión #${n.session_number}`,
      data: n 
    })),
    ...patientTests.filter(t => t.completed_at).map(t => ({ 
      type: 'test', 
      date: t.completed_at!, 
      title: psychometricTests[t.test_type]?.name || t.test_type,
      score: t.score,
      data: t 
    })),
    ...patientPayments.filter(p => p.paid_at).map(p => ({ 
      type: 'payment', 
      date: p.paid_at!, 
      title: `Pago Recibido: $${p.amount}`,
      data: p 
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


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
      const { data: notesData } = await supabase
        .from('session_notes')
        .select('id, date, session_number, mood, bridge, agenda, beliefs, action_plan, cie10_code, cie10_description, diagnostico_principal')
        .eq('patient_id', selectedPatientData.id)
        .is('deleted_at', null)
        .order('session_number', { ascending: true });

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
    <>
      <Layout>
        <div className="space-y-6">
          {/* Unified Header: Title, Search & Actions */}
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-2xl font-black tracking-tight">Pacientes</h1>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Expediente Clínico 360°</p>
              </div>
            </div>

            <div className="w-full lg:max-w-md">
              <PatientAutocomplete
                value={selectedPatient || ''}
                onSelect={(id) => {
                  setSelectedPatient(id);
                }}
                placeholder="Selecciona un paciente..."
              />
            </div>

            <div className="flex gap-3 w-full lg:w-auto justify-end">
              <Button variant="zen" size="sm" className="h-10 text-xs font-bold px-4 shadow-lg shadow-primary/20" onClick={() => setIsNewPatientOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Button>
            </div>
          </div>

          {/* Full-Width Content Area */}
          <div className="w-full">
            {selectedPatientData ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card variant="flat" className="min-h-[calc(100vh-280px)] overflow-hidden flex flex-col border-border/50 shadow-medium">
                  {/* Detailed Information Section */}
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left: Basic Info (Compact Sidebar) */}
                    <div className="lg:w-80 border-r border-border bg-muted/30 p-8 flex-shrink-0">
                      <div className="flex flex-col items-center text-center mb-8">
                        <div className="relative mb-4 group">
                          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/40 transition-all">
                            <User className="h-12 w-12 text-primary" />
                          </div>
                          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white hover:bg-primary-dark uppercase text-[9px] px-2 py-0.5">
                            {selectedPatientData.status}
                          </Badge>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedPatientData.name}</h2>
                        <p className="text-sm text-muted-foreground mt-1 truncate max-w-full italic">ID: {selectedPatientData.id.slice(0,8)}</p>
                      </div>

                      <div className="space-y-5">
                        <div className="p-3 rounded-lg bg-white/50 border border-border/50 hover:bg-white transition-colors">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Contacto</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              <span>{selectedPatientData.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-primary" />
                              <span className="truncate">{selectedPatientData.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {selectedPatientData.last_session && (
                          <div className="p-3 rounded-lg bg-white/50 border border-border/50">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Última Visita</p>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              <span>{format(new Date(selectedPatientData.last_session), 'd MMMM, yyyy', { locale: es })}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 mt-8">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-10 border-primary/20 hover:bg-primary/5"
                          onClick={() => {
                            setEditingPatient(selectedPatientData);
                            setIsNewPatientOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Editar Perfil
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-10 text-destructive hover:bg-destructive/10 border-destructive/20"
                          onClick={() => {
                            if (window.confirm('¿Estás seguro de que deseas eliminar este expediente? Esta acción lo archivará según la NOM-024.')) {
                              handleDeletePatient();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </Button>
                      </div>
                    </div>

                    {/* Right: Modern Tabbed Layout */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                      <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-8 border-b border-border bg-muted/5">
                          <TabsList className="h-14 w-full justify-start gap-8 bg-transparent border-none p-0 overflow-x-auto no-scrollbar">
                            <TabsTrigger
                              value="info"
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-14 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              General
                            </TabsTrigger>
                            <TabsTrigger
                              value="timeline"
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-14 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              Actividad 360°
                            </TabsTrigger>
                            <TabsTrigger
                              value="evolution"
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-14 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              Evolución Clín.
                            </TabsTrigger>
                            <TabsTrigger
                              value="tests"
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-14 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              Pruebas
                            </TabsTrigger>
                            <TabsTrigger
                              value="history"
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-14 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              Notas
                            </TabsTrigger>
                            <TabsTrigger
                              value="economy"
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-14 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                              Economía
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scrollbar-zen">
                          <TabsContent value="info" className="m-0 space-y-6 animate-in fade-in duration-500">
                            {/* General section content remains the same but benefits from extra width */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <section className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                                  <User className="h-5 w-5 text-primary" /> Datos Personales
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Edad</p>
                                    <p className="font-medium">
                                      {selectedPatientData.date_of_birth 
                                        ? `${differenceInYears(new Date(), parseISO(selectedPatientData.date_of_birth))} años` 
                                        : 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Género</p>
                                    <p className="font-medium">
                                      {selectedPatientData.sex === 'F' ? 'Femenino' : 
                                       selectedPatientData.sex === 'M' ? 'Masculino' : 
                                       selectedPatientData.sex === 'otro' ? 'Otro' : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Ocupación</p>
                                    <p className="font-medium">{selectedPatientData.occupation || 'N/A'}</p>
                                  </div>
                                </div>
                              </section>

                              <section className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                                  <Brain className="h-5 w-5 text-secondary" /> Motivo de Consulta
                                </h3>
                                <div className="bg-muted/30 p-4 rounded-xl text-sm leading-relaxed min-h-[100px]">
                                  {selectedPatientData.notes || 'No hay notas registradas para este paciente.'}
                                </div>
                              </section>
                            </div>
                          </TabsContent>

                          <TabsContent value="timeline" className="m-0 animate-in fade-in duration-500">
                            <div className="max-w-4xl mx-auto py-4">
                              <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold">Línea de Tiempo Integral</h3>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                  Total: {timelineItems.length} eventos
                                </Badge>
                              </div>

                              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
                                {dataLoading ? (
                                  <div className="flex justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                  </div>
                                ) : timelineItems.length === 0 ? (
                                  <div className="text-center p-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                                    <Clock className="h-10 w-10 mx-auto text-muted-foreground opacity-30 mb-4" />
                                    <p className="text-muted-foreground font-medium">No hay actividad registrada aún.</p>
                                  </div>
                                ) : (
                                  timelineItems.map((item, idx) => {
                                    const iconMap: any = {
                                      note: <FileText className="h-4 w-4 text-primary" />,
                                      test: <Brain className="h-4 w-4 text-accent" />,
                                      payment: <ShoppingCart className="h-4 w-4 text-secondary" />
                                    };
                                    const bgMap: any = {
                                      note: 'bg-primary/15',
                                      test: 'bg-accent/15',
                                      payment: 'bg-secondary/15'
                                    };

                                    const score = (item as any).score;
                                    return (
                                      <div key={idx} className="relative flex items-center gap-6 group">
                                        <div className={cn("flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center z-10 shadow-sm transition-transform duration-300 group-hover:scale-110", bgMap[item.type])}>
                                          {iconMap[item.type]}
                                        </div>
                                        <div className="flex-1 bg-white p-5 rounded-2xl border border-border shadow-soft hover:shadow-medium transition-all group-hover:-translate-y-1">
                                          <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                                              {item.type === 'note' ? 'Sesión Clínica' : item.type === 'test' ? 'Prueba Aplicada' : 'Pago Recibido'}
                                            </span>
                                            <span className="text-[10px] font-mono opacity-40">{format(parseISO(item.date), 'dd/MM/yyyy HH:mm')}</span>
                                          </div>
                                          <p className="text-sm font-semibold text-foreground/90">{item.title}</p>
                                          {item.type === 'test' && score !== undefined && (
                                            <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">Puntaje: {score}</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="evolution" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-8">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-bold">Progreso Terapéutico</h3>
                                  <p className="text-sm text-muted-foreground">Evolución de síntomas basada en pruebas estandarizadas.</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* GAD-7 Chart */}
                                <Card className="p-6 border-border/50 shadow-soft">
                                  <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-sm uppercase tracking-wide text-primary">Ansiedad (GAD-7)</h4>
                                    <Activity className="h-4 w-4 text-primary opacity-30" />
                                  </div>
                                  <div className="h-[280px] w-full">
                                    {patientTests.filter(t => t.test_type === 'gad7' && t.status === 'completed').length >= 2 ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart data={patientTests.filter(t => t.test_type === 'gad7' && t.status === 'completed').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                          <XAxis dataKey="created_at" tickFormatter={(val) => format(parseISO(val), 'd MMM')} fontSize={10} tick={{fill: '#888'}} />
                                          <YAxis fontSize={10} domain={[0, 21]} tick={{fill: '#888'}} />
                                          <RechartsTooltip
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                            labelFormatter={(val) => format(parseISO(val), 'd MMMM, yyyy')}
                                          />
                                          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </RechartsLineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed">
                                        <LucideLineChart className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                                        <p className="text-xs text-muted-foreground">Se necesitan al menos 2 pruebas completadas para generar la gráfica.</p>
                                      </div>
                                    )}
                                  </div>
                                </Card>

                                {/* PHQ-9 Chart */}
                                <Card className="p-6 border-border/50 shadow-soft">
                                  <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-sm uppercase tracking-wide text-accent">Depresión (PHQ-9)</h4>
                                    <Activity className="h-4 w-4 text-accent opacity-30" />
                                  </div>
                                  <div className="h-[280px] w-full">
                                    {patientTests.filter(t => t.test_type === 'phq9' && t.status === 'completed').length >= 2 ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <RechartsLineChart data={patientTests.filter(t => t.test_type === 'phq9' && t.status === 'completed').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                          <XAxis dataKey="created_at" tickFormatter={(val) => format(parseISO(val), 'd MMM')} fontSize={10} tick={{fill: '#888'}} />
                                          <YAxis fontSize={10} domain={[0, 27]} tick={{fill: '#888'}} />
                                          <RechartsTooltip
                                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                            labelFormatter={(val) => format(parseISO(val), 'd MMMM, yyyy')}
                                          />
                                          <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--accent))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </RechartsLineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed">
                                        <LucideLineChart className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
                                        <p className="text-xs text-muted-foreground">Se necesitan al menos 2 pruebas completadas para generar la gráfica.</p>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="tests" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Historial de Psicometría</h3>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-8 border-primary/20 text-primary"
                                  onClick={() => setIsAssignTestOpen(true)}
                                >
                                  Asignar Nueva
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {patientTests.map((t) => (
                                  <Card key={t.id} className="p-4 border-border/40 hover:border-primary/30 transition-all hover:shadow-medium cursor-default group">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="h-10 w-10 rounded-xl bg-accent/5 flex items-center justify-center group-hover:bg-accent/10 transition-all">
                                        <Brain className="h-5 w-5 text-accent" />
                                      </div>
                                      <Badge className={t.status === 'completed' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                                        {t.status === 'completed' ? 'Completada' : 'Pendiente'}
                                      </Badge>
                                    </div>
                                    <h4 className="font-bold text-sm mb-1">{psychometricTests[t.test_type]?.name || t.test_type}</h4>
                                    <p className="text-[10px] text-muted-foreground mb-4">{format(parseISO(t.created_at), 'd MMMM, yyyy', { locale: es })}</p>

                                    {t.status === 'completed' && (
                                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                        <div className="text-xs font-bold text-accent">Score: {t.score}</div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-[10px] uppercase font-bold tracking-wider px-2 hover:bg-black/5"
                                          onClick={() => setViewingTest(t)}
                                        >
                                          Ver Respuestas
                                        </Button>
                                      </div>
                                    )}
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="history" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Cronología de Sesiones</h3>
                                <Button size="sm" variant="outline" className="text-xs h-8 border-primary/20 text-primary">Exportar Historial</Button>
                              </div>
                              <div className="space-y-4">
                                {patientNotes.map((note) => (
                                  <div key={note.id} className="p-5 rounded-2xl border border-border bg-white shadow-soft transition-all hover:shadow-medium">
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                          <FileText className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-muted-foreground uppercase opacity-50">Sesión Clínica</p>
                                          <p className="text-sm font-bold">{format(new Date(note.date), 'd MMMM, yyyy', { locale: es })}</p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-[9px] uppercase tracking-widest">{note.session_number}</Badge>
                                    </div>
                                    <div className="line-clamp-3 text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl italic">
                                      "{Array.isArray(note.agenda) ? note.agenda.map(a => a.topic).join(', ') : 'Resumen de sesión'}"
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="economy" className="m-0 animate-in fade-in duration-500">
                            <div className="space-y-8">
                              <h3 className="text-xl font-bold">Estado de Cuenta</h3>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                  <div>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Total Pagado</p>
                                    <p className="text-3xl font-black text-primary">
                                      ${patientPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + Number(p.amount), 0)}
                                    </p>
                                  </div>
                                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-primary" />
                                  </div>
                                </div>
                                <div className="p-6 rounded-2xl bg-secondary/5 border border-secondary/20 flex items-center justify-between">
                                  <div>
                                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                    <p className="text-3xl font-black text-secondary">
                                      ${patientPayments.filter(p => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0)}
                                    </p>
                                  </div>
                                  <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-secondary" />
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-border overflow-hidden shadow-soft bg-white">
                                <div className="bg-muted/30 px-6 py-4 border-b border-border">
                                  <h4 className="text-sm font-bold flex items-center gap-2">
                                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                    Detalle de Transacciones
                                  </h4>
                                </div>
                                <div className="divide-y divide-border">
                                  {patientPayments.map((p) => (
                                    <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", p.status === 'paid' ? 'bg-success/10' : 'bg-warning/10')}>
                                          <DollarSign className={cn("h-4 w-4", p.status === 'paid' ? 'text-success' : 'text-warning')} />
                                        </div>
                                        <div>
                                          <p className="text-sm font-bold">${p.amount}</p>
                                          <p className="text-[10px] text-muted-foreground">{p.method.charAt(0).toUpperCase() + p.method.slice(1)} • {format(parseISO(p.paid_at || p.created_at), 'd MMM')}</p>
                                        </div>
                                      </div>
                                      <Badge variant={p.status === 'paid' ? 'outline' : 'secondary'} className={cn("text-[9px] uppercase tracking-widest px-2", p.status === 'paid' ? 'border-success/30 text-success' : '')}>
                                        {p.status === 'paid' ? 'Cobrado' : 'Pendiente'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-320px)] bg-muted/20 rounded-3xl border-2 border-dashed border-border/60 animate-in fade-in zoom-in duration-700">
                <div className="relative mb-8">
                  <div className="h-32 w-32 rounded-full bg-primary/5 flex items-center justify-center relative z-10">
                    <Brain className="h-16 w-16 text-primary opacity-20" />
                  </div>
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl animate-pulse"></div>
                </div>
                <h2 className="text-2xl font-black text-foreground/40 tracking-tight">Expediente Clínico 360°</h2>
                <p className="text-muted-foreground mt-2 max-w-sm text-center leading-relaxed font-medium">
                  Busca y selecciona un paciente en la barra superior para acceder a su historial completo, evolución y finanzas.
                </p>
                <div className="mt-8 flex gap-4">
                   <div className="flex items-center gap-2 text-xs font-bold text-primary/40 uppercase tracking-widest">
                     <Search className="h-3.5 w-3.5" /> Escribe al menos 3 letras
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>

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

      {selectedPatientData && (
        <AssignTestDialog
          open={isAssignTestOpen}
          onOpenChange={setIsAssignTestOpen}
          patientId={selectedPatientData.id}
          patientName={selectedPatientData.name}
          onAssigned={() => {
            fetchPatientDetails(selectedPatientData.id); // Changed from fetchPatientSessionData to fetchPatientDetails
          }}
        />
      )}

      {/* Test Answers Dialog */}
      <Dialog open={!!viewingTest} onOpenChange={(open) => !open && setViewingTest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {viewingTest && (psychometricTests[viewingTest.test_type]?.name || viewingTest.test_type)}
            </DialogTitle>
            <DialogDescription>
              Resultados detallados y respuestas del paciente
            </DialogDescription>
          </DialogHeader>

          {viewingTest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Puntaje Total</p>
                  <p className="text-2xl font-black text-primary">{viewingTest.score} pts</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Interpretación</p>
                  <Badge variant="secondary" className="text-xs">{viewingTest.interpretation}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2 px-1">
                  <Brain className="h-4 w-4 text-primary" /> Respuestas Registradas
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {psychometricTests[viewingTest.test_type]?.questions.map((q: any) => {
                    const patientAnswerValue = viewingTest.answers?.[q.id];
                    const selectedOption = q.options.find((opt: any) => opt.value === patientAnswerValue);
                    
                    return (
                      <div key={q.id} className="p-3 rounded-xl border bg-card/50 shadow-sm space-y-2">
                        <p className="text-xs font-medium leading-tight">{q.text}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {selectedOption ? selectedOption.label : 'Sin respuesta'}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {patientAnswerValue !== undefined ? `(${patientAnswerValue} pts)` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Tooltip — portal renders above all overflow:hidden containers */}
      {
        hoveredPatient && tooltipPos && createPortal(
          <div
            className="pointer-events-none fixed z-[1000] w-64 animate-fade-in"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translateY(-100%)' }}
          >
            <div className="rounded-xl border border-border bg-background shadow-2xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">IA · Última nota</span>
                <div className="h-px flex-1 bg-primary/20" />
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {tooltipSummaries[hoveredPatient] !== undefined
                  ? tooltipSummaries[hoveredPatient]
                  : <span className="animate-pulse text-muted-foreground">Cargando…</span>
                }
              </p>
            </div>
            <div className="ml-5 h-2 w-2 rotate-45 border-b border-r border-border bg-background -mt-[5px]" />
          </div>,
          document.body
        )
      }
    </>
  );
};

export default Patients;


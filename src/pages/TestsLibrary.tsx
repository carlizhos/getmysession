import Layout from '@/components/Layout';
import FeatureGate from '@/components/subscription/FeatureGate';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, ExternalLink, CheckCircle2, Clock, Copy, Plus, Activity, BrainCircuit, User, X, Loader2, MessageCircle, Mail, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { psychometricTests } from '@/lib/psychometricTests';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { PatientTest } from '@/types';

interface PatientTestWithPatient extends PatientTest {
  patients: { name: string } | null;
}

const TestsLibrary = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'assigned'>('catalog');
  const [assignedTests, setAssignedTests] = useState<PatientTestWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');

  // Results details state
  const [viewingTest, setViewingTest] = useState<PatientTestWithPatient | null>(null);
  const [patientFilter, setPatientFilter] = useState('');
  const patientSearchRef = useRef<HTMLInputElement>(null);
  const { organization } = useOrganization();

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [activeShareToken, setActiveShareToken] = useState('');
  const [activeShareTestName, setActiveShareTestName] = useState('');

  const fetchAssignedTests = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('patient_tests')
        .select(`
          id, test_type, token, status, answers, score, interpretation, created_at, completed_at,
          patients (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignedTests(data as PatientTestWithPatient[]);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error('Error al cargar pruebas asignadas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'assigned') {
      fetchAssignedTests();
    }
  }, [activeTab]);

  const handleAssignTest = async (testIdInput?: string) => {
    const testToAssign = testIdInput || selectedTestId;
    if (!selectedPatientId || !testToAssign) {
      if (!selectedPatientId) {
        toast.error('Selecciona un paciente en la cabecera primero');
        patientSearchRef.current?.focus();
      } else {
        toast.error('Selecciona una prueba para asignar.');
      }
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión activa');

      const { data, error } = await supabase.from('patient_tests').insert({
        user_id: user.id,
        patient_id: selectedPatientId,
        test_type: testToAssign,
        organization_id: organization?.id,
      }).select('token').single();

      if (error) throw error;

      // Prepare share modal
      const testName = psychometricTests[testToAssign]?.name || testToAssign;
      setActiveShareToken(data.token);
      setActiveShareTestName(testName);
      setShareModalOpen(true);
      
      toast.success('Prueba generada correctamente');
      setIsAssignModalOpen(false);
      // We don't clear selection yet so the share message can use the name
    } catch (err: unknown) {
      const error = err as Error;
      toast.error('Error al asignar prueba: ' + error.message);
    }
  };

  const clearSelection = () => {
    setSelectedPatientId('');
    setSelectedPatientName('');
    setPatientFilter('');
    setActiveTab('catalog');
    setTimeout(() => {
      patientSearchRef.current?.focus();
    }, 100);
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/t/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Enlace de la prueba copiado al portapapeles');
  };

  const testsList = Object.values(psychometricTests);

  return (
    <Layout>
      <FeatureGate feature="core_tests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black tracking-tight">Biblioteca de Pruebas</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Gestiona y asigna tests psicométricos de forma simple</p>
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
              size="sm"
              className="h-10 text-xs font-bold px-4 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all gap-2"
              onClick={clearSelection}
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Selección</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'catalog' | 'assigned')}>
          <TabsList>
            <TabsTrigger value="catalog" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Catálogo de Pruebas
            </TabsTrigger>
            <TabsTrigger value="assigned" className="gap-2">
              <Activity className="h-4 w-4" />
              Asignadas / Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testsList.map((test) => (
                <Card key={test.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="bg-primary/10 p-2 rounded-lg mb-3">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="secondary">{test.questions.length} preguntas</Badge>
                    </div>
                    <CardTitle className="text-xl">{test.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Esta prueba califica automáticamente y guarda la interpretación en el expediente.
                    </p>
                  </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full gap-2" 
                        variant="zen"
                        onClick={() => handleAssignTest(test.id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Generar link
                      </Button>
                    </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assigned" className="mt-6">
            <Card>
              <CardHeader className="pb-3 border-b mb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Pruebas Asignadas</CardTitle>
                    <CardDescription>Seguimiento y resultados de tests psicométricos</CardDescription>
                  </div>
                  <div className="relative max-w-sm w-full">
                    <PatientAutocomplete
                      value=""
                      onSelect={(id, name) => setPatientFilter(name)}
                      placeholder="Filtrar por paciente..."
                      className="bg-background"
                    />
                    {patientFilter && (
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="absolute right-10 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                        onClick={() => setPatientFilter('')}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Cargando pruebas asignadas...</div>
                ) : assignedTests.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <ClipboardList className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No hay pruebas asignadas</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[300px]">
                      Aún no has asignado ninguna prueba psicométrica a tus pacientes.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setActiveTab('catalog')}>
                      Ir al catálogo
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {assignedTests
                      .filter(t => !patientFilter || t.patients?.name.toLowerCase().includes(patientFilter.toLowerCase()))
                      .map((t) => {
                      const testInfo = psychometricTests[t.test_type];
                      return (
                        <div key={t.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                              t.status === 'completed' ? "bg-success/10 text-success" : "bg-amber-100 text-amber-600"
                            )}>
                              {t.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{testInfo?.name || t.test_type}</h4>
                                {t.status === 'completed' ? (
                                  <Badge className="bg-success text-success-foreground hover:bg-success/90">Completada</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pendiente</Badge>
                                )}
                              </div>
                              <p className="text-sm">
                                <span className="text-muted-foreground">Paciente: </span>
                                <span className="font-medium">{t.patients?.name || 'Desconocido'}</span>
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>Asignada: {format(new Date(t.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                {t.completed_at && (
                                  <>
                                    <span>•</span>
                                    <span>Resuelta: {format(new Date(t.completed_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center sm:justify-end gap-3 min-w-[200px]">
                            {t.status === 'completed' ? (
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="gap-2 h-9"
                                  onClick={() => setViewingTest(t)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Ver Respuestas
                                </Button>
                                <div className="bg-primary/5 border border-primary/20 px-4 py-1.5 rounded-lg text-sm flex gap-3 text-right">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-0">Puntaje</p>
                                    <p className="font-bold text-lg text-primary leading-none">{t.score}</p>
                                  </div>
                                  <div className="border-l border-primary/20 pl-3 flex flex-col justify-center">
                                    <span className="font-medium text-foreground text-xs">{t.interpretation}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="gap-2" onClick={() => copyLink(t.token)}>
                                <Copy className="h-4 w-4" />
                                Copiar Link
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Prueba Psicométrica</DialogTitle>
            <DialogDescription>
              Selecciona al paciente que contestará el test {selectedTestId ? psychometricTests[selectedTestId]?.name : ''}. Te daremos un link único para enviárselo por WhatsApp o correo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente</label>
              <PatientAutocomplete
                value={selectedPatientId}
                onSelect={(id, name) => {
                  setSelectedPatientId(id);
                  setSelectedPatientName(name);
                }}
              />
            </div>
            <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
              <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="mb-1"><strong>¿Qué sigue?</strong></p>
                Al asignar la prueba, se generará un <strong className="text-foreground">enlace público único</strong>.
                Solo debes copiarlo y enviarlo a tu paciente. Todo lo demás es automático.
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancelar</Button>
            <Button variant="zen" onClick={handleAssignTest}>Asignar y Generar Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTest} onOpenChange={(open) => !open && setViewingTest(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-none shadow-2xl animate-in zoom-in-95 duration-200 rounded-[2rem] flex flex-col max-h-[90vh]">
          {/* ── Header Section ────────────────────────────────────────── */}
          <div className="shrink-0 px-6 sm:px-12 py-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
                <ClipboardList className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate">
                  {viewingTest ? psychometricTests[viewingTest.test_type]?.name : 'Detalles de la Prueba'}
                </h2>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  Respuestas de <strong>{viewingTest?.patients?.name}</strong> • {viewingTest?.completed_at ? format(new Date(viewingTest.completed_at), "d 'de' MMMM, yyyy", { locale: es }) : ''}
                </p>
              </div>
            </div>
          </div>
          
          {/* ── Content Area (Scrollable) ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 space-y-10 scrollbar-hide">
            {viewingTest && (
              <div className="space-y-10">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Puntaje Total</p>
                    <p className="text-4xl font-black text-primary">{viewingTest.score}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-2">Interpretación</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{viewingTest.interpretation}</p>
                  </div>
                </div>

                {/* Detailed Answers */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Respuestas Detalladas</h4>
                    <span className="text-[10px] text-muted-foreground font-medium italic">Sincronizado con expediente</span>
                  </div>
                  <div className="space-y-5">
                    {psychometricTests[viewingTest.test_type]?.questions.map((q, idx) => {
                      const patientAnswerValue = viewingTest.answers?.[q.id];
                      const testOptions = psychometricTests[viewingTest.test_type]?.options || [];
                      
                      return (
                        <div key={q.id} className="space-y-4 p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm">
                          <p className="text-base font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                            <span className="text-primary/40 mr-4 text-xs">{(idx + 1).toString().padStart(2, '0')}</span>
                            {q.text}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {testOptions.map((opt) => (
                              <div 
                                key={opt.value}
                                className={cn(
                                  "text-[10px] px-3 py-3 rounded-xl border text-center transition-all duration-200",
                                  (viewingTest.answers as Record<string, any>)?.[q.id] === opt.value 
                                    ? "bg-primary text-white border-primary font-black shadow-md scale-[1.02]"
                                    : "bg-slate-50/50 dark:bg-slate-900/30 text-muted-foreground border-slate-100 dark:border-slate-800 opacity-60"
                                )}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* ── Footer Button ────────────────────────────────────────── */}
          <div className="px-6 sm:px-12 pb-10 shrink-0">
            <Button 
              variant="zen" 
              className="w-full py-4 rounded-2xl text-sm font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
              onClick={() => setViewingTest(null)}
            >
              Cerrar resultados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share Modal (Success) ────────────────────────────────────────── */}
      <Dialog 
        open={shareModalOpen} 
        onOpenChange={(open) => {
          setShareModalOpen(open);
          if (!open) {
            setActiveTab('assigned');
            setSelectedPatientId('');
            setSelectedPatientName('');
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-950 border-none shadow-2xl animate-in zoom-in-95 duration-200 rounded-[2rem] flex flex-col">
          {/* ── Header Section (Redesigned Compact Style) ────────────────────────── */}
          <div className="shrink-0 bg-success/5 dark:bg-success/10 px-6 py-6 flex flex-col items-center justify-center text-center border-b border-success/10">
            <div className="h-12 w-12 bg-success/10 rounded-xl flex items-center justify-center mb-3 border border-success/20 shadow-sm animate-in fade-in zoom-in duration-500">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">¡Prueba Generada!</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 mx-auto max-w-[360px]">
              El test ya está disponible en el expediente de <strong>{selectedPatientName}</strong>.
            </p>
          </div>

          {/* ── Content Area (Redesigned Compact Style) ──────────────────────────────── */}
          <div className="px-6 py-6 space-y-5 flex flex-col">
            {/* Link Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-primary/70">Enlace de Acceso para Paciente</label>
              </div>
              <div className="group relative flex items-center">
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 pl-4 pr-12 py-3.5 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 truncate shadow-inner">
                  {`${window.location.origin}/t/${activeShareToken}`}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1.5 h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/t/${activeShareToken}`);
                    toast.success('¡Copiado al portapapeles!');
                  }}
                >
                  <Copy className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>

            {/* Sharing Grid (Compact side-by-side action pills) */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 h-11 rounded-xl border-slate-200 dark:border-slate-800 hover:border-success/30 hover:bg-success/5 transition-all text-xs font-bold text-slate-700 dark:text-slate-300"
                onClick={() => {
                  const text = encodeURIComponent(`Hola ${selectedPatientName}, te envío el enlace para realizar la prueba psicométrica *${activeShareTestName}*:\n\n${window.location.origin}/t/${activeShareToken}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
              >
                <MessageCircle className="h-4 w-4 text-success" />
                <span>WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 h-11 rounded-xl border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-bold text-slate-700 dark:text-slate-300"
                onClick={() => {
                  const subject = encodeURIComponent(`Prueba Psicométrica: ${activeShareTestName}`);
                  const body = encodeURIComponent(`Hola ${selectedPatientName},\n\nTe envío el enlace para realizar la prueba psicométrica "${activeShareTestName}":\n\n${window.location.origin}/t/${activeShareToken}\n\nQuedo a tu disposición si tienes alguna duda.`);
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
              >
                <Mail className="h-4 w-4 text-primary" />
                <span>Enviar Correo</span>
              </Button>
            </div>

            {/* Caption Info Tip */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground leading-normal text-center pt-1 border-t border-slate-100 dark:border-slate-900/50">
              <Share2 className="h-3 w-3 text-primary shrink-0" />
              <span>Resultados sincronizados en tiempo real al finalizar la prueba.</span>
            </div>
          </div>

          {/* ── Footer Button ────────────────────────────────────────── */}
          <div className="px-6 pb-6 shrink-0">
            <Button 
              variant="zen" 
              className="w-full h-11 rounded-xl text-xs font-bold shadow-md hover:shadow-primary/10 hover:scale-[1.01] active:scale-95 transition-all"
              onClick={() => setShareModalOpen(false)}
            >
              Entendido, ir al historial
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </FeatureGate>
    </Layout>
  );
};

export default TestsLibrary;

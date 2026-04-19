import Layout from '@/components/Layout';
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

interface PatientTest {
  id: string;
  test_type: string;
  token: string;
  status: 'pending' | 'completed';
  answers: Record<string, number> | null;
  score: number | null;
  interpretation: string | null;
  created_at: string;
  completed_at: string | null;
  patients: { name: string } | null;
}

const TestsLibrary = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'assigned'>('catalog');
  const [assignedTests, setAssignedTests] = useState<PatientTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');

  // Results details state
  const [viewingTest, setViewingTest] = useState<PatientTest | null>(null);
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
      setAssignedTests(data as any);
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error('Error al asignar prueba: ' + error.message);
    }
  };

  const clearSelection = () => {
    setSelectedPatientId('');
    setSelectedPatientName('');
    setPatientFilter('');
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <BrainCircuit className="h-6 w-6 text-primary" />
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
              className="w-full sm:w-auto gap-2 shadow-soft hover:scale-[1.02] transition-all"
              onClick={clearSelection}
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Selección</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{viewingTest ? psychometricTests[viewingTest.test_type]?.name : ''}</DialogTitle>
                <DialogDescription>
                  Respuestas de {viewingTest?.patients?.name} • Completada el {viewingTest?.completed_at ? format(new Date(viewingTest.completed_at), "d 'de' MMMM, yyyy", { locale: es }) : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {viewingTest && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Puntaje Total</p>
                    <p className="text-2xl font-bold text-primary">{viewingTest.score}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Interpretación</p>
                    <p className="font-semibold text-foreground leading-tight">{viewingTest.interpretation}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm border-b pb-2">Respuestas Detalladas</h4>
                  {psychometricTests[viewingTest.test_type]?.questions.map((q, idx) => {
                    const patientAnswerValue = viewingTest.answers?.[q.id];
                    const testOptions = psychometricTests[viewingTest.test_type]?.options || [];
                    
                    return (
                      <div key={q.id} className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-sm font-medium leading-normal">
                          <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                          {q.text}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {testOptions.map((opt) => (
                            <div 
                              key={opt.value}
                              className={cn(
                                "text-[10px] px-2 py-1.5 rounded border text-center transition-colors",
                                patientAnswerValue === opt.value 
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                                  : "bg-white text-muted-foreground border-slate-200"
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
            )}
          </div>
          
          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
            <Button onClick={() => setViewingTest(null)}>Cerrar</Button>
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
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-card border-none shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="bg-success/10 p-6 flex flex-col items-center justify-center text-center border-b border-success/10">
            <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center mb-4 animate-bounce duration-1000">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-success-foreground">¡Enlace Generado!</h2>
            <p className="text-sm text-success-foreground/70 mt-1">
              La prueba <strong>{activeShareTestName}</strong> ha sido asignada a <strong>{selectedPatientName}</strong>.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Link Copy Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Enlace de la prueba</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/50 border border-border px-3 py-2 rounded-lg text-xs font-mono truncate flex items-center">
                  {`${window.location.origin}/t/${activeShareToken}`}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 hover:bg-primary/5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/t/${activeShareToken}`);
                    toast.success('Enlace copiado');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Share Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="gap-2 border-success/20 hover:bg-success/5 hover:text-success hover:border-success/40 py-6 flex flex-col h-auto"
                onClick={() => {
                  const text = encodeURIComponent(`Hola ${selectedPatientName}, te envío el enlace para realizar la prueba psicométrica *${activeShareTestName}*:\n\n${window.location.origin}/t/${activeShareToken}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-xs font-semibold">WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/40 py-6 flex flex-col h-auto"
                onClick={() => {
                  const subject = encodeURIComponent(`Prueba Psicométrica: ${activeShareTestName}`);
                  const body = encodeURIComponent(`Hola ${selectedPatientName},\n\nTe envío el enlace para realizar la prueba psicométrica "${activeShareTestName}":\n\n${window.location.origin}/t/${activeShareToken}\n\nQuedo a tu disposición si tienes alguna duda.`);
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
              >
                <Mail className="h-5 w-5" />
                <span className="text-xs font-semibold">Email</span>
              </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl flex gap-3 items-start border border-border/50">
              <Share2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                El paciente podrá realizar la prueba desde cualquier dispositivo. Los resultados se guardarán automáticamente en su expediente.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted/20 border-t flex justify-end">
            <Button 
              variant="zen" 
              className="w-full sm:w-auto"
              onClick={() => setShareModalOpen(false)}
            >
              Cerrar y ver historial
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TestsLibrary;

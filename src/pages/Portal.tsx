import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Clock, 
  LogOut, 
  Loader2, 
  User, 
  XCircle, 
  AlertTriangle, 
  BrainCircuit, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Check,
  FileSignature,
  Download,
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import { psychometricTests } from '@/lib/psychometricTests';
import jsPDF from 'jspdf';
import SignaturePad from '@/components/consent/SignaturePad';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  specialist_name: string;
  specialist_avatar: string | null;
  specialist_prefix: string | null;
  management_token: string;
  reschedule_policy_hours?: number | null;
}

interface PatientTest {
  id: string;
  test_type: string;
  token: string;
  status: 'pending' | 'completed' | 'scored';
  score?: number | null;
  interpretation?: string | null;
  created_at: string;
  completed_at?: string | null;
}

interface PatientSession {
  isLoggedIn: boolean;
  accessToken: string;
  email: string;
  phone: string;
  name: string;
  expiresAt: string;
}

interface ConsentRecord {
  id: string;
  form_type: 'general' | 'tratamiento' | 'datos_personales';
  signed_at: string | null;
  is_valid: boolean;
  consent_text: string;
  signature_data_url: string | null;
  signature_hash: string | null;
  created_at: string;
  specialist_name: string | null;
  specialist_prefix: string | null;
  specialist_logo_data: string | null;
}

const FORM_TYPE_LABELS: Record<string, string> = {
  general: 'Consentimiento General',
  tratamiento: 'Tratamiento Psicológico',
  datos_personales: 'Aviso de Privacidad y Datos Personales'
};

export default function Portal() {
  const navigate = useNavigate();
  const [session, setSession] = useState<PatientSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [assignedTests, setAssignedTests] = useState<PatientTest[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'tests' | 'consents'>('appointments');
  const [loading, setLoading] = useState(true);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Signing states
  const [signingConsent, setSigningConsent] = useState<ConsentRecord | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('saudade_patient_session');
    if (!savedSession) {
      navigate('/portal/login');
      return;
    }

    const parsedSession: PatientSession = JSON.parse(savedSession);
    
    // Check if session is valid
    if (!parsedSession.isLoggedIn || !parsedSession.accessToken) {
      navigate('/portal/login');
      return;
    }

    // Check if token has expired
    if (parsedSession.expiresAt && new Date(parsedSession.expiresAt) < new Date()) {
      localStorage.removeItem('saudade_patient_session');
      toast.error('Tu sesión ha expirado. Por favor inicia sesión de nuevo.');
      navigate('/portal/login');
      return;
    }

    setSession(parsedSession);
    fetchAppointments(parsedSession.accessToken);
    fetchPatientTests(parsedSession.accessToken);
    fetchPatientConsents(parsedSession.accessToken);
  }, [navigate]);

  const fetchPatientConsents = async (accessToken: string) => {
    setLoadingConsents(true);
    try {
      const { data, error } = await supabase.rpc('get_patient_consents', {
        p_access_token: accessToken
      });
      if (error) throw error;
      setConsents(data || []);
    } catch (err: unknown) {
      console.error('Error fetching patient consents:', err);
      toast.error('Error al cargar tus documentos de consentimiento.');
    } finally {
      setLoadingConsents(false);
    }
  };

  const generatePortalPDF = (consent: ConsentRecord) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageW = doc.internal.pageSize.getWidth();
    const contentW = pageW - margin * 2;
    const title = FORM_TYPE_LABELS[consent.form_type] || 'Consentimiento Informado';

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 15);

    // Render specialist logo in top-right header if available
    if (consent.specialist_logo_data) {
        try {
            doc.addImage(consent.specialist_logo_data, 'PNG', pageW - margin - 22, 3.5, 22, 8);
            doc.text(`Folio: ${consent.id.substring(0, 8).toUpperCase()}`, pageW - margin - 24, 15, { align: 'right' });
        } catch (_) {
            doc.text(`Folio: ${consent.id.substring(0, 8).toUpperCase()}`, pageW - margin, 15, { align: 'right' });
        }
    } else {
        doc.text(`Folio: ${consent.id.substring(0, 8).toUpperCase()}`, pageW - margin, 15, { align: 'right' });
    }

    doc.setDrawColor(200, 200, 220);
    doc.line(margin, 18, pageW - margin, 18);

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageW / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Paciente: ${session?.name || '—'}`, margin, 42);
    
    const signedDate = consent.signed_at ? parseISO(consent.signed_at) : new Date();
    const dateFormatted = format(signedDate, "d 'de' MMMM 'de' yyyy", { locale: es });
    doc.text(`Fecha de firma: ${dateFormatted}`, margin, 48);

    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(consent.consent_text || '', contentW);
    let y = 58;
    lines.forEach((line: string) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5;
    });

    y += 40;
    if (y > 220) { doc.addPage(); y = 20; }

    const sigW = 80;
    const sigX = (pageW - sigW) / 2;
    doc.setDrawColor(180, 180, 200);
    doc.line(sigX, y, sigX + sigW, y);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text('Firma del paciente / tutor', pageW / 2, y + 5, { align: 'center' });
    doc.text(`Fecha de firma: ${dateFormatted}`, pageW / 2, y + 10, { align: 'center' });

    if (consent.signature_data_url) {
        try { doc.addImage(consent.signature_data_url, 'PNG', sigX, y - 35, sigW, 33); } catch (_) { }
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Documento firmado digitalmente en Saudade Portal | Página ${i} de ${totalPages}`,
            pageW / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
        );
    }

    doc.save(`consentimiento_${consent.form_type}_firmado.pdf`);
  };

  const handleSignConsent = async () => {
    if (!session || !signingConsent || !signatureDataUrl) return;
    setIsSubmittingSignature(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureDataUrl);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: success, error } = await supabase.rpc('sign_patient_consent', {
        p_access_token: session.accessToken,
        p_consent_id: signingConsent.id,
        p_signature_data_url: signatureDataUrl,
        p_signature_hash: hashHex
      });

      if (error) throw error;

      if (success) {
        toast.success('Documento firmado con éxito.');
        
        // Generate and download PDF instantly
        const signedAtStr = new Date().toISOString();
        const updatedConsent = {
          ...signingConsent,
          signed_at: signedAtStr,
          signature_data_url: signatureDataUrl,
          signature_hash: hashHex,
          is_valid: true
        };
        
        generatePortalPDF(updatedConsent);
        
        // Refresh consents list
        await fetchPatientConsents(session.accessToken);
        
        // Close modal
        setSigningConsent(null);
        setSignatureDataUrl(null);
      } else {
        toast.error('No se pudo firmar el documento.');
      }
    } catch (err: any) {
      console.error('Error signing consent:', err);
      toast.error('Error al firmar: ' + err.message);
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const fetchAppointments = async (accessToken: string) => {
    setLoading(true);
    try {
      // Use secure token-based RPC instead of email/phone
      const { data, error } = await supabase.rpc('get_patient_appointments', {
        p_access_token: accessToken
      });

      if (error) {
        // If token is invalid, redirect to login
        if (error.message.includes('invalid') || error.code === 'PGRST202') {
          localStorage.removeItem('saudade_patient_session');
          navigate('/portal/login');
          return;
        }
        throw error;
      }
      
      // Sort: upcoming first
      const sorted = (data || []).sort((a: Appointment, b: Appointment) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setAppointments(sorted);
    } catch (err: unknown) {
      const error = err as Error;
      console.error(error);
      toast.error('Error al cargar tus citas.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientTests = async (accessToken: string) => {
    setLoadingTests(true);
    try {
      const { data, error } = await supabase.rpc('get_patient_tests', {
        p_access_token: accessToken
      });

      if (error) {
        throw error;
      }

      setAssignedTests(data || []);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error fetching patient tests:', error);
      toast.error('Error al cargar tus pruebas clínicas.');
    } finally {
      setLoadingTests(false);
    }
  };

  const handleCancelAppointment = async (id: string, managementToken: string) => {
    if (!session || !confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    
    setCancelingId(id);
    try {
      // Use secure token-based cancellation
      const { data, error } = await supabase.rpc('cancel_patient_appointment', {
        p_appointment_id: id,
        p_token: managementToken
      });

      if (error) throw error;
      
      if (data) {
        toast.success('Cita cancelada con éxito.');
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
      } else {
        toast.error('No se pudo cancelar esta cita. El enlace puede haber expirado.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'No se pudo cancelar la cita.');
      console.error(error);
    } finally {
      setCancelingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('saudade_patient_session');
    navigate('/portal/login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="py-4 bg-white border-b border-border/50 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 w-full">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm tracking-tighter">S.</span>
          </div>
          <span className="font-bold tracking-tight text-lg">Saudade Portal</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-medium">{session.name}</span>
            <span className="text-xs text-muted-foreground">{session.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar Sesión">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 py-8">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-border/50 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1 text-foreground">
              {activeTab === 'appointments' 
                ? 'Mis Citas' 
                : activeTab === 'tests' 
                ? 'Mis Pruebas Clínicas' 
                : 'Mis Documentos'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'appointments' 
                ? 'Gestiona tus próximas sesiones y tu historial de atención.' 
                : activeTab === 'tests'
                ? 'Resuelve tus evaluaciones psicométricas asignadas y revisa tus resultados históricos.'
                : 'Lee y firma de forma electrónica los documentos y consentimientos informados asignados.'}
            </p>
          </div>

          <div className="flex gap-2 bg-muted/20 p-1.5 rounded-xl border border-border/40 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'appointments'
                  ? 'bg-white text-primary shadow-sm border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Mis Citas</span>
              {appointments.filter(a => a.status !== 'cancelled' && parseISO(a.start_time) >= new Date()).length > 0 && (
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                activeTab === 'tests'
                  ? 'bg-white text-primary shadow-sm border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              <span>Mis Pruebas</span>
              {assignedTests.filter(t => t.status === 'pending').length > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-bold text-white px-1 shadow-md shadow-primary/20 animate-bounce">
                  {assignedTests.filter(t => t.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('consents')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                activeTab === 'consents'
                  ? 'bg-white text-primary shadow-sm border border-border/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
              }`}
            >
              <FileSignature className="h-4 w-4" />
              <span>Mis Documentos</span>
              {consents.filter(c => !c.signed_at).length > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-[10px] font-bold text-white px-1 shadow-md shadow-amber-500/20 animate-bounce">
                  {consents.filter(c => !c.signed_at).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Appointments Tab Content */}
        {activeTab === 'appointments' && (
          appointments.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-dashed bg-muted/10 shadow-none">
              <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tienes citas próximas</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Actualmente no encontramos citas bajo este correo electrónico. Si acabas de agendar, puede tardar minutos en aparecer.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {appointments.map(apt => {
                const dateObj = parseISO(apt.start_time);
                const endObj = parseISO(apt.end_time);
                const isPast = dateObj < new Date() && apt.status !== 'cancelled';
                
                const policyHours = apt.reschedule_policy_hours !== undefined && apt.reschedule_policy_hours !== null 
                  ? apt.reschedule_policy_hours 
                  : 24;
                
                const isExpired = (dateObj.getTime() - new Date().getTime()) < policyHours * 60 * 60 * 1000;
                
                let statusText = 'Confirmada';
                let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
                if (apt.status === 'pending') { statusText = 'Pendiente'; badgeVariant = 'secondary'; }
                if (apt.status === 'cancelled') { statusText = 'Cancelada'; badgeVariant = 'destructive'; }
                if (isPast) { statusText = 'Completada'; badgeVariant = 'outline'; }

                const pName = apt.specialist_prefix && apt.specialist_prefix !== 'none' 
                  ? `${apt.specialist_prefix} ${apt.specialist_name}` 
                  : apt.specialist_name;

                return (
                  <Card key={apt.id} className="rounded-xl overflow-hidden shadow-sm flex flex-col border-border/60">
                    <CardHeader className="p-5 pb-0">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/5 text-primary p-2 rounded-lg">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <Badge variant={badgeVariant} className="font-medium">{statusText}</Badge>
                      </div>
                      <CardTitle className="text-lg font-bold mb-1">
                        {format(dateObj, "EEEE, d 'de' MMMM", { locale: es })}
                      </CardTitle>
                      <CardDescription className="text-base flex items-center gap-1.5 text-foreground/80">
                        <Clock className="w-4 h-4" />
                        {format(dateObj, "HH:mm")} - {format(endObj, "HH:mm")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 pt-4 flex-1">
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                        {apt.specialist_avatar ? (
                          <img src={apt.specialist_avatar} alt={pName} className="w-10 h-10 rounded-full object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ESPECIALISTA</span>
                          <span className="text-sm font-medium leading-none mt-1">{pName}</span>
                        </div>
                      </div>

                      {apt.status !== 'cancelled' && !isPast && isExpired && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2 text-[11px] text-amber-800 leading-normal animate-fade-in">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <div>
                            <strong>Plazo de cancelación expirado</strong> (límite: {policyHours}h antes). Comunícate con tu especialista si requieres cambios.
                          </div>
                        </div>
                      )}
                    </CardContent>
                    
                    {apt.status !== 'cancelled' && !isPast && (
                      <CardFooter className="p-4 bg-muted/10 border-t border-border/40 flex flex-col gap-2">
                        {apt.meeting_link && (
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs h-9 rounded-lg shadow-sm"
                            onClick={() => {
                              if (apt.meeting_link.startsWith('http')) {
                                window.open(apt.meeting_link, '_blank');
                              } else {
                                window.open(`${window.location.origin}${apt.meeting_link}`, '_blank');
                              }
                            }}
                          >
                            <Video className="w-4 h-4" />
                            Unirse a Videollamada
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-9 rounded-lg"
                          onClick={() => handleCancelAppointment(apt.id, apt.management_token)}
                          disabled={isExpired || cancelingId === apt.id}
                        >
                          {cancelingId === apt.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Cancelar Cita
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* Tests Tab Content */}
        {activeTab === 'tests' && (
          loadingTests ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : assignedTests.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-dashed bg-muted/10 shadow-none">
              <BrainCircuit className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tienes pruebas asignadas</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Actualmente no tienes evaluaciones psicométricas asignadas pendientes ni completadas.
              </p>
            </Card>
          ) : (
            <div className="space-y-10">
              {/* Pending Tests Section */}
              {assignedTests.filter(t => t.status === 'pending').length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Evaluaciones Pendientes</span>
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {assignedTests.filter(t => t.status === 'pending').map(test => {
                      const testCatalog = psychometricTests[test.test_type];
                      const testName = testCatalog ? testCatalog.name : test.test_type.toUpperCase();
                      const testDescription = testCatalog ? testCatalog.description : 'Evaluación psicométrica asignada por tu especialista.';
                      const testQuestions = testCatalog ? testCatalog.questions.length : null;

                      return (
                        <Card key={test.id} className="rounded-xl overflow-hidden shadow-sm flex flex-col border-border/60 hover:shadow-md transition-shadow">
                          <CardHeader className="p-5 pb-0">
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-primary/5 text-primary p-2 rounded-lg">
                                <BrainCircuit className="w-5 h-5" />
                              </div>
                              <Badge variant="secondary" className="font-semibold text-primary bg-primary/10">Pendiente</Badge>
                            </div>
                            <CardTitle className="text-lg font-bold mb-1 leading-snug">
                              {testName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-5 pt-3 flex-1 flex flex-col justify-between">
                            <p className="text-sm text-muted-foreground leading-normal mb-4">
                              {testDescription}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground/80 mt-auto pt-4 border-t border-border/40">
                              {testQuestions && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-primary/70" />
                                  {testQuestions} reactivos
                                </span>
                              )}
                              <span>
                                Asignada: {format(parseISO(test.created_at), "d 'de' MMM", { locale: es })}
                              </span>
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 bg-muted/10 border-t border-border/40">
                            <Button 
                              className="w-full gap-2 bg-primary hover:bg-primary/95 text-white font-semibold transition-all hover:scale-[1.01]"
                              onClick={() => window.open(`/t/${test.token}`, '_blank')}
                            >
                              <span>Resolver Prueba</span>
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Tests Section */}
              {assignedTests.filter(t => t.status === 'completed' || t.status === 'scored').length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Evaluaciones Completadas</span>
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {assignedTests.filter(t => t.status === 'completed' || t.status === 'scored').map(test => {
                      const testCatalog = psychometricTests[test.test_type];
                      const testName = testCatalog ? testCatalog.name : test.test_type.toUpperCase();
                      const completedDate = test.completed_at ? parseISO(test.completed_at) : null;

                      return (
                        <Card key={test.id} className="rounded-xl overflow-hidden shadow-sm flex flex-col border-border/60 bg-[#FAFAFA]/65">
                          <CardHeader className="p-5 pb-0">
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-green-500/10 text-green-600 p-2 rounded-lg">
                                <Check className="w-5 h-5" />
                              </div>
                              <Badge variant="outline" className="font-semibold border-green-200 bg-green-50 text-green-700">Completada</Badge>
                            </div>
                            <CardTitle className="text-lg font-bold mb-1 leading-snug">
                              {testName}
                            </CardTitle>
                            {completedDate && (
                              <CardDescription className="text-xs text-muted-foreground">
                                Resuelta el {format(completedDate, "d 'de' MMMM, yyyy", { locale: es })}
                              </CardDescription>
                            )}
                          </CardHeader>
                          
                          <CardContent className="p-5 pt-4 flex-1">
                            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 flex flex-col gap-2.5 text-sm text-green-900 leading-normal">
                              <div className="flex items-center justify-between font-semibold border-b border-green-500/10 pb-2">
                                <span className="flex items-center gap-1.5 text-green-800 text-xs font-bold uppercase tracking-wider">
                                  Resultado
                                </span>
                                <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-sm">
                                  {test.score !== undefined && test.score !== null ? `${test.score} pts` : 'Evaluando'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-green-700 uppercase font-bold block tracking-widest mb-0.5 opacity-80">INTERPRETACIÓN</span>
                                <span className="font-semibold text-green-900 text-sm leading-relaxed">
                                  {test.interpretation || 'Las respuestas han sido enviadas correctamente a tu especialista para su evaluación.'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Consents Tab Content */}
        {activeTab === 'consents' && (
          loadingConsents ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : consents.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border-dashed bg-muted/10 shadow-none">
              <FileSignature className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tienes documentos asignados</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Tu psicólogo no ha solicitado ninguna firma de consentimiento remoto por el momento.
              </p>
            </Card>
          ) : (
            <div className="space-y-10">
              {/* Pending Consents Section */}
              {consents.filter(c => !c.signed_at).length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                    <FileSignature className="h-5 w-5 text-amber-500" />
                    <span>Documentos Pendientes de Firma</span>
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {consents.filter(c => !c.signed_at).map(consent => {
                      const specialistName = consent.specialist_prefix && consent.specialist_prefix !== 'none'
                        ? `${consent.specialist_prefix} ${consent.specialist_name}`
                        : consent.specialist_name || 'Especialista';

                      return (
                        <Card key={consent.id} className="rounded-xl overflow-hidden shadow-sm flex flex-col border-amber-200 bg-amber-50/10 hover:shadow-md transition-shadow">
                          <CardHeader className="p-5 pb-0">
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-amber-500/10 text-amber-600 p-2 rounded-lg">
                                <FileSignature className="w-5 h-5" />
                              </div>
                              <Badge variant="secondary" className="font-semibold text-amber-700 bg-amber-100/80 border border-amber-200 animate-pulse">
                                Firma Pendiente
                              </Badge>
                            </div>
                            <CardTitle className="text-lg font-bold mb-1 leading-snug">
                              {FORM_TYPE_LABELS[consent.form_type] || consent.form_type}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              Asignado por: <span className="font-medium text-foreground/80">{specialistName}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-5 pt-3 flex-1 flex flex-col justify-between">
                            <p className="text-sm text-muted-foreground leading-normal mb-4 line-clamp-3">
                              {consent.consent_text}
                            </p>
                            <div className="flex items-center text-xs font-semibold text-muted-foreground/80 mt-auto pt-4 border-t border-border/40">
                              <span>Solicitado: {format(parseISO(consent.created_at), "d 'de' MMM, yyyy", { locale: es })}</span>
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 bg-amber-50/20 border-t border-amber-100">
                            <Button 
                              className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all hover:scale-[1.01]"
                              onClick={() => {
                                setSigningConsent(consent);
                                setSignatureDataUrl(null);
                              }}
                            >
                              <span>Leer y Firmar</span>
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Consents Section */}
              {consents.filter(c => c.signed_at).length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Documentos Firmados</span>
                  </h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {consents.filter(c => c.signed_at).map(consent => {
                      const specialistName = consent.specialist_prefix && consent.specialist_prefix !== 'none'
                        ? `${consent.specialist_prefix} ${consent.specialist_name}`
                        : consent.specialist_name || 'Especialista';
                      const signedDate = consent.signed_at ? parseISO(consent.signed_at) : new Date();

                      return (
                        <Card key={consent.id} className="rounded-xl overflow-hidden shadow-sm flex flex-col border-border/60 bg-[#FAFAFA]/65">
                          <CardHeader className="p-5 pb-0">
                            <div className="flex justify-between items-start mb-4">
                              <div className="bg-green-500/10 text-green-600 p-2 rounded-lg">
                                <Check className="w-5 h-5" />
                              </div>
                              <Badge variant="outline" className="font-semibold border-green-200 bg-green-50 text-green-700">Firmado</Badge>
                            </div>
                            <CardTitle className="text-lg font-bold mb-1 leading-snug">
                              {FORM_TYPE_LABELS[consent.form_type] || consent.form_type}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                              Asignado por: <span className="font-medium text-foreground/80">{specialistName}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-5 pt-3 flex-1 flex flex-col justify-between">
                            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 flex flex-col gap-1.5 text-xs text-green-800 leading-normal mb-4">
                              <p className="font-medium text-green-900">Hash de Firma Digital:</p>
                              <code className="bg-white/80 p-1.5 rounded border text-[10px] break-all font-mono font-bold leading-normal">
                                {consent.signature_hash || 'NOM-024 SECURE HASH'}
                              </code>
                            </div>
                            <div className="flex items-center text-xs font-semibold text-muted-foreground/80 mt-auto pt-4 border-t border-border/40">
                              <span>Firmado el: {format(signedDate, "d 'de' MMMM, yyyy", { locale: es })}</span>
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 bg-muted/10 border-t border-border/40">
                            <Button 
                              variant="outline"
                              className="w-full gap-2 border-border/80 text-foreground hover:bg-muted font-semibold transition-all"
                              onClick={() => generatePortalPDF(consent)}
                            >
                              <Download className="w-4 h-4" />
                              <span>Descargar PDF</span>
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Remote Signature Modal */}
      {signingConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-border/50 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  Firmar {FORM_TYPE_LABELS[signingConsent.form_type] || signingConsent.form_type}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Asignado por: <span className="font-semibold text-foreground/80">
                    {signingConsent.specialist_prefix && signingConsent.specialist_prefix !== 'none'
                      ? `${signingConsent.specialist_prefix} ${signingConsent.specialist_name}`
                      : signingConsent.specialist_name || 'Especialista'}
                  </span>
                </p>
              </div>
              <button 
                onClick={() => {
                  setSigningConsent(null);
                  setSignatureDataUrl(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/80 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Términos del Consentimiento</span>
                  <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                    Cumplimiento NOM-024
                  </Badge>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto bg-[#FDFCFB]">
                  {signingConsent.consent_text}
                </div>
              </div>

              {/* Signature Section */}
              <div className="space-y-3">
                <span className="text-sm font-semibold block">Dibuja tu firma digital abajo:</span>
                {signatureDataUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 animate-bounce" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Firma capturada correctamente</p>
                        <p className="text-xs text-green-700">Haz click en "Limpiar" para volver a firmar</p>
                      </div>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] border rounded-xl flex justify-center">
                      <img src={signatureDataUrl} alt="Firma del paciente" className="max-h-28 rounded-lg border bg-white shadow-inner p-2" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSignatureDataUrl(null)}
                    >
                      Limpiar y volver a firmar
                    </Button>
                  </div>
                ) : (
                  <SignaturePad onSign={(dataUrl) => setSignatureDataUrl(dataUrl)} />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSigningConsent(null);
                  setSignatureDataUrl(null);
                }}
                disabled={isSubmittingSignature}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={handleSignConsent}
                disabled={isSubmittingSignature || !signatureDataUrl}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md shadow-green-600/10"
              >
                {isSubmittingSignature ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                ) : (
                  <><Check className="h-4 w-4" /> Confirmar y Firmar</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

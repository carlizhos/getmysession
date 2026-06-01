import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import SignaturePad from '@/components/consent/SignaturePad';

const STEPS = [
  { id: 1, title: 'Identidad Profesional' },
  { id: 2, title: 'Disponibilidad y Tarifas' },
  { id: 3, title: 'Cobros y Pagos' }
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 State
  const [prefix, setPrefix] = useState(profile?.prefix || 'Psic.');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [cedula, setCedula] = useState(profile?.cedula_profesional || '');
  const [signatureData, setSignatureData] = useState<string | null>(profile?.signature_data || null);

  // Step 2 State
  const [sessionPrice, setSessionPrice] = useState('800');
  const [currency, setCurrency] = useState('MXN');

  useEffect(() => {
    // If already completed, redirect to dashboard
    if (profile?.onboarding_completed) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!fullName || !cedula) {
        toast.error('Por favor, completa tu nombre y cédula profesional.');
        return;
      }
      if (!signatureData) {
        toast.error('Tu firma digital es obligatoria para la validez legal de tus expedientes.');
        return;
      }
      
      // Save Step 1
      setIsSaving(true);
      try {
        const { error } = await supabase.from('profiles').update({
          prefix,
          full_name: fullName,
          cedula_profesional: cedula,
          signature_data: signatureData
        }).eq('id', user?.id);
        
        if (error) throw error;
        setCurrentStep(2);
      } catch (err: any) {
        toast.error('Error al guardar: ' + err.message);
      } finally {
        setIsSaving(false);
      }
    } else if (currentStep === 2) {
      if (!sessionPrice || isNaN(Number(sessionPrice))) {
        toast.error('Por favor ingresa una tarifa válida.');
        return;
      }
      
      // Save Step 2 (just visual confirmation, we can update settings later)
      // Actually, we could store the default price in organization settings or services.
      // For now, let's just proceed to step 3
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        onboarding_completed: true
      }).eq('id', user?.id);

      if (error) throw error;
      
      toast.success('¡Configuración completada! Bienvenido a Saudade.', { icon: <Sparkles className="h-5 w-5 text-primary" /> });
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Error al finalizar: ' + err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans">
      {/* Header */}
      <div className="w-full h-1.5 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out" 
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }} 
        />
      </div>

      <div className="flex-1 flex flex-col items-center p-6 md:p-12 max-w-3xl mx-auto w-full mt-8">
        
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-center mb-4">
          {currentStep === 1 && 'Configura tu Identidad Clínica'}
          {currentStep === 2 && 'Tu Tiempo, Tus Reglas'}
          {currentStep === 3 && 'Recibe Pagos en Automático'}
        </h1>
        
        <p className="text-muted-foreground text-center mb-10 max-w-lg text-lg">
          {currentStep === 1 && 'Saudade genera expedientes con validez legal. Necesitamos tus credenciales para plasmar tu firma automáticamente en cada nota SOAP.'}
          {currentStep === 2 && 'Define tu tarifa estándar. Podrás modificar horarios específicos más tarde en tus ajustes.'}
          {currentStep === 3 && 'Conecta tu cuenta bancaria vía Stripe para cobrar las sesiones y evitar inasistencias. Es 100% seguro.'}
        </p>

        <Card className="w-full shadow-lg border-border/60 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardContent className="p-8">
            
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Prefijo</Label>
                    <Select value={prefix} onValueChange={setPrefix}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Psic.">Psic.</SelectItem>
                        <SelectItem value="Dr.">Dr.</SelectItem>
                        <SelectItem value="Dra.">Dra.</SelectItem>
                        <SelectItem value="Lic.">Lic.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Nombre Completo</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Juan Pérez" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cédula Profesional</Label>
                  <Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej. 12345678" />
                  <p className="text-xs text-muted-foreground">Esta cédula aparecerá en tus recetas y consentimientos informados.</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Label className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    Firma Digital (Obligatorio)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-4">Dibuja tu firma. Esta se incrustará con un Hash criptográfico en tus PDFs clínicos (Cumplimiento NOM-024).</p>
                  <div className="bg-white rounded-xl border-2 border-dashed border-border/60 overflow-hidden shadow-inner">
                    <SignaturePad 
                      onSign={(data) => setSignatureData(data)} 
                      height={200}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-primary/5 p-6 rounded-2xl flex gap-4 items-start border border-primary/10">
                  <Clock className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground">Disponibilidad Inteligente</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Por defecto, tu agenda está abierta de Lunes a Viernes (9:00 AM - 6:00 PM). Una vez que entres a Saudade, podrás personalizar tus bloques horarios exactos desde los ajustes.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">¿Cuál es tu tarifa por sesión estándar?</Label>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-3 text-muted-foreground font-medium">$</span>
                      <Input 
                        type="number" 
                        className="pl-8 text-lg font-medium h-12" 
                        value={sessionPrice} 
                        onChange={(e) => setSessionPrice(e.target.value)} 
                      />
                    </div>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-32 h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No te preocupes, puedes cambiar esto después o tener precios distintos por paciente.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-fade-in text-center">
                <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <CreditCard className="w-10 h-10 text-blue-600" />
                </div>
                
                <h3 className="text-xl font-bold">Adiós a las cancelaciones de último minuto</h3>
                <p className="text-muted-foreground">
                  Al conectar Stripe, puedes exigir que tus pacientes dejen una tarjeta en garantía para poder agendar. Si no asisten, se les cobra tu política de cancelación automáticamente.
                </p>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left text-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>Los pagos caen directo a tu cuenta de banco local.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>Nosotros no retenemos tu dinero.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>Cumplimiento PCI total. Seguridad de grado bancario.</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button 
                    className="w-full bg-[#635BFF] hover:bg-[#524BDB] text-white shadow-md shadow-[#635BFF]/30 h-14 text-lg font-semibold"
                    onClick={() => {
                      toast.info("Podrás configurar Stripe desde Ajustes > Facturación al terminar.");
                      handleComplete();
                    }}
                    disabled={isSaving}
                  >
                    Conectar con Stripe
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleComplete}
                    disabled={isSaving}
                  >
                    Saltar por ahora (puedo hacerlo después)
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Footer Navigation */}
        {currentStep < 3 && (
          <div className="mt-8 flex justify-end w-full">
            <Button 
              size="lg" 
              className="rounded-full px-8 gap-2 shadow-lg hover:scale-105 transition-transform"
              onClick={handleNext}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Loader2,
  Building2,
  Globe,
  GraduationCap,
  MonitorSmartphone,
  CalendarDays,
  Brain
} from 'lucide-react';
import SignaturePad from '@/components/consent/SignaturePad';
import { cn } from '@/lib/utils';
import FreeTrialScreen from '@/components/subscription/FreeTrialScreen';

const STEPS = [
  { id: 1, title: 'Identidad Clínica' },
  { id: 2, title: 'Primer Servicio' },
  { id: 3, title: 'Agenda y Horarios' },
  { id: 4, title: 'Firma y Legal' },
  { id: 5, title: 'Prueba Gratis' }
];

const COMMON_TIMEZONES = [
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Buenos_Aires",
  "America/Santiago",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lun', label: 'Lunes' },
  { id: 2, name: 'Mar', label: 'Martes' },
  { id: 3, name: 'Mié', label: 'Miércoles' },
  { id: 4, name: 'Jue', label: 'Jueves' },
  { id: 5, name: 'Vie', label: 'Viernes' },
  { id: 6, name: 'Sáb', label: 'Sábado' },
  { id: 0, name: 'Dom', label: 'Domingo' }
];

export default function Onboarding() {
  const { user, profile, organization, refreshProfile, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 State: Identity
  const [prefix, setPrefix] = useState(profile?.prefix || 'Psic.');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [cedula, setCedula] = useState(profile?.cedula_profesional || '');
  const [specialty, setSpecialty] = useState('');
  const [orgName, setOrgName] = useState(organization?.name || '');

  // Step 2 State: Service & Modality
  const [skipService, setSkipService] = useState(false);
  const [serviceName, setServiceName] = useState('Terapia Individual');
  const [modality, setModality] = useState('En Línea');
  const [sessionDuration, setSessionDuration] = useState('50');
  const [sessionPrice, setSessionPrice] = useState('800');
  const [currency, setCurrency] = useState('MXN');

  // Step 3 State: Schedule
  const [skipSchedule, setSkipSchedule] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // Step 4 State: Legal
  const [signatureData, setSignatureData] = useState<string | null>(profile?.signature_data || null);

  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const toggleDay = (dayId: number) => {
    setWorkingDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!fullName || !cedula || !orgName || !specialty) {
        toast.error('Por favor, completa todos los campos para continuar.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!skipService) {
        if (!serviceName || !sessionPrice || isNaN(Number(sessionPrice))) {
          toast.error('Por favor ingresa un nombre y tarifa válida.');
          return;
        }
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!skipSchedule && workingDays.length === 0) {
        toast.error('Selecciona al menos un día laboral o salta este paso.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 2) {
      setSkipService(true);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setSkipSchedule(true);
      setCurrentStep(4);
    }
  };

  const handleComplete = async () => {
    if (!signatureData) {
      toast.error('Tu firma digital es obligatoria para la validez legal de tus expedientes.');
      return;
    }
    
    // Instead of saving immediately, we move to the final checkout step
    setCurrentStep(5);
  };

  const handleCheckout = async (planId: 'pro_monthly' | 'pro_annual') => {
    setIsSaving(true);
    try {
      // 1. Update Profile (Identity)
      const { error: profileError } = await supabase.from('profiles').update({
        prefix,
        full_name: fullName,
        cedula_profesional: cedula,
        especialidad: specialty,
        signature_data: signatureData
      }).eq('id', user?.id);

      if (profileError) throw profileError;

      // 2. Update Organization Settings
      const orgId = organization?.id || profile?.current_organization_id;
      if (orgId) {
        const orgSettings = {
          ...(organization?.settings as Record<string, any> || {}),
          timezone: timezone, // Auto-detected from browser during onboarding
          workingDays: skipSchedule ? [1,2,3,4,5] : workingDays,
          workingHours: skipSchedule ? { start: '09:00', end: '18:00' } : { start: startTime, end: endTime },
          defaultSessionDuration: skipService ? 50 : parseInt(sessionDuration, 10),
          defaultSessionPrice: skipService ? 0 : parseFloat(sessionPrice),
          currency: skipService ? 'MXN' : currency
        };

        const { error: orgError } = await supabase.from('organizations').update({
          name: orgName,
          settings: orgSettings
        }).eq('id', orgId);

        if (orgError) throw orgError;

        // 3. Insert Initial Service if not skipped
        if (!skipService) {
          const { error: serviceError } = await supabase.from('services').insert({
            user_id: user?.id,
            organization_id: orgId,
            name: serviceName,
            description: `Sesión ${modality}`,
            duration: parseInt(sessionDuration, 10),
            price: parseFloat(sessionPrice),
            currency,
            is_public: true,
            color: 'violet'
          });

          if (serviceError) throw serviceError;
        }
      }
      
      toast.success('¡Configuración completada! Bienvenido a Saudade.', { icon: <CheckCircle2 className="h-5 w-5 text-primary" /> });
      await refreshProfile();
      await refreshOrganization();
      
      // Now redirect to Stripe Checkout
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-billing-session', {
        body: { 
          organization_id: orgId, 
          plan_id: planId,
          return_url: `${window.location.origin}/dashboard`
        }
      });

      if (sessionError) throw sessionError;
      if (sessionData?.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error('No se pudo generar la sesión de pago');
      }
      
    } catch (err: any) {
      toast.error('Error al finalizar: ' + err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans relative overflow-hidden">
      {/* Header Progress (Visible from Step 2) */}
      {currentStep > 1 && (
        <>
          <div className="w-full h-1.5 bg-slate-200/50 absolute top-0 left-0 z-10 animate-in fade-in duration-500">
            <div 
              className="h-full bg-[#b59eab] transition-all duration-700 ease-in-out" 
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }} 
            />
          </div>

          {/* Step Indicator */}
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="bg-white/50 backdrop-blur-md border border-white/60 px-4 py-1.5 rounded-full shadow-sm text-sm font-medium text-slate-600 flex items-center gap-2">
              <span>Paso {currentStep} de {STEPS.length}</span>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 max-w-4xl mx-auto w-full z-10 relative">
        
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/40 backdrop-blur-md border border-white/60 rounded-full shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-primary w-8 h-8 rounded-full flex items-center justify-center shadow-inner">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 pr-1">Saudade</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-center mb-2 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-150">
          {STEPS[currentStep - 1].title}
        </h1>
        
        <p className="text-slate-500 text-center mb-6 max-w-2xl text-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 leading-relaxed">
          {currentStep === 1 && 'Estos datos construirán tu perfil profesional público y se utilizarán en los encabezados de tus expedientes clínicos para que tus pacientes te identifiquen formalmente.'}
          {currentStep === 2 && 'Necesitamos registrar al menos un servicio oficial en la base de datos para que la Agenda tenga algo que ofrecer y sepa cuánto cobrar a tus pacientes cuando reserven.'}
          {currentStep === 3 && 'Basado en estos horarios, el sistema bloqueará y abrirá espacios automáticamente en tu calendario, evitando que pacientes agenden citas cuando no estás disponible.'}
          {currentStep === 4 && 'La Norma Oficial Mexicana (NOM-024) exige tu firma para dar validez legal a tus recetas y expedientes. Además, podrás configurar pagos seguros con tarjeta.'}
          {currentStep === 5 && 'Inicia tu prueba gratuita de 30 días con acceso ilimitado a todas las funciones Pro de Saudade.'}
        </p>

        {currentStep === 5 ? (
          <FreeTrialScreen onContinue={handleCheckout} isLoading={isSaving} />
        ) : (
          <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[1.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <div className="p-5 md:p-8">
            
            {/* STEP 1: IDENTITY */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="space-y-1">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4" />
                    Nombre de la Clínica o Consultorio
                  </Label>
                  <Input 
                    value={orgName} 
                    onChange={(e) => setOrgName(e.target.value)} 
                    placeholder="Ej. Consultorio MindCare" 
                    className="h-10 bg-white/50 border-slate-200/60 focus-visible:ring-slate-400 rounded-xl"
                  />
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-1 md:col-span-1">
                    <Label className="text-slate-700 font-semibold text-sm">Prefijo</Label>
                    <Select value={prefix} onValueChange={setPrefix}>
                      <SelectTrigger className="h-10 bg-white/50 border-slate-200/60 rounded-xl">
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
                  <div className="space-y-1 md:col-span-3">
                    <Label className="text-slate-700 font-semibold text-sm">Tu Nombre Completo</Label>
                    <Input 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Ej. Juan Pérez" 
                      className="h-10 bg-white/50 border-slate-200/60 focus-visible:ring-slate-400 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <GraduationCap className="w-4 h-4" />
                      Especialidad
                    </Label>
                    <Input 
                      value={specialty} 
                      onChange={(e) => setSpecialty(e.target.value)} 
                      placeholder="Ej. Psicología Clínica" 
                      className="h-10 bg-white/50 border-slate-200/60 focus-visible:ring-slate-400 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-semibold text-sm">Cédula Profesional</Label>
                    <Input 
                      value={cedula} 
                      onChange={(e) => setCedula(e.target.value)} 
                      placeholder="Ej. 12345678" 
                      className="h-10 bg-white/50 border-slate-200/60 focus-visible:ring-slate-400 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: FIRST SERVICE */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-semibold text-sm">Nombre del Servicio</Label>
                    <Input 
                      value={serviceName} 
                      onChange={(e) => setServiceName(e.target.value)} 
                      placeholder="Ej. Terapia Individual" 
                      className="h-10 bg-white/50 border-slate-200/60 focus-visible:ring-slate-400 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <MonitorSmartphone className="w-4 h-4" />
                      Modalidad
                    </Label>
                    <Select value={modality} onValueChange={setModality}>
                      <SelectTrigger className="h-10 bg-white/50 border-slate-200/60 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="En Línea">En Línea</SelectItem>
                        <SelectItem value="Presencial">Presencial</SelectItem>
                        <SelectItem value="Mixta">Mixta (Ambas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <Label className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      Duración (Minutos)
                    </Label>
                    <Select value={sessionDuration} onValueChange={setSessionDuration}>
                      <SelectTrigger className="h-10 bg-white/50 border-slate-200/60 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 Minutos</SelectItem>
                        <SelectItem value="45">45 Minutos</SelectItem>
                        <SelectItem value="50">50 Minutos</SelectItem>
                        <SelectItem value="60">60 Minutos</SelectItem>
                        <SelectItem value="90">90 Minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-700 font-semibold text-sm">Tarifa Estándar</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-4 top-2.5 text-slate-400 font-medium">$</span>
                        <Input 
                          type="number" 
                          className="pl-8 text-base font-medium h-10 bg-white/50 border-slate-200/60 rounded-xl" 
                          value={sessionPrice} 
                          onChange={(e) => setSessionPrice(e.target.value)} 
                        />
                      </div>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="w-24 h-10 bg-white/50 border-slate-200/60 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MXN">MXN</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SCHEDULE */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2 mb-2 text-sm">
                    <CalendarDays className="w-4 h-4" />
                    ¿Qué días consultas?
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = workingDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(day.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                            isSelected 
                              ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" 
                              : "bg-white/50 text-slate-600 border-slate-200/60 hover:bg-white hover:border-slate-300"
                          )}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1 md:col-span-1">
                    <Label className="text-slate-700 font-semibold text-sm">Horario Base</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="time" 
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="h-10 bg-white/50 border-slate-200/60 rounded-xl"
                      />
                      <span className="text-slate-400">a</span>
                      <Input 
                        type="time" 
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="h-10 bg-white/50 border-slate-200/60 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: LEGAL & STRIPE */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Firma Digital (Obligatorio)
                  </Label>
                  <div className="bg-white/80 rounded-2xl border-2 border-dashed border-slate-200/80 overflow-hidden shadow-inner">
                    <SignaturePad 
                      onSign={(data) => setSignatureData(data)} 
                      height={150}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/50 space-y-3">
                  <div className="flex gap-3 items-start bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">Pagos Automáticos (Opcional)</h4>
                      <p className="text-xs text-slate-600 mt-1 mb-2">
                        Configura Stripe para cobrar tarjetas y evitar inasistencias. Puedes saltar esto y hacerlo después.
                      </p>
                      <Button 
                        size="sm"
                        variant="outline" 
                        className="bg-white border-slate-200 shadow-sm text-xs"
                        onClick={() => toast.info("Podrás configurar Stripe desde Ajustes > Facturación al terminar.")}
                      >
                        Conectar con Stripe
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        )}

        {/* Footer Navigation - hidden on step 5 because FreeTrialScreen has its own button */}
        {currentStep < 5 && (
        <div className="mt-6 flex justify-between w-full items-center animate-in fade-in duration-700 delay-700">
          
          {/* Left Action (Back) */}
          <div className="w-1/3 flex">
            {currentStep > 1 ? (
              <Button 
                variant="outline" 
                className="rounded-full px-6 bg-white/50 hover:bg-white/80 text-slate-700 border border-white/60 shadow-sm backdrop-blur-md transition-all duration-300"
                onClick={handleBack}
              >
                Regresar
              </Button>
            ) : (
              <div /> // Spacer
            )}
          </div>

          {/* Right Actions (Skip + Next/Complete) */}
          <div className="flex justify-end items-center gap-3 w-2/3">
            {(currentStep === 2 || currentStep === 3) && (
              <Button 
                variant="secondary" 
                className="rounded-full px-6 bg-slate-200/80 hover:bg-slate-300 text-slate-700 shadow-sm transition-all duration-300"
                onClick={handleSkip}
              >
                <span className="hidden sm:inline">Configurar después</span>
                <span className="sm:hidden">Saltar</span>
              </Button>
            )}
            
            {currentStep < 4 ? (
              <Button 
                size="lg" 
                className="rounded-full px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-all duration-300"
                onClick={handleNext}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="rounded-full px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-all duration-300"
                onClick={handleComplete}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Comenzar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        )}

      </div>
    </div>
  );
}

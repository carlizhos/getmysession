import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Building2,
  GraduationCap,
  Brain,
  Laptop,
  Sofa,
  Users,
  CalendarDays,
  Globe
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import SignaturePad from '@/components/consent/SignaturePad';
import { cn } from '@/lib/utils';
import FreeTrialScreen from '@/components/subscription/FreeTrialScreen';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 1, title: 'Identidad Clínica', desc: 'Configura tu perfil profesional público.' },
  { id: 2, title: 'Primer Servicio', desc: 'Registra tu primera modalidad de consulta.' },
  { id: 3, title: 'Agenda y Horarios', desc: 'Define cuándo estarás disponible.' },
  { id: 4, title: 'Enlace de Reservas', desc: 'Personaliza la dirección web de tu consultorio.' },
  { id: 5, title: 'Firma y Legal', desc: 'Da validez a tus expedientes y recetas.' },
  { id: 6, title: 'Prueba Gratis', desc: 'Activa tu acceso total a Saudade.' }
];

const COMMON_TIMEZONES = [
  "America/Mexico_City",
  "America/Tijuana",
  "America/Monterrey",
  "America/Hermosillo",
  "America/Cancun",
  "America/Bogota",
  "America/Lima",
  "America/Buenos_Aires",
  "America/Santiago",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

const PREFIXES = ['Psic.', 'Dr.', 'Dra.', 'Lic.'];

const MODALITIES = [
  { id: 'En Línea', icon: Laptop, label: 'En Línea' },
  { id: 'Presencial', icon: Sofa, label: 'Presencial' },
  { id: 'Mixta', icon: Users, label: 'Mixta (Ambas)' }
];

const DURATIONS = [
  { id: '30', label: '30 Min' },
  { id: '45', label: '45 Min' },
  { id: '50', label: '50 Min' },
  { id: '60', label: '60 Min' },
  { id: '90', label: '90 Min' },
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
  const [direction, setDirection] = useState(1);

  // Form State
  const [prefix, setPrefix] = useState(profile?.prefix || 'Psic.');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [cedula, setCedula] = useState(profile?.cedula_profesional || '');
  const [specialty, setSpecialty] = useState('');
  const [orgName, setOrgName] = useState(organization?.name || '');
  
  const [skipService, setSkipService] = useState(false);
  const [serviceName, setServiceName] = useState('Terapia Individual');
  const [modality, setModality] = useState('En Línea');
  const [sessionDuration, setSessionDuration] = useState('50');
  const [sessionPrice, setSessionPrice] = useState('800');
  const [currency, setCurrency] = useState('MXN');

  const [skipSchedule, setSkipSchedule] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City');
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  // Step 4 State: Booking Link (Slug)
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Step 5 State: Legal Checkbox
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [signatureData, setSignatureData] = useState<string | null>(profile?.signature_data || null);

  useEffect(() => {
    const isTestMode = new URLSearchParams(window.location.search).get('test') === 'true';
    if (profile?.onboarding_completed && !isTestMode) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Auto-generate slug from name
  useEffect(() => {
    if (fullName && !slug) {
      const cleanName = fullName
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const prefixClean = prefix ? prefix.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' : '';
      setSlug(`${prefixClean}${cleanName}`);
    }
  }, [fullName, prefix]);

  // Check slug availability in DB
  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle');
      return;
    }
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (cleanSlug !== slug) {
      setSlug(cleanSlug);
      return;
    }

    const checkSlugAvailability = async () => {
      setSlugStatus('checking');
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', cleanSlug)
        .not('id', 'eq', user?.id)
        .maybeSingle();

      if (error) {
        setSlugStatus('idle');
        return;
      }

      if (data) {
        setSlugStatus('taken');
      } else {
        setSlugStatus('available');
      }
    };

    const delayDebounce = setTimeout(() => {
      checkSlugAvailability();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [slug, user?.id]);

  const toggleDay = (dayId: number) => {
    setWorkingDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!fullName || !cedula || !orgName || !specialty) {
        toast.error('Por favor, completa todos los campos para continuar.');
        return;
      }
    } else if (currentStep === 2) {
      if (!skipService) {
        if (!serviceName || !sessionPrice || isNaN(Number(sessionPrice)) || Number(sessionPrice) < 0) {
          toast.error('Por favor ingresa un nombre y tarifa válida (no negativa).');
          return;
        }
      }
    } else if (currentStep === 3) {
      if (!skipSchedule) {
        if (workingDays.length === 0) {
          toast.error('Selecciona al menos un día laboral o salta este paso.');
          return;
        }
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        if (startTotal >= endTotal) {
          toast.error('El horario de inicio debe ser anterior al horario de fin.');
          return;
        }
      }
    } else if (currentStep === 4) {
      if (!slug || slug.length < 3) {
        toast.error('Por favor ingresa un enlace de reservas válido (mínimo 3 caracteres).');
        return;
      }
      if (slugStatus === 'checking' || slugStatus === 'idle') {
        toast.warning('Espera un momento a que verifiquemos el enlace.');
        return;
      }
      if (slugStatus === 'taken') {
        toast.error('El enlace ya está ocupado. Elige otro.');
        return;
      }
    }
    setDirection(1);
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 2) setSkipService(true);
    if (currentStep === 3) setSkipSchedule(true);
    setDirection(1);
    setCurrentStep(prev => prev + 1);
  };

  const handleComplete = async () => {
    if (!signatureData) {
      toast.error('Tu firma digital es obligatoria.');
      return;
    }
    if (!agreedToTerms) {
      toast.error('Debes aceptar los Términos de Tratamiento de Datos Clínicos.');
      return;
    }
    setDirection(1);
    setCurrentStep(6);
  };

  const handleCheckout = async (planId: 'pro_monthly' | 'pro_annual') => {
    setIsSaving(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({
        prefix, 
        full_name: fullName, 
        cedula_profesional: cedula, 
        especialidad: specialty, 
        signature_data: signatureData, 
        slug: slug || null,
        terms_accepted_at: new Date().toISOString() // Save exact timestamp of legal consent
      }).eq('id', user?.id);
      if (profileError) throw profileError;

      const orgId = organization?.id || profile?.current_organization_id;
      if (orgId) {
        const orgSettings = {
          ...(organization?.settings as Record<string, any> || {}),
          timezone,
          workingDays: skipSchedule ? [1,2,3,4,5] : workingDays,
          workingHours: skipSchedule ? { start: '09:00', end: '18:00' } : { start: startTime, end: endTime },
          defaultSessionDuration: skipService ? 50 : parseInt(sessionDuration, 10),
          defaultSessionPrice: skipService ? 0 : parseFloat(sessionPrice),
          currency: skipService ? 'MXN' : currency
        };
        const { error: orgError } = await supabase.from('organizations').update({ name: orgName, settings: orgSettings }).eq('id', orgId);
        if (orgError) throw orgError;

        if (!skipService) {
          const { error: serviceError } = await supabase.from('services').insert({
            user_id: user?.id, organization_id: orgId, name: serviceName, description: `Sesión ${modality}`, duration: parseInt(sessionDuration, 10), price: parseFloat(sessionPrice), currency, is_public: true, color: 'violet'
          });
          if (serviceError) throw serviceError;
        }
      }
      
      toast.success('¡Configuración completada!');
      await refreshProfile();
      await refreshOrganization();
      
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-billing-session', {
        body: { organization_id: orgId, plan_id: planId, return_url: `${window.location.origin}/dashboard` }
      });
      if (sessionError) throw sessionError;
      if (sessionData?.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error('No se pudo generar la sesión de pago');
      }
      
    } catch (err: any) {
      console.error('Stripe billing session failed:', err);
      toast.error('Facturación no disponible temporalmente. Por favor, intenta de nuevo más tarde o contacta a soporte.');
      setIsSaving(false);
    }
  };

  const pageVariants = {
    initial: (direction: number) => ({ x: direction > 0 ? '10%' : '-10%', opacity: 0 }),
    in: { x: 0, opacity: 1 },
    out: (direction: number) => ({ x: direction < 0 ? '10%' : '-10%', opacity: 0 }),
  };

  const pageTransition = { type: 'spring', stiffness: 300, damping: 30 };

  const firstName = fullName.split(' ')[0] || 'Profesional';
  const isLastStep = currentStep === 6;

  const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [...COMMON_TIMEZONES, timezone];

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      
      {/* Left Panel - Hidden on mobile, 40% on desktop */}
      {!isLastStep && (
        <div className="hidden lg:flex w-2/5 relative flex-col justify-between p-12 bg-slate-950 overflow-hidden border-r border-slate-800">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 opacity-60 mix-blend-screen animate-pulse duration-10000" />
             <div className="absolute top-[30%] left-[-20%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-7000" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Saudade</span>
          </div>

          <div className="relative z-10">
            <AnimatePresence mode="wait">
               <motion.div 
                 key={currentStep}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.4 }}
               >
                   <h2 className="text-4xl font-semibold text-white mb-4 leading-tight tracking-tight">
                    {currentStep === 1 && "Construyamos tu identidad digital."}
                    {currentStep === 2 && `Excelente, ${prefix} ${firstName}. ¿Qué servicios ofrecerás?`}
                    {currentStep === 3 && "Protejamos tu tiempo y agenda."}
                    {currentStep === 4 && "Crea tu marca y tu dirección web."}
                    {currentStep === 5 && "Firma para validar legalmente tus notas."}
                    {currentStep === 6 && "Todo listo. Tu consulta está a un clic de distancia."}
                 </h2>
                   <p className="text-slate-400 text-lg leading-relaxed">
                      {STEPS[currentStep - 1].desc}
                   </p>
               </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex items-center gap-3">
             {STEPS.map((step) => (
                 <div key={step.id} className={cn(
                   "h-1.5 rounded-full transition-all duration-700 ease-in-out",
                   currentStep === step.id ? 'w-10 bg-white' : currentStep > step.id ? 'w-4 bg-primary' : 'w-4 bg-slate-800'
                 )} />
             ))}
          </div>
        </div>
      )}

      {/* Right/Main Panel - Form Area */}
      <div 
        className={cn(
          "flex flex-col relative h-full overflow-y-auto",
          isLastStep 
            ? "w-full bg-slate-950 flex items-center justify-center p-4 md:p-8" 
            : "flex-1 bg-slate-50 lg:bg-white"
        )}
      >
        {isLastStep && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center bg-slate-950">
             {/* The brand gradient of Saudade */}
             <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(178_15%_56%)_0%,hsl(262_40%_70%)_100%)] opacity-35" />
             {/* Large centered Saudade icon (watermark) */}
             <Brain className="w-[500px] h-[500px] text-white/5 absolute animate-pulse duration-10000" />
             {/* Mesh pattern and shadow overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]" />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
          </div>
        )}
        
        <div className={cn(
          "w-full z-10 transition-all duration-300 my-auto",
          isLastStep 
            ? "max-w-4xl py-12" 
            : cn("max-w-3xl mx-auto p-6 md:p-12 lg:p-20 flex flex-col justify-center min-h-min pb-32", currentStep === 5 && "pb-12 pt-6")
        )}>
            
            {/* Mobile Header Indicator */}
            {!isLastStep && (
              <div className="lg:hidden flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                   </div>
                   <span className="font-bold text-slate-900">Saudade</span>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  Paso {currentStep} de {STEPS.length}
                </span>
              </div>
            )}

            <AnimatePresence custom={direction} mode="wait">
               {isLastStep ? (
                  <motion.div 
                    key="step-5" 
                    custom={direction} 
                    variants={pageVariants} 
                    initial="initial" 
                    animate="in" 
                    exit="out" 
                    transition={pageTransition}
                    className="w-full"
                  >
                     <FreeTrialScreen onContinue={handleCheckout} isLoading={isSaving} />
                  </motion.div>
               ) : (
                  <motion.div 
                    key={currentStep} 
                    custom={direction} 
                    variants={pageVariants} 
                    initial="initial" 
                    animate="in" 
                    exit="out" 
                    transition={pageTransition}
                    className="w-full space-y-8"
                  >
                     <div className="lg:hidden mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">{STEPS[currentStep - 1].title}</h2>
                        <p className="text-sm text-slate-500 mt-1">{STEPS[currentStep - 1].desc}</p>
                     </div>

                     {/* STEP 1 */}
                     {currentStep === 1 && (
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <Label className="text-slate-700 font-semibold">¿Cómo te llamas?</Label>
                              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Juan Pérez" className="h-12 bg-white rounded-xl shadow-sm border-slate-200 text-lg" />
                           </div>

                           <div className="space-y-3">
                              <Label className="text-slate-700 font-semibold">Tu Título / Prefijo</Label>
                              <div className="grid grid-cols-4 gap-3">
                                {PREFIXES.map(p => (
                                   <button 
                                     key={p} 
                                     onClick={() => setPrefix(p)} 
                                     className={cn(
                                       "py-3 rounded-xl border text-center font-medium transition-all duration-200", 
                                       prefix === p ? "border-primary bg-primary/5 text-primary ring-1 ring-primary shadow-sm" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 bg-white"
                                     )}
                                   >
                                      {p}
                                   </button>
                                ))}
                              </div>
                           </div>

                           <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold flex items-center gap-2"><Building2 className="w-4 h-4"/> Clínica o Consultorio</Label>
                                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Ej. Consultorio MindCare" className="h-12 bg-white rounded-xl shadow-sm border-slate-200" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4"/> Especialidad</Label>
                                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej. Psicología Clínica" className="h-12 bg-white rounded-xl shadow-sm border-slate-200" />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <Label className="text-slate-700 font-semibold text-sm">Cédula Profesional</Label>
                              <Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej. 12345678" className="h-12 bg-white rounded-xl shadow-sm border-slate-200" />
                           </div>
                        </div>
                     )}

                     {/* STEP 2 */}
                     {currentStep === 2 && (
                        <div className="space-y-8">
                           <div className="space-y-3">
                              <Label className="text-slate-700 font-semibold text-lg">Modalidad de Atención</Label>
                              <div className="grid grid-cols-3 gap-4">
                                {MODALITIES.map(m => {
                                  const Icon = m.icon;
                                  const isSelected = modality === m.id;
                                  return (
                                   <button 
                                     key={m.id} 
                                     onClick={() => setModality(m.id)} 
                                     className={cn(
                                       "flex flex-col items-center justify-center p-4 gap-3 rounded-2xl border transition-all duration-200", 
                                       isSelected ? "border-primary bg-primary/5 text-primary ring-2 ring-primary shadow-md" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 bg-white"
                                     )}
                                   >
                                      <Icon className={cn("w-8 h-8", isSelected ? "text-primary" : "text-slate-400")} />
                                      <span className="font-medium text-sm">{m.label}</span>
                                   </button>
                                  )
                                })}
                              </div>
                           </div>

                           <div className="space-y-2">
                              <Label className="text-slate-700 font-semibold">Nombre del Servicio (Visible para pacientes)</Label>
                              <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ej. Terapia Individual" className="h-12 bg-white rounded-xl shadow-sm border-slate-200 text-lg" />
                           </div>

                           <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <Label className="text-slate-700 font-semibold">Duración de la Sesión</Label>
                                <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {DURATIONS.map(d => (
                                     <button 
                                       key={d.id} 
                                       onClick={() => setSessionDuration(d.id)} 
                                       className={cn(
                                         "py-2 rounded-lg border text-center text-sm font-medium transition-all duration-200 bg-white", 
                                         sessionDuration === d.id ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                       )}
                                     >
                                        {d.label}
                                     </button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold">Tarifa Estándar</Label>
                                <div className="flex gap-2">
                                  <div className="flex-1 relative">
                                    <span className="absolute left-4 top-3 text-slate-400 font-medium">$</span>
                                    <Input type="number" className="pl-8 text-lg font-bold h-12 bg-white rounded-xl shadow-sm border-slate-200" value={sessionPrice} onChange={(e) => setSessionPrice(e.target.value)} />
                                  </div>
                                  <div className="w-24 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 font-semibold text-slate-600">
                                    MXN
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* STEP 3 */}
                     {currentStep === 3 && (
                        <div className="space-y-8">
                           <div className="space-y-4">
                              <Label className="text-slate-700 font-semibold text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary"/> Días Laborales</Label>
                              <div className="flex flex-wrap gap-3">
                                {DAYS_OF_WEEK.map(day => {
                                  const isSelected = workingDays.includes(day.id);
                                  return (
                                    <motion.button
                                      key={day.id}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => toggleDay(day.id)}
                                      className={cn(
                                        "px-5 py-3 rounded-xl text-sm font-bold transition-colors duration-200 border shadow-sm",
                                        isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                      )}
                                    >
                                      {day.label}
                                    </motion.button>
                                  );
                                })}
                              </div>
                           </div>

                           <div className="space-y-4 pt-4 border-t border-slate-100">
                              <Label className="text-slate-700 font-semibold text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary"/> Horario Base</Label>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Label className="text-xs text-slate-500 mb-1 block">Desde</Label>
                                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-14 bg-white rounded-xl shadow-sm border-slate-200 text-lg font-medium" />
                                </div>
                                <span className="text-slate-400 font-medium mt-5">a</span>
                                <div className="flex-1">
                                  <Label className="text-xs text-slate-500 mb-1 block">Hasta</Label>
                                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-14 bg-white rounded-xl shadow-sm border-slate-200 text-lg font-medium" />
                                </div>
                              </div>
                           </div>

                           <div className="space-y-2 pt-4 border-t border-slate-100">
                              <Label className="text-slate-700 font-semibold text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary"/> Zona Horaria</Label>
                              <p className="text-sm text-slate-500 mb-2">
                                Esencial para sincronizar correctamente tus citas y horarios de atención con tus pacientes.
                              </p>
                              <Select value={timezone} onValueChange={setTimezone}>
                                <SelectTrigger className="h-12 bg-white rounded-xl shadow-sm border-slate-200 text-base">
                                  <SelectValue placeholder="Selecciona tu zona horaria" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timezoneOptions.map(tz => (
                                    <SelectItem key={tz} value={tz}>
                                      {tz.replace('_', ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                           </div>
                        </div>
                     )}

                     {/* STEP 4 */}
                     {currentStep === 4 && (
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <Label className="text-slate-700 font-semibold text-lg">Tu Enlace de Reservas Único</Label>
                              <p className="text-sm text-slate-500">
                                Este es el enlace que tus pacientes usarán para reservar citas contigo. Puedes cambiarlo ahora o después.
                              </p>
                              
                              <div className="flex items-center gap-2 mt-4">
                                <div className="bg-slate-100 border border-slate-200 text-slate-500 px-4 h-12 rounded-xl flex items-center font-medium select-none shrink-0 text-sm md:text-base">
                                  saudade.mx/reservar/
                                </div>
                                <div className="flex-1 relative">
                                  <Input 
                                    value={slug} 
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                                    className={cn(
                                      "h-12 bg-white rounded-xl shadow-sm border-slate-200 text-lg font-semibold pr-10",
                                      slugStatus === 'available' && "border-emerald-500 focus-visible:ring-emerald-500/20",
                                      slugStatus === 'taken' && "border-destructive focus-visible:ring-destructive/20"
                                    )}
                                    placeholder="mi-consultorio"
                                  />
                                  {slugStatus === 'checking' && (
                                    <div className="absolute right-3 top-3.5 animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                                  )}
                                  {slugStatus === 'available' && (
                                    <CheckCircle2 className="absolute right-3 top-3.5 h-5 w-5 text-emerald-500" />
                                  )}
                                  {slugStatus === 'taken' && (
                                    <div className="absolute right-3 top-3.5 text-destructive font-bold text-xs">Ocupado</div>
                                  )}
                                </div>
                              </div>
                              
                              {slugStatus === 'taken' && (
                                <p className="text-xs text-destructive mt-1">Este enlace ya está en uso. Prueba con otra combinación.</p>
                              )}
                              {slugStatus === 'available' && (
                                <p className="text-xs text-emerald-600 mt-1">¡El enlace está disponible!</p>
                              )}
                           </div>

                           <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                             <h4 className="font-bold text-slate-800 text-sm">Vista previa de tu tarjeta de presentación:</h4>
                             <div className="mt-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
                               <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-lg">
                                 {prefix ? prefix[0] : 'P'}
                               </div>
                               <div>
                                 <h5 className="font-bold text-slate-800 text-sm">{prefix} {fullName || 'Nombre Profesional'}</h5>
                                 <p className="text-xs text-slate-500">{specialty || 'Tu Especialidad'}</p>
                                 <p className="text-xs text-primary font-semibold mt-1">saudade.mx/perfil/{slug || '...'}</p>
                               </div>
                             </div>
                           </div>
                        </div>
                     )}

                     {/* STEP 5 */}
                     {currentStep === 5 && (
                        <div className="space-y-6">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <Label className="text-slate-800 font-bold text-lg">Firma Digital</Label>
                                  <p className="text-sm text-slate-500">Requerida por la NOM-024 para recetas y notas.</p>
                                </div>
                              </div>
                              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-md ring-4 ring-slate-50/50">
                                <SignaturePad onSign={(data) => setSignatureData(data)} onClear={() => setSignatureData(null)} height={180} />
                              </div>
                           </div>

                           <div className="flex items-start space-x-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                              <Checkbox 
                                id="terms" 
                                checked={agreedToTerms} 
                                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                                className="mt-1 h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20"
                              />
                              <label htmlFor="terms" className="text-sm text-slate-600 leading-normal cursor-pointer select-none">
                                Confirmo que la firma digital trazada es mía y acepto los{" "}
                                <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors font-semibold">
                                  Términos y Condiciones de Uso
                                </a>, la{" "}
                                <a href="/politicas" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors font-semibold">
                                  Política de Privacidad
                                </a>{" "}
                                y el{" "}
                                <a href="/politicas" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors font-semibold">
                                  Acuerdo de Procesamiento de Datos Clínicos
                                </a> de Saudade, conforme a la regulación de salud digital NOM-024.
                              </label>
                           </div>
                        </div>
                     )}
                  </motion.div>
               )}
            </AnimatePresence>

        </div>

        {/* Floating Footer Navigation */}
        {currentStep < 6 && (
          <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 px-6 md:px-12 lg:px-20 z-50">
            <div className="max-w-3xl mx-auto flex justify-between items-center w-full">
              <div className="w-1/3">
                {currentStep > 1 && (
                  <Button variant="ghost" className="text-slate-500 hover:text-slate-800 font-medium px-0" onClick={handleBack}>
                    Regresar
                  </Button>
                )}
              </div>

              <div className="flex justify-end items-center gap-3 w-2/3">
                {(currentStep === 2 || currentStep === 3) && (
                  <Button variant="ghost" className="text-slate-500 hover:text-slate-800 font-medium hidden sm:flex" onClick={handleSkip}>
                    Configurar después
                  </Button>
                )}
                
                {currentStep < 5 ? (
                  <Button size="lg" className="rounded-xl px-8 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 hover:scale-105 transition-all duration-300 font-semibold" onClick={handleNext}>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button size="lg" className="rounded-xl px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-all duration-300 font-semibold" onClick={handleComplete}>
                    <CheckCircle2 className="w-5 h-5" /> Comenzar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

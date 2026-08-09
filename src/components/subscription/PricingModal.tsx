import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Crown, Gift, Bell, Loader2, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { usePricingModal, useSubscription } from '@/hooks/useSubscription';

// ── Pricing Constants ──────────────────────────────────────────────────────
const MONTHLY_PRICE = 749;
const ANNUAL_PRICE = 7490;
const MONTHLY_EQUIVALENT = Math.round(ANNUAL_PRICE / 12); // 624
const ANNUAL_SAVINGS = (MONTHLY_PRICE * 12) - ANNUAL_PRICE; // 1498
const SAVINGS_PERCENT = Math.round((ANNUAL_SAVINGS / (MONTHLY_PRICE * 12)) * 100); // 16

const FEATURES = [
  'Pacientes e historiales ilimitados',
  'Asistente de IA para notas clínicas',
  'Consultorio Virtual (videollamadas)',
  'Escriba Ambiental de IA',
  'Notas SOAP estructuradas',
  'Exportar expedientes a PDF',
  'Agenda inteligente con recordatorios',
  'Calculadora de comisiones',
];

export default function PricingModal() {
  const { isOpen, close } = usePricingModal();
  const { isTrialExpired } = useSubscription();
  const { organization } = useOrganization();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Dates for timeline
  const today = new Date();
  const reminderDate = new Date(today);
  reminderDate.setDate(today.getDate() + 23);
  const chargeDate = new Date(today);
  chargeDate.setDate(today.getDate() + 30);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

  const selectedPrice = billingCycle === 'monthly' ? MONTHLY_PRICE : ANNUAL_PRICE;
  const selectedLabel = billingCycle === 'monthly' ? '/mes' : '/año';

  const handleCheckout = async () => {
    if (!organization) {
      toast.error('No se encontró tu organización. Recarga la página.');
      return;
    }
    setIsLoading(true);
    try {
      const planId = billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual';
      const { data, error } = await supabase.functions.invoke('create-billing-session', {
        body: {
          organization_id: organization.id,
          plan_id: planId,
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No se pudo generar la sesión de pago');
      }
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'No se pudo conectar con Stripe'));
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto flex justify-center items-start p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-white/20">
        
        {/* Close Button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all duration-200 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center pt-10 pb-6 px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            GetMySession Pro
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Elige tu plan
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {isTrialExpired 
              ? 'Suscríbete al Plan Pro para continuar gestionando tu consultorio clínico.' 
              : 'Pruébalo gratis 30 días. Cancela cuando quieras, sin compromisos.'}
          </p>

          {/* ── Toggle Mensual / Anual ── */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={cn(
              "text-sm font-semibold transition-colors duration-200",
              billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'
            )}>
              Mensual
            </span>
            
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
              className={cn(
                "relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/20",
                billingCycle === 'annual'
                  ? 'bg-primary shadow-lg shadow-primary/30'
                  : 'bg-slate-300 dark:bg-slate-600'
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                billingCycle === 'annual' ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
              )} />
            </button>

            <span className={cn(
              "text-sm font-semibold transition-colors duration-200",
              billingCycle === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-400'
            )}>
              Anual
            </span>

            {/* Savings Badge */}
            <span className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-300",
              billingCycle === 'annual'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 scale-100 opacity-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 scale-95 opacity-70'
            )}>
              <Zap className="w-3 h-3" />
              Ahorra {SAVINGS_PERCENT}%
            </span>
          </div>
        </div>

        {/* ── Plan Cards ── */}
        <div className="grid sm:grid-cols-2 gap-4 px-6 pb-6">
          
          {/* Monthly Card */}
          <div
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group",
              billingCycle === 'monthly'
                ? 'border-primary bg-primary/[0.03] dark:bg-primary/[0.08] shadow-lg shadow-primary/10 scale-[1.02]'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Mensual</h3>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                billingCycle === 'monthly'
                  ? 'border-primary bg-primary'
                  : 'border-slate-300 dark:border-slate-600'
              )}>
                {billingCycle === 'monthly' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">${MONTHLY_PRICE.toLocaleString()}</span>
              <span className="text-sm text-slate-500">/mes</span>
            </div>
            <p className="text-xs text-slate-400">Flexibilidad total, cancela cuando quieras</p>
          </div>

          {/* Annual Card */}
          <div
            onClick={() => setBillingCycle('annual')}
            className={cn(
              "relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 group overflow-hidden",
              billingCycle === 'annual'
                ? 'border-primary bg-primary/[0.03] dark:bg-primary/[0.08] shadow-lg shadow-primary/10 scale-[1.02]'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
            )}
          >
            {/* Popular Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Popular
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Anual</h3>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                billingCycle === 'annual'
                  ? 'border-primary bg-primary'
                  : 'border-slate-300 dark:border-slate-600'
              )}>
                {billingCycle === 'annual' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">${ANNUAL_PRICE.toLocaleString()}</span>
              <span className="text-sm text-slate-500">/año</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">${MONTHLY_EQUIVALENT}/mes efectivo</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
                Ahorras ${ANNUAL_SAVINGS.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ── Features List ── */}
        <div className="px-6 pb-6">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Todo lo que incluye GetMySession Pro</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {FEATURES.map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        {!isTrialExpired && (
          <div className="px-6 pb-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-0 w-full">
              {/* Step 1: Today */}
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10 group-hover:scale-110 transition-transform">
                  <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent -mt-5 mb-5" />
                <h4 className="font-bold text-slate-800 dark:text-white text-xs mt-2">Hoy</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight max-w-[140px]">
                  Inicia tu prueba gratis de 30 días
                </p>
              </div>

              {/* Connector */}
              <div className="flex-shrink-0 w-8 h-0.5 bg-slate-200 dark:bg-slate-700 -mt-8" />

              {/* Step 2: Reminder */}
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10 group-hover:scale-110 transition-transform">
                  <Bell className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent -mt-5 mb-5" />
                <h4 className="font-bold text-slate-800 dark:text-white text-xs mt-2">{formatDate(reminderDate)}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight max-w-[140px]">
                  Te avisaremos 7 días antes
                </p>
              </div>

              {/* Connector */}
              <div className="flex-shrink-0 w-8 h-0.5 bg-slate-200 dark:bg-slate-700 -mt-8" />

              {/* Step 3: Charge */}
              <div className="flex-1 flex flex-col items-center text-center group">
                <div className="flex items-center justify-center w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full border-4 border-white dark:border-slate-900 shadow-sm z-10 group-hover:scale-110 transition-transform">
                  <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent -mt-5 mb-5" />
                <h4 className="font-bold text-slate-800 dark:text-white text-xs mt-2">{formatDate(chargeDate)}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight max-w-[140px]">
                  Se cobra si no cancelas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CTA + Footer ── */}
        <div className="px-6 pb-8">
          {/* Checkout Summary */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <p className="text-xs text-slate-400">A pagar hoy</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {isTrialExpired 
                  ? `MX$${selectedPrice.toLocaleString()}` 
                  : 'MX$0'}
                {!isTrialExpired && <span className="text-xs font-normal text-slate-400"> (30 días gratis)</span>}
              </p>
            </div>
            {!isTrialExpired && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Después del {formatDate(chargeDate)}</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  MX${selectedPrice.toLocaleString()}{selectedLabel}
                </p>
              </div>
            )}
          </div>

          <Button
            className="w-full h-13 rounded-2xl text-base font-bold gap-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white shadow-xl shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> {isTrialExpired ? 'Suscribirse al Plan Pro' : 'Comenzar 30 días gratis'}</>
            )}
          </Button>

          {/* Footer notes */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Pagos seguros con Stripe · Cifrado de extremo a extremo</span>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-tight">
              Todos los precios están en Pesos Mexicanos (MXN). Tu suscripción se renueva automáticamente.
              Puedes cancelarla en cualquier momento desde tu configuración. Al continuar aceptas los{' '}
              <a href="/terminos" target="_blank" className="underline hover:text-primary transition-colors">Términos de uso</a> y{' '}
              <a href="/politicas" target="_blank" className="underline hover:text-primary transition-colors">Política de privacidad</a>.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

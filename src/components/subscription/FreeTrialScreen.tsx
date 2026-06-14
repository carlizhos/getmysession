import { useState } from 'react';
import { Check, Bell, Crown, Gift, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FreeTrialScreenProps {
  onContinue: (planId: 'pro_monthly' | 'pro_annual') => Promise<void>;
  isLoading: boolean;
}

const MONTHLY_PRICE = 749;
const ANNUAL_PRICE = 7490;
const MONTHLY_EQUIVALENT = Math.round(ANNUAL_PRICE / 12); // 624
const ANNUAL_SAVINGS = (MONTHLY_PRICE * 12) - ANNUAL_PRICE; // 1498
const SAVINGS_PERCENT = Math.round((ANNUAL_SAVINGS / (MONTHLY_PRICE * 12)) * 100); // 16

export default function FreeTrialScreen({ onContinue, isLoading }: FreeTrialScreenProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(() => {
    const savedPlan = localStorage.getItem('saudade_selected_plan');
    return savedPlan === 'pro_annual' ? 'annual' : 'monthly';
  });

  // Calculate dates
  const today = new Date();
  const reminderDate = new Date(today);
  reminderDate.setDate(today.getDate() + 23);
  const chargeDate = new Date(today);
  chargeDate.setDate(today.getDate() + 30);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const selectedPrice = billingCycle === 'monthly' ? MONTHLY_PRICE : ANNUAL_PRICE;
  const selectedLabel = billingCycle === 'monthly' ? '/mes' : '/año';
  const selectedPlanId = billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual';

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row">
        
        {/* Left Side: Plan Selection */}
        <div className="p-8 md:p-10 md:w-1/2 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Iniciar prueba gratis</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-emerald-100 rounded-full p-0.5">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600">Pruébalo gratis 30 días. Puedes cancelar cuando quieras.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-emerald-100 rounded-full p-0.5">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600">Te enviaremos un recordatorio antes de que se termine tu prueba.</p>
            </div>
          </div>

          {/* ── Toggle Mensual / Anual ── */}
          <div className="flex items-center gap-3 mb-6">
            <span className={cn(
              "text-sm font-semibold transition-colors duration-200",
              billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'
            )}>
              Mensual
            </span>
            
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
              className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary/20",
                billingCycle === 'annual'
                  ? 'bg-primary shadow-lg shadow-primary/30'
                  : 'bg-slate-300'
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300",
                billingCycle === 'annual' ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
              )} />
            </button>

            <span className={cn(
              "text-sm font-semibold transition-colors duration-200",
              billingCycle === 'annual' ? 'text-slate-900' : 'text-slate-400'
            )}>
              Anual
            </span>

            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-300",
              billingCycle === 'annual'
                ? 'bg-emerald-100 text-emerald-700 scale-100 opacity-100'
                : 'bg-slate-100 text-slate-500 scale-95 opacity-70'
            )}>
              <Zap className="w-2.5 h-2.5" />
              Ahorra {SAVINGS_PERCENT}%
            </span>
          </div>

          {/* ── Plan Cards ── */}
          <div className="space-y-3 mb-6">
            {/* Monthly */}
            <div
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all duration-200",
                billingCycle === 'monthly' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                billingCycle === 'monthly' ? 'border-primary bg-primary' : 'border-slate-300'
              )}>
                {billingCycle === 'monthly' && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div className="flex-1">
                <span className="font-semibold text-slate-900 block">Mensual</span>
                <span className="text-sm text-slate-500">MX${MONTHLY_PRICE.toLocaleString()} / mes</span>
              </div>
            </div>

            {/* Annual */}
            <div
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all duration-200",
                billingCycle === 'annual' 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                billingCycle === 'annual' ? 'border-primary bg-primary' : 'border-slate-300'
              )}>
                {billingCycle === 'annual' && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Anual</span>
                  <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Ahorra 2 meses
                  </span>
                </div>
                <span className="text-sm text-slate-500">
                  MX${ANNUAL_PRICE.toLocaleString()} (MX${MONTHLY_EQUIVALENT} al mes)
                </span>
              </div>
            </div>
          </div>

          {/* ── Summary + CTA ── */}
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <div className="flex justify-between text-sm text-slate-600 font-medium">
              <span>A pagar el {formatDate(chargeDate)}</span>
              <span>MX${selectedPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>A pagar hoy (30 días gratis)</span>
              <span>MX$0</span>
            </div>
            
            <Button 
              className="w-full mt-4 h-12 rounded-xl text-base bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              onClick={() => onContinue(selectedPlanId)}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Procesando...</>
              ) : (
                'Siguiente'
              )}
            </Button>
            
            <p className="text-[10px] text-slate-400 text-center leading-tight mt-4">
              Todos los precios están en Pesos Mexicanos (MXN). Al continuar, aceptas los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Términos de uso</a> y{' '}
              <a href="/politicas" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Política de privacidad</a> de Saudade.
              Tu suscripción se renueva de forma automática con el método de pago que elegiste.
              Puedes cancelarla en cualquier momento desde tu configuración para evitar cargos.
            </p>
          </div>
        </div>

        {/* Right Side: Timeline */}
        <div className="p-8 md:p-10 md:w-1/2 bg-white flex flex-col justify-center">
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            
            {/* Step 1: Today */}
            <div className="relative flex items-start gap-6 md:justify-center">
              <div className="hidden md:block w-full text-right pt-1 opacity-0 pointer-events-none">Placeholder</div>
              <div className="relative z-10 flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-full border-4 border-white shrink-0 md:mx-auto shadow-sm">
                <Gift className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="w-full pt-1">
                <h4 className="font-bold text-slate-900 text-sm">Hoy: Pruébalo gratis 30 días.</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Empieza hoy tu prueba gratis de Saudade Pro y accede a todas nuestras funciones premium sin restricciones.
                </p>
              </div>
            </div>

            {/* Step 2: Reminder */}
            <div className="relative flex items-start gap-6 md:justify-center">
              <div className="hidden md:block w-full text-right pt-1">
                <h4 className="font-bold text-slate-900 text-sm">{formatDate(reminderDate)}</h4>
                <p className="text-xs text-slate-500 mt-1">Te avisaremos 7 días antes de que termine tu prueba.</p>
              </div>
              <div className="relative z-10 flex items-center justify-center w-9 h-9 bg-slate-100 rounded-full border-4 border-white shrink-0 md:mx-auto shadow-sm">
                <Bell className="w-4 h-4 text-slate-500" />
              </div>
              <div className="w-full pt-1 md:hidden">
                <h4 className="font-bold text-slate-900 text-sm">{formatDate(reminderDate)}</h4>
                <p className="text-xs text-slate-500 mt-1">Te avisaremos 7 días antes de que termine tu prueba.</p>
              </div>
              <div className="hidden md:block w-full opacity-0 pointer-events-none">Placeholder</div>
            </div>

            {/* Step 3: Charge */}
            <div className="relative flex items-start gap-6 md:justify-center">
              <div className="hidden md:block w-full text-right pt-1 opacity-0 pointer-events-none">Placeholder</div>
              <div className="relative z-10 flex items-center justify-center w-9 h-9 bg-amber-100 rounded-full border-4 border-white shrink-0 md:mx-auto shadow-sm">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              <div className="w-full pt-1">
                <h4 className="font-bold text-slate-900 text-sm">{formatDate(chargeDate)}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tu suscripción va a empezar automáticamente si no la cancelas durante el periodo de prueba.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

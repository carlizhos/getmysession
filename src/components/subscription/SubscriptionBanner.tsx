import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, XCircle, ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubscriptionBanner() {
  const { isTrialing, isPastDue, isCanceled, daysRemaining, hasAccess, cancelAtPeriodEnd, navigateToUpgrade } = useSubscription();

  // Don't show banner for fully active paid users (unless canceling at period end)
  if (hasAccess && !isTrialing && !cancelAtPeriodEnd) return null;

  // Trialing
  if (isTrialing) {
    return (
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-500/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm font-medium text-slate-700 truncate">
            <span className="font-bold text-primary">{daysRemaining} días restantes</span> de tu prueba gratuita.
            {daysRemaining <= 7 && ' ¡Suscríbete para no perder acceso!'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={navigateToUpgrade}
          className="gap-1.5 rounded-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-sm shrink-0 text-xs px-4"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Suscribirse
        </Button>
      </div>
    );
  }

  // Cancel at period end (still active but will cancel)
  if (cancelAtPeriodEnd && hasAccess) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-amber-100 p-1.5 rounded-lg shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-amber-800 truncate">
            Tu suscripción se cancelará en <span className="font-bold">{daysRemaining} días</span>. Puedes reactivarla en cualquier momento.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={navigateToUpgrade}
          className="gap-1.5 rounded-lg font-bold border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0 text-xs px-4"
        >
          Reactivar
        </Button>
      </div>
    );
  }

  // Past due
  if (isPastDue) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-amber-100 p-1.5 rounded-lg shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-amber-800 truncate">
            Tu pago no pudo ser procesado. Actualiza tu método de pago para no perder acceso.
          </p>
        </div>
        <Button
          size="sm"
          onClick={navigateToUpgrade}
          className="gap-1.5 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shrink-0 text-xs px-4"
        >
          Actualizar pago
        </Button>
      </div>
    );
  }

  // Canceled / Expired
  if (isCanceled) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-red-100 p-1.5 rounded-lg shrink-0">
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-sm font-medium text-red-800 truncate">
            Tu suscripción ha vencido. Algunas funciones están limitadas.
          </p>
        </div>
        <Button
          size="sm"
          onClick={navigateToUpgrade}
          className="gap-1.5 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white shadow-sm shrink-0 text-xs px-4"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Reactivar Plan Pro
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return null;
}

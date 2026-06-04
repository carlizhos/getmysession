import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubscriptionBanner() {
  const { isTrialing, isPastDue, isCanceled, daysRemaining, hasAccess, cancelAtPeriodEnd, navigateToUpgrade } = useSubscription();

  // Don't show banner for fully active paid users (unless canceling at period end)
  if (hasAccess && !isTrialing && !cancelAtPeriodEnd) return null;

  let bannerStyle = "";
  let icon = null;
  let text = null;
  let buttonText = "";
  let buttonVariant: "default" | "destructive" | "outline" | "secondary" = "default";
  let buttonClass = "";

  if (isTrialing) {
    const isUrgent = daysRemaining <= 3;
    bannerStyle = isUrgent
      ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-600/10 dark:from-amber-500/15 dark:to-amber-600/5 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200"
      : "bg-gradient-to-r from-primary/15 via-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-primary/30 dark:border-primary/20 text-slate-800 dark:text-slate-200";
    
    icon = isUrgent ? (
      <div className="bg-amber-100 dark:bg-amber-950/60 p-1.5 rounded-lg shrink-0 animate-pulse">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
    ) : (
      <div className="bg-primary/20 dark:bg-primary/10 p-1.5 rounded-lg shrink-0">
        <Clock className="h-4 w-4 text-primary" />
      </div>
    );

    text = (
      <p className="text-sm font-semibold truncate">
        <span className={isUrgent ? "text-amber-700 dark:text-amber-400 font-bold" : "text-primary font-bold"}>
          {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
        </span> de tu prueba gratuita.
        {daysRemaining <= 7 ? ' ¡Suscríbete ahora para no perder acceso!' : ' Disfruta de Saudade Pro.'}
      </p>
    );
    buttonText = "Suscribirse";
    buttonClass = isUrgent 
      ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white"
      : "bg-primary hover:bg-primary/90 text-white";
  } else if (cancelAtPeriodEnd && hasAccess) {
    bannerStyle = "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-600/10 dark:from-amber-500/15 dark:to-amber-600/5 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200";
    icon = (
      <div className="bg-amber-100 dark:bg-amber-950/60 p-1.5 rounded-lg shrink-0">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
    );
    text = (
      <p className="text-sm font-semibold truncate">
        Tu suscripción se cancelará en <span className="font-bold text-amber-700 dark:text-amber-400">{daysRemaining} días</span>. Puedes reactivarla en cualquier momento.
      </p>
    );
    buttonText = "Reactivar";
    buttonVariant = "outline";
    buttonClass = "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-950/40";
  } else if (isPastDue) {
    bannerStyle = "bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-rose-600/10 dark:from-rose-500/15 dark:to-rose-600/5 border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-200";
    icon = (
      <div className="bg-rose-100 dark:bg-rose-950/60 p-1.5 rounded-lg shrink-0 animate-pulse">
        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
      </div>
    );
    text = (
      <p className="text-sm font-semibold truncate">
        Tu pago no pudo ser procesado. Actualiza tu método de pago para no perder acceso.
      </p>
    );
    buttonText = "Actualizar pago";
    buttonClass = "bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white";
  } else if (isCanceled) {
    bannerStyle = "bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-600/10 dark:from-red-500/15 dark:to-red-600/5 border-red-300 dark:border-red-500/30 text-red-900 dark:text-red-200";
    icon = (
      <div className="bg-red-100 dark:bg-red-950/60 p-1.5 rounded-lg shrink-0">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
    );
    text = (
      <p className="text-sm font-semibold truncate">
        Tu suscripción ha vencido. Algunas funciones están limitadas.
      </p>
    );
    buttonText = "Reactivar Plan Pro";
    buttonClass = "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white";
  }

  return (
    <div className="px-4 py-2 flex items-center justify-between gap-4 z-50 transition-all duration-300">
      <div className={cn(
        "w-full flex items-center justify-between gap-4 px-4 py-2.5 rounded-2xl border shadow-soft backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 duration-500",
        bannerStyle
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {icon}
          {text}
        </div>
        <Button
          size="sm"
          variant={buttonVariant}
          onClick={navigateToUpgrade}
          className={cn("gap-1.5 rounded-xl font-bold shadow-sm shrink-0 text-xs px-4 py-1.5 transition-all duration-200 active:scale-95", buttonClass)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubscriptionBanner() {
  const { isPastDue, hasAccess, navigateToUpgrade } = useSubscription();

  // Don't show banner if the user has access (active trial or active paid plan)
  if (hasAccess) return null;

  let bannerStyle = "";
  let icon = null;
  let text = null;
  let buttonText = "";
  let buttonVariant: "default" | "destructive" | "outline" | "secondary" = "default";
  let buttonClass = "";

  if (isPastDue) {
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
  } else {
    bannerStyle = "bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-600/10 dark:from-red-500/15 dark:to-red-600/5 border-red-300 dark:border-red-500/30 text-red-900 dark:text-red-200";
    icon = (
      <div className="bg-red-100 dark:bg-red-950/60 p-1.5 rounded-lg shrink-0">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
    );
    text = (
      <p className="text-sm font-semibold truncate">
        Tu periodo de prueba ha terminado. Contrata el Plan Pro para habilitar todas las funcionalidades.
      </p>
    );
    buttonText = "Contratar Plan Pro";
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

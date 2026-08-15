import { useSubscription, usePricingModal } from '@/hooks/useSubscription';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubscriptionBanner() {
  const { isTrialing, daysRemaining, hasAccess } = useSubscription();
  const { open: openModal } = usePricingModal();

  // Ocultar si el usuario ya es Pro (tiene acceso y no está en trial)
  // o si su trial todavía tiene bastante tiempo. (Puedes ajustar esta lógica si quieres que siempre se vea)
  if (hasAccess && (!isTrialing || daysRemaining > 5)) return null;

  return (
    <button
      onClick={openModal}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 group",
        "bg-white/95 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md border border-slate-200 dark:border-slate-700/50"
      )}
    >
      <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20 group-hover:scale-110 transition-transform" />
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
        Actualiza tu plan
      </span>
    </button>
  );
}

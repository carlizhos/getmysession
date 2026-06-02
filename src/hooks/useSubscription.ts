import { useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';

// Features that require a paid subscription
export type PremiumFeature = 
  | 'ai_scribe'       // AI Ambient Scribe in Telehealth
  | 'ai_assistant'    // AI Assistant page
  | 'ai_voice'        // AI Voice Recorder in Notes
  | 'telehealth'      // Virtual Consultorio (Jitsi)
  | 'pdf_export'      // Export clinical notes as PDF
  | 'invoicing';      // Electronic invoicing (SAT)

// Map features to minimum plan required
const FEATURE_PLANS: Record<PremiumFeature, string[]> = {
  ai_scribe: ['pro', 'clinic'],
  ai_assistant: ['pro', 'clinic'],
  ai_voice: ['pro', 'clinic'],
  telehealth: ['pro', 'clinic'],
  pdf_export: ['pro', 'clinic'],
  invoicing: ['pro', 'clinic'],
};

export function useSubscription() {
  const { organization } = useOrganization();
  const navigate = useNavigate();

  const status = organization?.subscription_status || 'trialing';
  const planId = organization?.plan_id || 'free';
  const periodEnd = organization?.current_period_end;
  const cancelAtPeriodEnd = organization?.cancel_at_period_end || false;

  const computed = useMemo(() => {
    const isActive = status === 'active';
    const isTrialing = status === 'trialing';
    const isPastDue = status === 'past_due';
    const isCanceled = status === 'canceled' || status === 'unpaid';
    const isPro = planId === 'pro';
    const isClinic = planId === 'clinic';
    const hasAccess = isActive || isTrialing;

    // Calculate days remaining in trial or current period
    let daysRemaining = 0;
    if (periodEnd) {
      const end = new Date(periodEnd);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const canUse = (feature: PremiumFeature): boolean => {
      if (!hasAccess) return false;
      const allowedPlans = FEATURE_PLANS[feature];
      if (!allowedPlans) return true;
      // During trial, allow everything
      if (isTrialing) return true;
      return allowedPlans.includes(planId);
    };

    return {
      status,
      planId,
      isPro,
      isClinic,
      isActive,
      isTrialing,
      isPastDue,
      isCanceled,
      hasAccess,
      daysRemaining,
      cancelAtPeriodEnd,
      canUse,
    };
  }, [status, planId, periodEnd, cancelAtPeriodEnd]);

  const navigateToUpgrade = () => {
    navigate('/settings?tab=suscripcion');
  };

  return {
    ...computed,
    navigateToUpgrade,
  };
}

import { useMemo, useState, useCallback, useSyncExternalStore } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';

// Features that require a paid subscription
export type PremiumFeature = 
  | 'ai_scribe'       // AI Ambient Scribe in Telehealth
  | 'ai_assistant'    // AI Assistant page
  | 'ai_voice'        // AI Voice Recorder in Notes
  | 'telehealth'      // Virtual Consultorio (Jitsi)
  | 'pdf_export'      // Export clinical notes as PDF
  | 'invoicing'       // Electronic invoicing (SAT)
  | 'core_patients'   // CRM
  | 'core_agenda'     // Agenda
  | 'core_notes'      // Clinical Notes Library
  | 'core_tests'      // Psychometric Tests
  | 'core_consents'   // Consents
  | 'core_finance';   // Finance

// Map features to minimum plan required
const FEATURE_PLANS: Record<PremiumFeature, string[]> = {
  ai_scribe: ['pro', 'clinic'],
  ai_assistant: ['pro', 'clinic'],
  ai_voice: ['pro', 'clinic'],
  telehealth: ['pro', 'clinic'],
  pdf_export: ['pro', 'clinic'],
  invoicing: ['pro', 'clinic'],
  core_patients: ['pro', 'clinic'],
  core_agenda: ['pro', 'clinic'],
  core_notes: ['pro', 'clinic'],
  core_tests: ['pro', 'clinic'],
  core_consents: ['pro', 'clinic'],
  core_finance: ['pro', 'clinic'],
};

// ── Global Pricing Modal State (singleton) ─────────────────────────────────
// Uses useSyncExternalStore so any component can subscribe without Context
let _pricingModalOpen = false;
const _listeners = new Set<() => void>();

function _emitChange() {
  _listeners.forEach((l) => l());
}

export function openPricingModal() {
  _pricingModalOpen = true;
  _emitChange();
}

export function closePricingModal() {
  _pricingModalOpen = false;
  _emitChange();
}

function _subscribe(listener: () => void) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _getSnapshot() {
  return _pricingModalOpen;
}

/** Hook to read/control the global pricing modal state */
export function usePricingModal() {
  const isOpen = useSyncExternalStore(_subscribe, _getSnapshot);
  return { isOpen, open: openPricingModal, close: closePricingModal };
}

// ── Main Subscription Hook ─────────────────────────────────────────────────

export function useSubscription() {
  const { organization } = useOrganization();
  const navigate = useNavigate();

  const status = organization?.subscription_status || 'trialing';
  const planId = organization?.plan_id || 'free';
  const periodEnd = organization?.current_period_end;
  const cancelAtPeriodEnd = organization?.cancel_at_period_end || false;

  const computed = useMemo(() => {
    // Calculate days remaining in trial or current period
    let daysRemaining = 0;
    
    // If periodEnd is null but we are in trialing, fallback to created_at + 30 days
    let effectiveEnd = periodEnd;
    if (!effectiveEnd && status === 'trialing' && organization?.created_at) {
      const createdDate = new Date(organization.created_at);
      createdDate.setDate(createdDate.getDate() + 30);
      effectiveEnd = createdDate.toISOString();
    }

    if (effectiveEnd) {
      const end = new Date(effectiveEnd);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const isActive = status === 'active';
    const isTrialing = status === 'trialing' && daysRemaining > 0;
    const isPastDue = status === 'past_due';
    const isCanceled = status === 'canceled' || status === 'unpaid';
    const isPro = planId === 'pro';
    const isClinic = planId === 'clinic';
    const hasAccess = isActive || isTrialing;

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
    openPricingModal();
  };

  return {
    ...computed,
    navigateToUpgrade,
  };
}

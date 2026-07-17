import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'converted' | 'rewarded' | 'expired';
  reward_amount_referrer: number;
  reward_amount_referred: number;
  converted_at: string | null;
  rewarded_at: string | null;
  expires_at: string | null;
  created_at: string;
  // Joined from profiles
  referred_name?: string;
  referred_email?: string;
}

export interface ReferralProgramConfig {
  enabled: boolean;
  reward_type: 'credit';
  reward_amount_referrer: number;
  reward_amount_referred: number;
  required_plan: string[];
  max_referrals: number | null;
  expiration_days: number;
}

const DEFAULT_CONFIG: ReferralProgramConfig = {
  enabled: true,
  reward_type: 'credit',
  reward_amount_referrer: 500,
  reward_amount_referred: 500,
  required_plan: ['pro', 'clinic'],
  max_referrals: null,
  expiration_days: 90,
};

export function useReferrals() {
  const { user } = useAuth();
  const { organization, isAdmin } = useOrganization();
  const queryClient = useQueryClient();

  // ── Fetch user's referral code and credit ────────────────────────────────
  const profileQuery = useQuery({
    queryKey: ['referral-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, referral_credit')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as { referral_code: string; referral_credit: number };
    },
    enabled: !!user?.id,
  });

  // ── Fetch referral history ───────────────────────────────────────────────
  const referralsQuery = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch referred user names
      const referredIds = (data || []).map((r: Referral) => r.referred_id);
      if (referredIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', referredIds);

      const profileMap = new Map(
        (profiles || []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
      );

      return (data || []).map((r: Referral) => ({
        ...r,
        referred_name: profileMap.get(r.referred_id) || 'Usuario',
      })) as Referral[];
    },
    enabled: !!user?.id,
  });

  // ── Read referral program config from organization settings ──────────────
  const config: ReferralProgramConfig = {
    ...DEFAULT_CONFIG,
    ...(organization?.settings?.referral_program as Partial<ReferralProgramConfig> || {}),
  };

  // ── Save referral program config (admin only) ────────────────────────────
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: ReferralProgramConfig) => {
      if (!organization?.id) throw new Error('No organization');

      const currentSettings = organization.settings || {};
      const updatedSettings = {
        ...currentSettings,
        referral_program: newConfig,
      };

      const { error } = await supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('id', organization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuración del programa de referidos guardada');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
    onError: (err: Error) => {
      toast.error('Error al guardar: ' + err.message);
    },
  });

  // ── Computed stats ───────────────────────────────────────────────────────
  const referrals = referralsQuery.data || [];
  const totalReferred = referrals.length;
  const totalRewarded = referrals.filter(r => r.status === 'rewarded').length;
  const totalPending = referrals.filter(r => r.status === 'pending').length;
  const totalCredit = profileQuery.data?.referral_credit || 0;

  return {
    // Profile data
    referralCode: profileQuery.data?.referral_code || '',
    totalCredit,

    // Referral history
    referrals,
    totalReferred,
    totalRewarded,
    totalPending,

    // Config
    config,
    saveConfig: saveConfigMutation.mutate,
    isSavingConfig: saveConfigMutation.isPending,

    // Loading states
    isLoading: profileQuery.isLoading || referralsQuery.isLoading,

    // Permissions
    isAdmin,
  };
}

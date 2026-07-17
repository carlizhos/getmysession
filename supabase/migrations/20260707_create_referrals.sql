-- Migration: Referral Program
-- Description: Adds referral codes to profiles, creates referrals table,
--   auto-generates codes, and auto-converts referrals on subscription activation.
-- Created: 2026-07-07

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Add referral columns to profiles
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS referral_credit NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.profiles.referral_code IS 'Unique 8-char alphanumeric code for referral sharing';
COMMENT ON COLUMN public.profiles.referred_by_id IS 'Profile ID of the user who referred this user';
COMMENT ON COLUMN public.profiles.referral_credit IS 'Accumulated credit (MXN) earned from successful referrals';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Create referrals table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
  reward_amount_referrer NUMERIC DEFAULT 0,
  reward_amount_referred NUMERIC DEFAULT 0,
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Enable RLS on referrals
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view referrals where they are the referrer or the referred
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Users can insert referrals (needed during signup flow)
CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT
WITH CHECK (referred_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Trigger: Auto-generate referral_code on profile creation
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      NEW.referral_code := upper(substr(md5(random()::text), 1, 8));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE referral_code = NEW.referral_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Backfill: Generate codes for existing profiles that don't have one
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  profile_row RECORD;
  new_code TEXT;
BEGIN
  FOR profile_row IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := upper(substr(md5(random()::text), 1, 8));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE referral_code = new_code
      );
    END LOOP;
    UPDATE public.profiles SET referral_code = new_code WHERE id = profile_row.id;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Trigger: Auto-convert referral when organization subscription activates
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_referral_conversion()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_referral RECORD;
  v_config JSONB;
  v_reward_referrer NUMERIC;
  v_reward_referred NUMERIC;
BEGIN
  -- Only fire when subscription_status changes to 'active' with a paid plan
  IF NEW.subscription_status = 'active'
     AND NEW.plan_id IN ('pro', 'clinic')
     AND (OLD.subscription_status IS DISTINCT FROM 'active'
          OR OLD.plan_id IS DISTINCT FROM NEW.plan_id) THEN

    -- Find the owner of this organization
    SELECT user_id INTO v_user_id
    FROM public.organization_members
    WHERE organization_id = NEW.id AND role = 'owner'
    LIMIT 1;

    IF v_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Find a pending referral for this user
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE referred_id = v_user_id
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now());

    IF FOUND THEN
      -- Read referral config from the referrer's organization settings
      SELECT o.settings->'referral_program' INTO v_config
      FROM public.profiles p
      JOIN public.organizations o ON p.current_organization_id = o.id
      WHERE p.id = v_referral.referrer_id;

      -- Use configured amounts or defaults
      v_reward_referrer := COALESCE((v_config->>'reward_amount_referrer')::numeric, 500);
      v_reward_referred := COALESCE((v_config->>'reward_amount_referred')::numeric, 500);

      -- Update referral status to rewarded
      UPDATE public.referrals
      SET status = 'rewarded',
          converted_at = now(),
          rewarded_at = now(),
          reward_amount_referrer = v_reward_referrer,
          reward_amount_referred = v_reward_referred,
          updated_at = now()
      WHERE id = v_referral.id;

      -- Credit both users
      UPDATE public.profiles
      SET referral_credit = COALESCE(referral_credit, 0) + v_reward_referrer
      WHERE id = v_referral.referrer_id;

      UPDATE public.profiles
      SET referral_credit = COALESCE(referral_credit, 0) + v_reward_referred
      WHERE id = v_referral.referred_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_referral_conversion ON public.organizations;
CREATE TRIGGER trigger_referral_conversion
AFTER UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.handle_referral_conversion();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. updated_at trigger for referrals
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_referrals_updated_at ON public.referrals;
CREATE TRIGGER set_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

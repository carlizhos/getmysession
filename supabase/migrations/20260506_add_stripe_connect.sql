-- Migration: Add Stripe Connect columns to profiles
-- Description: Adds columns to store the Stripe connected account ID and its status.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.stripe_account_id IS 'The connected Stripe Account ID (acct_...) for this psychologist.';
COMMENT ON COLUMN public.profiles.stripe_account_status IS 'Status of the Stripe connection (pending, active).';

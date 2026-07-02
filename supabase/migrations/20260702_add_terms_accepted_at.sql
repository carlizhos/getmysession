-- Migration: Add terms_accepted_at to profiles table to log legal consent
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp of when the user accepted the terms, privacy policy, and clinical data agreement during onboarding';

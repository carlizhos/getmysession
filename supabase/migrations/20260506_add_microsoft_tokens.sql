-- Migration: Add Microsoft OAuth columns to profiles
-- Description: Adds columns to store Microsoft 365 / Outlook tokens for calendar integration.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS microsoft_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS microsoft_access_token TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.microsoft_refresh_token IS 'Encrypted or plain refresh token for Microsoft Graph API';
COMMENT ON COLUMN public.profiles.microsoft_access_token IS 'Temporary access token for Microsoft Graph API';

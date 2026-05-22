-- Migration: Add Zoom OAuth columns to profiles
-- Description: Adds columns to store Zoom refresh and access tokens for videoconference integration.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS zoom_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS zoom_access_token TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.zoom_refresh_token IS 'Encrypted or plain refresh token for Zoom API';
COMMENT ON COLUMN public.profiles.zoom_access_token IS 'Temporary access token for Zoom API';

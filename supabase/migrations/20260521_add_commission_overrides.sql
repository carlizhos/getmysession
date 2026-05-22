-- Migration: Add commission overrides columns
-- Description: Adds commission_percentage column to services and appointments tables.
-- Created: 2026-05-21

-- 1. Add commission_percentage to public.services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC DEFAULT NULL;
COMMENT ON COLUMN public.services.commission_percentage IS 'Service-specific commission percentage (overrides global profile settings if set).';

-- 2. Add commission_percentage to public.appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC DEFAULT NULL;
COMMENT ON COLUMN public.appointments.commission_percentage IS 'Commission percentage snapshot active at the time of booking.';

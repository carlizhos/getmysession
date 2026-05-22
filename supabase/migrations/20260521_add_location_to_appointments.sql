-- Migration: Add location column to appointments table
-- Description: Stores the physical location or office address for in-person sessions.
-- Created: 2026-05-21

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.appointments.location IS 'Physical location or office address where the in-person session takes place.';

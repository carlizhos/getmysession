-- Migration: Add whatsapp_reminder_sent column to appointments
-- Description: Adds a boolean column to track if a WhatsApp reminder was already sent for an appointment.

-- 1. Add whatsapp_reminder_sent to public.appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent BOOLEAN DEFAULT false NOT NULL;
COMMENT ON COLUMN public.appointments.whatsapp_reminder_sent IS 'Indica si ya se envió el recordatorio automático de WhatsApp para esta cita.';

-- Migration: Add age and reason for consultation to appointments and leads
-- Description: Adds fields to capture more information from patients during the booking process.

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS patient_age INTEGER,
ADD COLUMN IF NOT EXISTS reason_for_consultation TEXT;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS reason_for_consultation TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.appointments.patient_age IS 'The age of the patient at the time of booking.';
COMMENT ON COLUMN public.appointments.reason_for_consultation IS 'The reason why the patient is seeking a consultation.';
COMMENT ON COLUMN public.leads.age IS 'The age of the lead.';
COMMENT ON COLUMN public.leads.reason_for_consultation IS 'The reason for consultation provided by the lead.';

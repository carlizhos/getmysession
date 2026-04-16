-- Migration to add modality and recurrence support to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'presencial',
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_id UUID;

-- Index for better performance when updating series
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_id ON public.appointments(recurrence_id);

-- Add missing columns to session_notes

ALTER TABLE public.session_notes
ADD COLUMN IF NOT EXISTS content JSONB,
ADD COLUMN IF NOT EXISTS transcript_summary TEXT;

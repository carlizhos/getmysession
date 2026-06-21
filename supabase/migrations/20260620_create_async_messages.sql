-- ============================================================================
-- Migration: Create async_messages table
-- Purpose: Motor de Seguimiento Clínico Asíncrono — stores patient messages
--          along with AI-generated clinical analysis (summary, emotions,
--          key points, red flags, and therapeutic approach suggestions).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.async_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    source_text TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'whatsapp',
    ai_summary TEXT,
    ai_emotions TEXT[] DEFAULT '{}',
    ai_key_points TEXT[] DEFAULT '{}',
    ai_red_flag BOOLEAN DEFAULT FALSE,
    ai_red_flag_reason TEXT,
    ai_approach_suggestion TEXT,
    ai_processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table comment
COMMENT ON TABLE public.async_messages IS
    'Stores inbound patient messages (WhatsApp, audio, etc.) and their AI-generated '
    'clinical analysis including emotional detection, key session points, red-flag '
    'alerts, and therapeutic approach suggestions for the async clinical tracking engine.';

-- Enable Row Level Security
ALTER TABLE public.async_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Organization members can SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Org members can manage async_messages"
    ON public.async_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE organization_id = async_messages.organization_id
              AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.organization_members
            WHERE organization_id = async_messages.organization_id
              AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_async_messages_organization_id ON public.async_messages (organization_id);
CREATE INDEX idx_async_messages_patient_id ON public.async_messages (patient_id);
CREATE INDEX idx_async_messages_created_at ON public.async_messages (created_at DESC);
CREATE INDEX idx_async_messages_patient_id_created_at ON public.async_messages (patient_id, created_at DESC);

-- Migration: Create services table (Agenda Types)
-- Description: Stores different session types (services) for psychologists.
-- Created: 2026-05-10

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 60, -- duration in minutes
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'MXN',
    is_public BOOLEAN NOT NULL DEFAULT true,
    color TEXT NOT NULL DEFAULT 'violet',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own services" ON public.services
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public services are visible to everyone" ON public.services
    FOR SELECT
    USING (is_public = true AND active = true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id ON public.services(organization_id);

-- Updated at trigger
CREATE TRIGGER set_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.services IS 'Psychologists services/agenda types catalog.';
COMMENT ON COLUMN public.services.duration IS 'Duration of the session in minutes.';
COMMENT ON COLUMN public.services.is_public IS 'Whether the service is visible in the public booking portal.';

-- Link appointments and leads to services
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);

COMMENT ON COLUMN public.appointments.service_id IS 'The specific service/agenda type selected for this appointment.';
COMMENT ON COLUMN public.leads.service_id IS 'The specific service/agenda type the lead is interested in.';

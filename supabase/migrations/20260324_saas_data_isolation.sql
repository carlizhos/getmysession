-- Migration: SaaS Data Isolation (Revised)
-- Description: Scoping entity tables to organizations and updating RLS
-- Created: 2026-03-24

-- 1. Helper function to get organization_id from user_id
CREATE OR REPLACE FUNCTION public.get_user_org(u_id UUID)
RETURNS UUID AS $$
    SELECT current_organization_id FROM public.profiles WHERE id = u_id;
$$ LANGUAGE sql STABLE;

-- 2. Add organization_id to target tables
DO $$
BEGIN
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.session_notes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.patient_tests ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.consent_forms ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
END $$;

-- 3. Backfill organization_id
-- Patients
UPDATE public.patients p
SET organization_id = COALESCE(
    public.get_user_org(p.user_id),
    (SELECT public.get_user_org(a.therapist_id) FROM public.appointments a WHERE a.patient_id = p.id LIMIT 1),
    (SELECT id FROM public.organizations LIMIT 1)
)
WHERE p.organization_id IS NULL;

-- Appointments
UPDATE public.appointments a
SET organization_id = public.get_user_org(a.therapist_id)
WHERE a.organization_id IS NULL AND a.therapist_id IS NOT NULL;

-- Clinical Notes
UPDATE public.clinical_notes n
SET organization_id = public.get_user_org(n.therapist_id)
WHERE n.organization_id IS NULL AND n.therapist_id IS NOT NULL;

-- Session Notes
UPDATE public.session_notes n
SET organization_id = public.get_user_org(n.therapist_id)
WHERE n.organization_id IS NULL AND n.therapist_id IS NOT NULL;

-- Payments
UPDATE public.payments pay
SET organization_id = public.get_user_org(pay.user_id)
WHERE pay.organization_id IS NULL AND pay.user_id IS NOT NULL;

-- Patient Tests
UPDATE public.patient_tests pt
SET organization_id = public.get_user_org(pt.user_id)
WHERE pt.organization_id IS NULL AND pt.user_id IS NOT NULL;

-- Leads
UPDATE public.leads l
SET organization_id = public.get_user_org(l.user_id)
WHERE l.organization_id IS NULL AND l.user_id IS NOT NULL;

-- Consent Forms
UPDATE public.consent_forms cf
SET organization_id = public.get_user_org(cf.user_id)
WHERE cf.organization_id IS NULL AND cf.user_id IS NOT NULL;

-- Activity Logs
UPDATE public.activity_logs l
SET organization_id = public.get_user_org(l.user_id)
WHERE l.organization_id IS NULL AND l.user_id IS NOT NULL;

-- Ensure all remaining NULLs get a default (safety check)
DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY['patients', 'appointments', 'clinical_notes', 'session_notes', 'payments', 'patient_tests', 'activity_logs', 'leads', 'consent_forms'];
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    FOREACH t IN ARRAY target_tables
    LOOP
        EXECUTE 'UPDATE public.' || t || ' SET organization_id = $1 WHERE organization_id IS NULL' USING default_org_id;
    END LOOP;
END $$;

-- 4. Set NOT NULL and add indexes
DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY['patients', 'appointments', 'clinical_notes', 'session_notes', 'payments', 'patient_tests', 'activity_logs', 'leads', 'consent_forms'];
BEGIN
    FOREACH t IN ARRAY target_tables
    LOOP
        EXECUTE 'ALTER TABLE public.' || t || ' ALTER COLUMN organization_id SET NOT NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || t || '_organization_id ON public.' || t || '(organization_id)';
    END LOOP;
END $$;

-- 5. Update RLS Policies
-- Patients
DROP POLICY IF EXISTS "Users can view their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
CREATE POLICY "Org members can manage patients" ON public.patients
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.patients.organization_id AND user_id = auth.uid())
);

-- Appointments
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
CREATE POLICY "Org members can manage appointments" ON public.appointments
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.appointments.organization_id AND user_id = auth.uid())
);

-- Clinical & Session Notes
DROP POLICY IF EXISTS "Users can view their own clinical notes" ON public.clinical_notes;
CREATE POLICY "Org members can manage clinical notes" ON public.clinical_notes
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.clinical_notes.organization_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Therapists can manage their session notes" ON public.session_notes;
CREATE POLICY "Org members can manage session notes" ON public.session_notes
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.session_notes.organization_id AND user_id = auth.uid())
);

-- Payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Org members can manage payments" ON public.payments
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.payments.organization_id AND user_id = auth.uid())
);

-- Leads
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
CREATE POLICY "Org members can manage leads" ON public.leads
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.leads.organization_id AND user_id = auth.uid())
);

-- Consent Forms
DROP POLICY IF EXISTS "Users can manage their consent forms" ON public.consent_forms;
CREATE POLICY "Org members can manage consent forms" ON public.consent_forms
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.consent_forms.organization_id AND user_id = auth.uid())
);

-- Patient Tests
DROP POLICY IF EXISTS "Users can manage their patient tests" ON public.patient_tests;
CREATE POLICY "Org members can manage patient tests" ON public.patient_tests
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = public.patient_tests.organization_id AND user_id = auth.uid())
);

-- Cleanup
DROP FUNCTION IF EXISTS public.get_user_org(UUID);

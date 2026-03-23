-- Migration: SaaS Core Schema
-- Description: Introduction of multi-tenancy with organizations and members
-- Created: 2026-03-24

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 2. Organization Members Table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'therapist', 'receptionist')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- 3. Update Profiles to include current organization context
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES public.organizations(id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Organizations
-- Users can see organizations they are members of
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = public.organizations.id
        AND organization_members.user_id = auth.uid()
    )
);

-- Owners and admins can update organization details
CREATE POLICY "Owners and admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = public.organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
);

-- 6. RLS Policies for Organization Members
-- Members can view their teammates
CREATE POLICY "Members can view other members of the same organization"
ON public.organization_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members AS my_membership
        WHERE my_membership.organization_id = public.organization_members.organization_id
        AND my_membership.user_id = auth.uid()
    )
);

-- Only owners and admins can manage memberships
CREATE POLICY "Admins can manage memberships"
ON public.organization_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members AS executor
        WHERE executor.organization_id = public.organization_members.organization_id
        AND executor.user_id = auth.uid()
        AND executor.role IN ('owner', 'admin')
    )
);

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 8. Data Migration for existing users
-- Each existing profile that doesn't have an organization gets a default one.
DO $$
DECLARE
    profile_record RECORD;
    new_org_id UUID;
BEGIN
    FOR profile_record IN SELECT id, full_name, slug FROM public.profiles WHERE current_organization_id IS NULL LOOP
        -- Create a personal organization for each user
        -- Using 'org-' prefix for slug to avoid collisions with patient slugs if any
        INSERT INTO public.organizations (name, slug)
        VALUES (COALESCE(profile_record.full_name, 'Mi Consultorio'), 'org-' || profile_record.id)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO new_org_id;

        -- Add user as owner
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, profile_record.id, 'owner')
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        -- Set as current organization
        UPDATE public.profiles
        SET current_organization_id = new_org_id
        WHERE id = profile_record.id;
    END LOOP;
END $$;

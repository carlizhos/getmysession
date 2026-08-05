-- Migration: Create SuperAdmin Metrics System
-- Description: Adds is_superadmin flag and RPC for global SaaS metrics without breaking RLS

-- 1. Add is_superadmin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- 2. Create RPC for SaaS Metrics (SECURITY DEFINER to bypass RLS safely)
CREATE OR REPLACE FUNCTION get_saas_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_is_superadmin BOOLEAN;
    result JSON;
BEGIN
    -- Verify caller is superadmin
    SELECT is_superadmin INTO caller_is_superadmin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT caller_is_superadmin THEN
        RAISE EXCEPTION 'Unauthorized: Solo los Super Administradores pueden ver estas metricas.';
    END IF;

    -- Aggregate metrics safely
    SELECT json_build_object(
        'total_organizations', (SELECT count(*) FROM public.organizations),
        'active_organizations', (SELECT count(*) FROM public.organizations WHERE subscription_status IN ('active', 'trialing')),
        'total_patients', (SELECT count(*) FROM public.patients),
        'total_appointments', (SELECT count(*) FROM public.appointments),
        'organizations_list', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', o.id,
                    'name', o.name,
                    'slug', o.slug,
                    'subscription_status', o.subscription_status,
                    'created_at', o.created_at,
                    'stripe_customer_id', o.stripe_customer_id,
                    'owner_name', (
                        SELECT p.full_name 
                        FROM public.organization_members om 
                        JOIN public.profiles p ON p.id = om.user_id 
                        WHERE om.organization_id = o.id AND om.role = 'owner' 
                        LIMIT 1
                    ),
                    'owner_email', (
                        SELECT p.email 
                        FROM public.organization_members om 
                        JOIN public.profiles p ON p.id = om.user_id 
                        WHERE om.organization_id = o.id AND om.role = 'owner' 
                        LIMIT 1
                    ),
                    'patient_count', (SELECT count(*) FROM public.patients pat WHERE pat.organization_id = o.id)
                )
                ORDER BY o.created_at DESC
            ), '[]'::json)
            FROM public.organizations o
        )
    ) INTO result;

    RETURN result;
END;
$$;

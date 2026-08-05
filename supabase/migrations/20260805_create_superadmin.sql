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
        'total_organizations', (SELECT count(DISTINCT au.email) 
                                FROM public.organization_members om
                                JOIN auth.users au ON au.id = om.user_id
                                WHERE om.role = 'owner'),
        'active_organizations', (SELECT count(DISTINCT au.email) 
                                 FROM public.organization_members om
                                 JOIN auth.users au ON au.id = om.user_id
                                 JOIN public.organizations o ON o.id = om.organization_id
                                 WHERE om.role = 'owner' AND o.subscription_status IN ('active', 'trialing')),
        'total_patients', (SELECT count(*) FROM public.patients),
        'total_appointments', (SELECT count(*) FROM public.appointments),
        'organizations_list', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', org_data.id,
                    'name', org_data.name,
                    'slug', org_data.slug,
                    'subscription_status', org_data.subscription_status,
                    'created_at', org_data.created_at,
                    'stripe_customer_id', org_data.stripe_customer_id,
                    'owner_name', org_data.owner_name,
                    'owner_email', org_data.owner_email,
                    'patient_count', org_data.patient_count
                )
                ORDER BY org_data.created_at DESC
            ), '[]'::json)
            FROM (
                -- Use DISTINCT ON to get only the most recently created organization per owner email
                SELECT DISTINCT ON (au.email)
                    o.id,
                    o.name,
                    o.slug,
                    o.subscription_status,
                    o.created_at,
                    o.stripe_customer_id,
                    p.full_name as owner_name,
                    au.email as owner_email,
                    (SELECT count(*) FROM public.patients pat WHERE pat.organization_id = o.id) as patient_count
                FROM public.organizations o
                JOIN public.organization_members om ON om.organization_id = o.id AND om.role = 'owner'
                JOIN auth.users au ON au.id = om.user_id
                JOIN public.profiles p ON p.id = om.user_id
                ORDER BY au.email, o.created_at DESC
            ) AS org_data
        )
    ) INTO result;

    RETURN result;
END;
$$;

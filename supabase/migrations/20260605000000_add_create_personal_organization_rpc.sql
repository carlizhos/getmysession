CREATE OR REPLACE FUNCTION public.create_personal_organization(
    p_name TEXT,
    p_slug TEXT,
    p_user_id UUID
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org public.organizations;
BEGIN
    -- Check if user is the caller to prevent abuse
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Insert into organizations
    INSERT INTO public.organizations (name, slug, subscription_status)
    VALUES (p_name, p_slug, 'inactive')
    RETURNING * INTO new_org;

    -- Insert into organization_members
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org.id, p_user_id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Update profile
    UPDATE public.profiles
    SET current_organization_id = new_org.id
    WHERE id = p_user_id;

    RETURN new_org;
END;
$$;

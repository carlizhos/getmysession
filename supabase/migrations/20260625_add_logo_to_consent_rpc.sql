-- Migration: Add specialist logo_data to get_patient_consents RPC
-- Description: Extends the get_patient_consents function to include the professional's logo_data
-- so the Patient Portal can render the therapist's logo in downloaded consent PDFs.

DROP FUNCTION IF EXISTS public.get_patient_consents(uuid);

CREATE OR REPLACE FUNCTION public.get_patient_consents(p_access_token uuid)
 RETURNS TABLE(
    id uuid, 
    form_type text, 
    signed_at timestamp with time zone,
    is_valid boolean, 
    consent_text text,
    signature_data_url text,
    signature_hash text,
    created_at timestamp with time zone,
    specialist_name text,
    specialist_prefix text,
    specialist_logo_data text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_session RECORD;
BEGIN
    -- Validate the access token
    SELECT pat.email, pat.phone INTO v_session
    FROM portal_access_tokens pat
    WHERE pat.access_token = p_access_token
    AND pat.expires_at > now()
    AND pat.is_revoked = false;

    IF v_session IS NULL THEN
        RETURN; -- Invalid or expired token
    END IF;

    RETURN QUERY
    SELECT
        cf.id,
        cf.form_type,
        cf.signed_at,
        cf.is_valid,
        cf.consent_text,
        cf.signature_data_url,
        cf.signature_hash,
        cf.created_at,
        prof.full_name as specialist_name,
        prof.prefix as specialist_prefix,
        prof.logo_data as specialist_logo_data
    FROM consent_forms cf
    JOIN patients p ON cf.patient_id = p.id
    LEFT JOIN profiles prof ON cf.user_id = prof.id
    WHERE
        LOWER(p.email) = LOWER(v_session.email)
        AND (
            -- Handle variations in phone formatting
            p.phone = v_session.phone 
            OR REPLACE(REPLACE(REPLACE(REPLACE(p.phone, ' ', ''), '-', ''), '(', ''), ')', '') = REPLACE(REPLACE(REPLACE(REPLACE(v_session.phone, ' ', ''), '-', ''), '(', ''), ')', '')
        )
        AND cf.deleted_at IS NULL
    ORDER BY cf.created_at DESC;
END;
$function$;

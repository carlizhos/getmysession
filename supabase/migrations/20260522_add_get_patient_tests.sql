-- Migration: Add get_patient_tests RPC function
-- Description: Retrieves assigned tests for a patient using their secure portal access token.

CREATE OR REPLACE FUNCTION public.get_patient_tests(p_access_token uuid)
 RETURNS TABLE(
    id uuid, 
    test_type text, 
    token uuid,
    status text, 
    score integer,
    interpretation text,
    created_at timestamp with time zone,
    completed_at timestamp with time zone
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
        pt.id,
        pt.test_type,
        pt.token,
        pt.status,
        pt.score,
        pt.interpretation,
        pt.created_at,
        pt.completed_at
    FROM patient_tests pt
    JOIN patients p ON pt.patient_id = p.id
    WHERE
        LOWER(p.email) = LOWER(v_session.email)
        AND (
            -- Handle variations in phone formatting
            p.phone = v_session.phone 
            OR REPLACE(REPLACE(REPLACE(REPLACE(p.phone, ' ', ''), '-', ''), '(', ''), ')', '') = REPLACE(REPLACE(REPLACE(REPLACE(v_session.phone, ' ', ''), '-', ''), '(', ''), ')', '')
        )
    ORDER BY pt.created_at DESC;
END;
$function$;

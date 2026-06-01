CREATE OR REPLACE FUNCTION public.create_portal_session(p_email text, p_phone text)
 RETURNS TABLE(access_token uuid, patient_name text, patient_email text, patient_phone text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_record RECORD;
    v_token UUID;
    v_expires TIMESTAMPTZ;
    clean_p_phone text;
BEGIN
    -- Strip all non-numeric characters and get last 10 digits for robust matching
    clean_p_phone := RIGHT(regexp_replace(p_phone, '\D', '', 'g'), 10);

    -- 1. Try to find a match in the patients table
    SELECT p.name, p.email, p.phone INTO v_record
    FROM patients p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    AND RIGHT(regexp_replace(p.phone, '\D', '', 'g'), 10) = clean_p_phone
    LIMIT 1;

    -- 2. Fallback to leads table
    IF v_record IS NULL THEN
        SELECT l.name, l.email, l.phone INTO v_record
        FROM leads l
        WHERE LOWER(TRIM(l.email)) = LOWER(TRIM(p_email))
        AND RIGHT(regexp_replace(l.phone, '\D', '', 'g'), 10) = clean_p_phone
        LIMIT 1;
    END IF;

    IF v_record IS NULL THEN
        RETURN;
    END IF;

    v_token := gen_random_uuid();
    v_expires := now() + interval '24 hours';

    INSERT INTO portal_access_tokens (access_token, email, phone, patient_name, expires_at)
    VALUES (v_token, v_record.email, v_record.phone, v_record.name, v_expires);

    RETURN QUERY SELECT v_token, v_record.name, v_record.email, v_record.phone, v_expires;
END;
$function$;

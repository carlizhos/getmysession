-- Migration: Add secure remote consent RPC functions and therapist notification
-- Description: Enables secure access to patient consent forms from the Patient Portal and logs an activity notification when a form is signed.

-- 1. Function to retrieve assigned consent forms for the patient portal
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
    specialist_prefix text
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
        prof.prefix as specialist_prefix
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

-- 2. Function to sign a pending consent form securely from the patient portal
CREATE OR REPLACE FUNCTION public.sign_patient_consent(
    p_access_token uuid,
    p_consent_id uuid,
    p_signature_data_url text,
    p_signature_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_session RECORD;
    v_patient_id uuid;
    v_patient_name text;
    v_therapist_id uuid;
    v_org_id uuid;
    v_form_type text;
BEGIN
    -- Validate the access token
    SELECT pat.email, pat.phone INTO v_session
    FROM portal_access_tokens pat
    WHERE pat.access_token = p_access_token
    AND pat.expires_at > now()
    AND pat.is_revoked = false;

    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Sesión inválida o expirada.';
    END IF;

    -- Find the patient matching this session
    SELECT p.id, p.name INTO v_patient_id, v_patient_name
    FROM patients p
    WHERE LOWER(p.email) = LOWER(v_session.email)
    AND (
        p.phone = v_session.phone 
        OR REPLACE(REPLACE(REPLACE(REPLACE(p.phone, ' ', ''), '-', ''), '(', ''), ')', '') = REPLACE(REPLACE(REPLACE(REPLACE(v_session.phone, ' ', ''), '-', ''), '(', ''), ')', '')
    )
    LIMIT 1;

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Paciente no encontrado.';
    END IF;

    -- Verify and retrieve consent details before updating
    SELECT user_id, organization_id, form_type INTO v_therapist_id, v_org_id, v_form_type
    FROM consent_forms
    WHERE id = p_consent_id
    AND patient_id = v_patient_id
    AND deleted_at IS NULL;

    IF v_therapist_id IS NULL THEN
        RAISE EXCEPTION 'Documento de consentimiento no encontrado o no asignado a este paciente.';
    END IF;

    -- Update the consent form to mark it as signed and valid
    UPDATE consent_forms
    SET 
        signed_at = now(),
        signature_data_url = p_signature_data_url,
        signature_hash = p_signature_hash,
        is_valid = true,
        updated_at = now()
    WHERE id = p_consent_id
    AND patient_id = v_patient_id
    AND deleted_at IS NULL;

    -- Create an automatic activity log notification for the therapist
    INSERT INTO activity_logs (
        profile_id,
        organization_id,
        type,
        title,
        description,
        metadata,
        read,
        created_at
    )
    VALUES (
        v_therapist_id,
        v_org_id,
        'system_alert',
        'Consentimiento Firmado',
        'El paciente ' || v_patient_name || ' ha firmado el documento de ' || 
        CASE v_form_type
            WHEN 'general' THEN 'Consentimiento General'
            WHEN 'tratamiento' THEN 'Tratamiento Psicológico'
            WHEN 'datos_personales' THEN 'Datos Personales'
            ELSE v_form_type
        END || ' de forma remota.',
        jsonb_build_object('consent_id', p_consent_id, 'patient_id', v_patient_id, 'form_type', v_form_type),
        false,
        now()
    );

    RETURN true;
END;
$function$;

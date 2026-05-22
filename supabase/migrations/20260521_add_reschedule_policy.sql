-- Migration: Add reschedule_policy_hours columns and update RPC functions
-- Description: Adds reschedule_policy_hours to profiles, services, and appointments, and updates patient cancellation logic.

-- 1. Add reschedule_policy_hours to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reschedule_policy_hours INTEGER DEFAULT 24 NOT NULL;
COMMENT ON COLUMN public.profiles.reschedule_policy_hours IS 'Global default limit of hours allowed to cancel or reschedule an appointment.';

-- 2. Add reschedule_policy_hours to public.services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS reschedule_policy_hours INTEGER DEFAULT NULL;
COMMENT ON COLUMN public.services.reschedule_policy_hours IS 'Service-specific limit of hours allowed to cancel or reschedule (overrides global profile setting if set).';

-- 3. Add reschedule_policy_hours to public.appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reschedule_policy_hours INTEGER DEFAULT NULL;
COMMENT ON COLUMN public.appointments.reschedule_policy_hours IS 'Snapshot of the cancellation/rescheduling hour limit active at the time of booking.';

-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.get_patient_appointments(uuid);

-- 4. Redefine public.get_patient_appointments to return reschedule_policy_hours
CREATE OR REPLACE FUNCTION public.get_patient_appointments(p_access_token uuid)
 RETURNS TABLE(
    id uuid, 
    start_time timestamp with time zone, 
    end_time timestamp with time zone, 
    status text, 
    type text, 
    specialist_name text, 
    specialist_avatar text, 
    specialist_prefix text, 
    management_token uuid,
    reschedule_policy_hours integer
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
        a.id,
        a.start_time,
        a.end_time,
        a.status,
        a.type,
        prof.full_name as specialist_name,
        prof.avatar_url as specialist_avatar,
        prof.prefix as specialist_prefix,
        a.management_token,
        COALESCE(a.reschedule_policy_hours, 24)::integer as reschedule_policy_hours
    FROM appointments a
    JOIN profiles prof ON a.user_id = prof.id
    WHERE
        (a.notes LIKE '%' || v_session.email || '%' AND a.notes LIKE '%' || v_session.phone || '%')
        OR
        EXISTS (
            SELECT 1 FROM leads l
            WHERE l.user_id = a.user_id
            AND LOWER(l.email) = LOWER(v_session.email)
            AND l.phone = v_session.phone
        );
END;
$function$;

-- Drop existing function to ensure fresh definition
DROP FUNCTION IF EXISTS public.cancel_patient_appointment(uuid, uuid);

-- 5. Redefine public.cancel_patient_appointment with policy verification
CREATE OR REPLACE FUNCTION public.cancel_patient_appointment(p_appointment_id uuid, p_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_status TEXT;
    v_notes TEXT;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_policy_hours INTEGER;
BEGIN
    -- Verify the appointment exists AND the token matches
    SELECT a.status, a.notes, a.start_time, COALESCE(a.reschedule_policy_hours, 24) 
    INTO v_status, v_notes, v_start_time, v_policy_hours
    FROM appointments a
    WHERE a.id = p_appointment_id
    AND a.management_token = p_token;

    -- If no match, the token is invalid
    IF v_status IS NULL THEN
        RETURN false;
    END IF;

    -- Prevent cancelling already cancelled or completed appointments
    IF v_status IN ('cancelled', 'completed') THEN
        RETURN false;
    END IF;

    -- Enforce cancellation limit policy
    IF v_start_time - now() < v_policy_hours * INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La política de cancelación para esta cita requiere al menos % horas de anticipación.', v_policy_hours;
    END IF;

    -- Cancel the appointment
    UPDATE appointments
    SET status = 'cancelled',
        notes = v_notes || E'\n-- Cancelada por el paciente el ' || now()::text
    WHERE id = p_appointment_id
    AND management_token = p_token;

    RETURN true;
END;
$function$;

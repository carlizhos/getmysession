-- Migration: Create secure RPC for telehealth sessions
-- Description: Allows anonymous patients to securely fetch their appointment details using the unguessable UUID without exposing the whole table to public SELECT.
-- Created: 2026-07-02

CREATE OR REPLACE FUNCTION public.get_telehealth_session_details(p_appointment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios del creador (bypasses RLS)
SET search_path = public
AS $$
DECLARE
    v_appointment RECORD;
    v_profile RECORD;
    v_result JSON;
BEGIN
    -- 1. Buscar la cita
    SELECT * INTO v_appointment
    FROM public.appointments
    WHERE id = p_appointment_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 2. Buscar el perfil del especialista
    SELECT full_name, prefix, avatar_url INTO v_profile
    FROM public.profiles
    WHERE id = v_appointment.user_id;

    -- 3. Construir la respuesta JSON
    v_result := json_build_object(
        'id', v_appointment.id,
        'patient_name', v_appointment.patient_name,
        'start_time', v_appointment.start_time,
        'end_time', v_appointment.end_time,
        'profile', json_build_object(
            'full_name', v_profile.full_name,
            'prefix', v_profile.prefix,
            'avatar_url', v_profile.avatar_url
        )
    );

    RETURN v_result;
END;
$$;

-- Grant execute to anonymous users
GRANT EXECUTE ON FUNCTION public.get_telehealth_session_details(UUID) TO public;
GRANT EXECUTE ON FUNCTION public.get_telehealth_session_details(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_telehealth_session_details(UUID) TO authenticated;

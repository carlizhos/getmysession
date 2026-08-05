-- Migration: Create Reviews System
-- Description: Adds tables for patient reviews, magic links, and moderation

-- 1. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reply_text TEXT,
    replied_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'reported', 'hidden')),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying public reviews quickly by organization
CREATE INDEX IF NOT EXISTS idx_reviews_organization_id ON public.reviews(organization_id);

-- 2. Review Requests (Magic Links)
CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Reviews

-- Anyone can read published reviews
CREATE POLICY "Public can view published reviews"
ON public.reviews
FOR SELECT
USING (status = 'published');

-- Therapists/Admins can view ALL reviews for their organization
CREATE POLICY "Org members can view all their reviews"
ON public.reviews
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = public.reviews.organization_id
        AND user_id = auth.uid()
    )
);

-- Therapists/Admins can reply to or report reviews
CREATE POLICY "Org members can update their reviews"
ON public.reviews
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = public.reviews.organization_id
        AND user_id = auth.uid()
    )
);

-- 5. RLS for Review Requests
-- Org members can view review requests for their appts
CREATE POLICY "Org members can view review requests for their appts"
ON public.review_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.organization_members om ON om.organization_id = a.organization_id
        WHERE a.id = public.review_requests.appointment_id
        AND om.user_id = auth.uid()
    )
);

-- 6. Trigger for updated_at on reviews
DROP TRIGGER IF EXISTS set_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. RPC to submit a review securely using the magic link token
CREATE OR REPLACE FUNCTION public.submit_review(
    p_token UUID,
    p_rating INTEGER,
    p_comment TEXT,
    p_anonymous BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges so anon users can insert
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_appointment RECORD;
    v_review_id UUID;
BEGIN
    -- 1. Validate token
    SELECT * INTO v_request 
    FROM public.review_requests 
    WHERE token = p_token AND used_at IS NULL AND expires_at > now();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token de reseña inválido, expirado o ya utilizado';
    END IF;

    -- 2. Get appointment details to link the review
    SELECT * INTO v_appointment 
    FROM public.appointments 
    WHERE id = v_request.appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cita no encontrada';
    END IF;

    -- 3. Insert review
    INSERT INTO public.reviews (
        organization_id,
        patient_id,
        appointment_id,
        rating,
        comment,
        is_anonymous,
        status
    ) VALUES (
        v_appointment.organization_id,
        v_appointment.patient_id,
        v_appointment.appointment_id, -- Note: should just be v_appointment.id
        p_rating,
        p_comment,
        p_anonymous,
        'published'
    ) RETURNING id INTO v_review_id;

    -- 4. Mark token as used
    UPDATE public.review_requests 
    SET used_at = now() 
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

-- Note on RPC insert parameter: fixed the appointment ID bug in line above
CREATE OR REPLACE FUNCTION public.submit_review(
    p_token UUID,
    p_rating INTEGER,
    p_comment TEXT,
    p_anonymous BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges so anon users can insert
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_appointment RECORD;
    v_review_id UUID;
BEGIN
    -- 1. Validate token
    SELECT * INTO v_request 
    FROM public.review_requests 
    WHERE token = p_token AND used_at IS NULL AND expires_at > now();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token de reseña inválido, expirado o ya utilizado';
    END IF;

    -- 2. Get appointment details to link the review
    SELECT * INTO v_appointment 
    FROM public.appointments 
    WHERE id = v_request.appointment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cita no encontrada';
    END IF;

    -- 3. Insert review
    INSERT INTO public.reviews (
        organization_id,
        patient_id,
        appointment_id,
        rating,
        comment,
        is_anonymous,
        status
    ) VALUES (
        v_appointment.organization_id,
        v_appointment.patient_id,
        v_appointment.id, 
        p_rating,
        p_comment,
        p_anonymous,
        'published'
    ) RETURNING id INTO v_review_id;

    -- 4. Mark token as used
    UPDATE public.review_requests 
    SET used_at = now() 
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', true, 'review_id', v_review_id);
END;
$$;

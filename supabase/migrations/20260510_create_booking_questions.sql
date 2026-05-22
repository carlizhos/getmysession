-- Migration: Create booking_questions table
-- Description: Custom pre-booking questions configured by psychologists
-- Created: 2026-05-10

-- 1. Create booking_questions table
CREATE TABLE IF NOT EXISTS public.booking_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'textarea', 'yes_no', 'select_one', 'select_many')),
  options TEXT[] DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_booking_questions_user_id ON public.booking_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_questions_org_id ON public.booking_questions(organization_id);

-- 3. RLS
ALTER TABLE public.booking_questions ENABLE ROW LEVEL SECURITY;

-- Therapists can manage their own questions
CREATE POLICY "Users can manage own booking questions"
  ON public.booking_questions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for active questions (booking portal)
CREATE POLICY "Public can read active booking questions"
  ON public.booking_questions
  FOR SELECT
  USING (active = true);

-- 4. Add booking_answers JSONB to leads and appointments
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS booking_answers JSONB DEFAULT '{}';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booking_answers JSONB DEFAULT '{}';

-- 5. Comments
COMMENT ON TABLE public.booking_questions IS 'Custom pre-booking questions configured by psychologists for their public booking portal.';
COMMENT ON COLUMN public.booking_questions.type IS 'Question type: text, textarea, yes_no, select_one, select_many.';
COMMENT ON COLUMN public.booking_questions.options IS 'Options array for select_one and select_many question types.';
COMMENT ON COLUMN public.booking_questions.sort_order IS 'Display order of the question in the booking form.';
COMMENT ON COLUMN public.leads.booking_answers IS 'JSON object with answers to custom booking questions: { question_id: answer }.';
COMMENT ON COLUMN public.appointments.booking_answers IS 'JSON object with answers to custom booking questions: { question_id: answer }.';

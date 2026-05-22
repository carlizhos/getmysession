-- Migration: Create note_templates table with system seed data
-- Description: Clinical note templates (system + custom) for structuring session notes
-- Created: 2026-05-11

-- 1. Create note_templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sections TEXT[] NOT NULL DEFAULT '{}',
  section_labels JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  color TEXT DEFAULT 'violet',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_note_templates_user_id ON public.note_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_note_templates_system ON public.note_templates(is_system) WHERE is_system = true;

-- 3. RLS
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON public.note_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can read system templates"
  ON public.note_templates FOR SELECT
  USING (is_system = true);

-- 4. Add template_id to session_notes
ALTER TABLE public.session_notes ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.note_templates(id);

-- 5. Seed system templates
INSERT INTO public.note_templates (name, description, sections, section_labels, is_system, color) VALUES
(
  'Nota Básica',
  'Plantilla en blanco para crear notas de texto libre.',
  ARRAY['free_text', 'observations'],
  '{"free_text": "Nota de Sesión", "observations": "Observaciones"}',
  true, 'blue'
),
(
  'TCC',
  'Terapia Cognitivo-Conductual. Estructura completa con puente, agenda, creencias y plan de acción.',
  ARRAY['mood', 'bridge', 'agenda', 'beliefs', 'action_plan'],
  '{"mood": "Estado de Ánimo", "bridge": "Puente Intersesión", "agenda": "Agenda / Conceptualización", "beliefs": "Creencias Nucleares", "action_plan": "Plan de Acción"}',
  true, 'amber'
),
(
  'ACT',
  'Terapia de Aceptación y Compromiso. Enfocada en valores y mindfulness.',
  ARRAY['mood', 'goals', 'observations', 'free_text', 'action_plan'],
  '{"mood": "Estado de Ánimo", "goals": "Valores y Objetivos", "observations": "Procesos ACT", "free_text": "Ejercicios de Mindfulness / Defusión", "action_plan": "Compromisos de Acción"}',
  true, 'green'
),
(
  'DBT',
  'Terapia Dialéctica Conductual. Ideal para regulación emocional.',
  ARRAY['mood', 'techniques', 'observations', 'action_plan'],
  '{"mood": "Check-in Emocional", "techniques": "Habilidades DBT Practicadas", "observations": "Análisis de Cadena", "action_plan": "Práctica de Habilidades"}',
  true, 'rose'
),
(
  'Humanista',
  'Enfoque centrado en la persona. Énfasis en la experiencia subjetiva.',
  ARRAY['mood', 'free_text', 'observations', 'goals'],
  '{"mood": "Estado Emocional", "free_text": "Narrativa de la Sesión", "observations": "Reflejo Empático", "goals": "Crecimiento Personal"}',
  true, 'violet'
),
(
  'Psicodinámica',
  'Exploración del inconsciente, transferencia y mecanismos de defensa.',
  ARRAY['free_text', 'observations', 'beliefs'],
  '{"free_text": "Material de Sesión", "observations": "Transferencia y Contratransferencia", "beliefs": "Patrones Inconscientes"}',
  true, 'indigo'
),
(
  'TBCS',
  'Terapia Breve Centrada en Soluciones. Orientada a recursos y excepciones.',
  ARRAY['goals', 'techniques', 'observations', 'action_plan'],
  '{"goals": "Pregunta Milagro / Objetivos", "techniques": "Excepciones y Recursos", "observations": "Escala de Progreso", "action_plan": "Tarea Terapéutica"}',
  true, 'amber'
),
(
  'Sistémica',
  'Terapia sistémica. Análisis de relaciones y dinámica familiar.',
  ARRAY['observations', 'free_text', 'action_plan'],
  '{"observations": "Dinámica Relacional", "free_text": "Genograma / Mapa Familiar", "action_plan": "Intervenciones Sistémicas"}',
  true, 'blue'
);

-- 6. Comments
COMMENT ON TABLE public.note_templates IS 'Clinical note templates defining the structure of session notes. System templates are read-only.';
COMMENT ON COLUMN public.note_templates.sections IS 'Ordered array of section keys: mood, bridge, agenda, beliefs, action_plan, free_text, techniques, observations, goals, homework.';
COMMENT ON COLUMN public.note_templates.section_labels IS 'Custom labels per section as JSON: { "section_key": "Custom Label" }.';
COMMENT ON COLUMN public.note_templates.is_system IS 'System templates are pre-loaded and cannot be edited or deleted by users.';

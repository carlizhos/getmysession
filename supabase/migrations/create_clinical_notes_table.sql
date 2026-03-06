-- Create clinical_notes table
CREATE TABLE clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT, -- Denormalized for easier display if needed
  date DATE NOT NULL,
  session_number INTEGER,
  mood JSONB DEFAULT '{}'::jsonb, -- { rating: number, notes: string }
  bridge JSONB DEFAULT '{}'::jsonb, -- { items: [{text, completed}], notes: string }
  agenda JSONB DEFAULT '[]'::jsonb, -- [{ topic, situation, thoughts, emotions, interventions }]
  beliefs JSONB DEFAULT '{}'::jsonb, -- { core: string, alternative: string }
  action_plan JSONB DEFAULT '[]'::jsonb, -- [string]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for authenticated users
CREATE POLICY "Allow all" ON clinical_notes FOR ALL USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_date ON clinical_notes(date);

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON clinical_notes
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

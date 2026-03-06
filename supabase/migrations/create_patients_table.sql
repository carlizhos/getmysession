-- Migration: Create patients table
-- Description: Table for storing patient information with HIPAA compliance considerations
-- Created: 2026-02-10

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  last_session TIMESTAMPTZ,
  next_session TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- For soft deletes (HIPAA retention)
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);

-- Create index on tags for filtering
CREATE INDEX IF NOT EXISTS idx_patients_tags ON patients USING GIN(tags);

-- Enable Row Level Security (RLS) - REQUIRED for HIPAA
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own patients
-- Note: You'll need to adjust this based on your auth setup
-- This is a basic example - therapist_id should be added to patients table
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create policy: Users can insert their own patients
CREATE POLICY "Users can insert patients" ON patients
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy: Users can update their own patients
CREATE POLICY "Users can update their own patients" ON patients
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional - remove in production)
INSERT INTO patients (name, email, phone, date_of_birth, notes, tags, last_session) VALUES
  ('María López García', 'maria.lopez@example.com', '+1 (555) 123-4567', '1985-03-15', 'Paciente regular con sesiones semanales', ARRAY['Ansiedad', 'Terapia Individual'], '2024-02-05T10:00:00Z'),
  ('Carlos Rodríguez', 'carlos.rodriguez@example.com', '+1 (555) 234-5678', '1990-07-22', 'Primera consulta completada', ARRAY['Depresión', 'Consulta Inicial'], '2024-02-01T14:00:00Z'),
  ('Ana Martínez', 'ana.martinez@example.com', '+1 (555) 345-6789', '1978-11-30', 'Terapia de pareja', ARRAY['Terapia de Pareja', 'Comunicación'], '2024-01-28T16:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (adjust based on your setup)
-- GRANT ALL ON patients TO authenticated;
-- GRANT ALL ON patients TO service_role;

COMMENT ON TABLE patients IS 'Stores patient information with HIPAA compliance considerations';
COMMENT ON COLUMN patients.id IS 'Unique identifier for the patient';
COMMENT ON COLUMN patients.name IS 'Full name of the patient';
COMMENT ON COLUMN patients.email IS 'Contact email address';
COMMENT ON COLUMN patients.phone IS 'Contact phone number';
COMMENT ON COLUMN patients.date_of_birth IS 'Date of birth for age calculation';
COMMENT ON COLUMN patients.notes IS 'Internal notes about the patient (encrypted in production)';
COMMENT ON COLUMN patients.tags IS 'Array of tags for categorization (e.g., therapy types, conditions)';
COMMENT ON COLUMN patients.last_session IS 'Timestamp of the last session';
COMMENT ON COLUMN patients.next_session IS 'Timestamp of the next scheduled session';
COMMENT ON COLUMN patients.deleted_at IS 'Soft delete timestamp for HIPAA retention compliance';

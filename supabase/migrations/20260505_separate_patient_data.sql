-- Migration: Separate fiscal data and notes from patients table
-- Description: Creates patient_fiscal_data and patient_clinical_data to segregate sensitive info (NOM-024)
-- Created: 2026-05-05

BEGIN;

-- 1. Create patient_clinical_data table
CREATE TABLE IF NOT EXISTS patient_clinical_data (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create patient_fiscal_data table
CREATE TABLE IF NOT EXISTS patient_fiscal_data (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rfc TEXT,
  tax_name TEXT,
  tax_zip_code TEXT,
  tax_regime TEXT,
  cfdi_use TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_clinical_data_org_id ON patient_clinical_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_fiscal_data_org_id ON patient_fiscal_data(organization_id);

-- 4. Enable RLS
ALTER TABLE patient_clinical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_fiscal_data ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for patient_clinical_data (Only therapists and admins, assuming logic handles roles, but for now organization matching)
CREATE POLICY "Users can manage clinical data for their organization" ON patient_clinical_data
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 6. RLS Policies for patient_fiscal_data
CREATE POLICY "Users can manage fiscal data for their organization" ON patient_fiscal_data
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 7. Migrate Data from patients to new tables
INSERT INTO patient_clinical_data (patient_id, organization_id, notes)
SELECT id, organization_id, notes FROM patients
WHERE notes IS NOT NULL AND notes != ''
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO patient_fiscal_data (patient_id, organization_id, rfc, tax_name, tax_zip_code, tax_regime, cfdi_use)
SELECT id, organization_id, rfc, tax_name, tax_zip_code, tax_regime, cfdi_use FROM patients
WHERE rfc IS NOT NULL OR tax_name IS NOT NULL OR tax_zip_code IS NOT NULL OR tax_regime IS NOT NULL OR cfdi_use IS NOT NULL
ON CONFLICT (patient_id) DO NOTHING;

-- 8. Drop columns from patients table
ALTER TABLE patients
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS rfc,
  DROP COLUMN IF EXISTS tax_name,
  DROP COLUMN IF EXISTS tax_zip_code,
  DROP COLUMN IF EXISTS tax_regime,
  DROP COLUMN IF EXISTS cfdi_use;

COMMIT;

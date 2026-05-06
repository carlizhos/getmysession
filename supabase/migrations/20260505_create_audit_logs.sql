-- Migration: Create audit_logs table
-- Description: Table for storing immutable audit trails for sensitive operations (e.g. data export)
-- Created: 2026-05-05

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g. 'export_patients_csv'
  resource_type TEXT NOT NULL, -- e.g. 'patients'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_profile_id ON audit_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can only insert audit logs for their own organization
CREATE POLICY "Users can insert audit logs for their organization" ON audit_logs
  FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND profile_id = auth.uid()
  );

-- 2. Users can view audit logs for their organization
CREATE POLICY "Users can view audit logs for their organization" ON audit_logs
  FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- NO UPDATE OR DELETE POLICIES ALLOWED (Immutable log)

COMMENT ON TABLE audit_logs IS 'Stores immutable audit trails for security and compliance (NOM-024).';

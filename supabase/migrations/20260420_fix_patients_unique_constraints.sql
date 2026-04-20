-- Migration: Scoping Patient Identifiers to Organizations
-- Description: Drops global unique constraints and replaces them with organization-scoped partial unique indexes.
-- Fixes: "Duplicate Key" errors when patients exist in other clinics or are soft-deleted.

-- 1. Drop existing global unique constraints if they exist
-- These often prevent cross-tenant registration of the same person.
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_curp_key;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_rfc_key;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_email_key;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_phone_key;

-- 2. Drop any legacy unique indexes that might be present
DROP INDEX IF EXISTS idx_patients_curp_unique;
DROP INDEX IF EXISTS idx_patients_rfc_unique;
DROP INDEX IF EXISTS idx_patients_email_unique;
DROP INDEX IF EXISTS idx_patients_phone_unique;

-- 3. Create new COMPOSITE partial unique indexes
-- These indexes only enforce uniqueness WITHIN the same organization AND for NON-DELETED records.

-- CURP
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_curp_org_active 
ON public.patients (curp, organization_id) 
WHERE (deleted_at IS NULL AND curp IS NOT NULL);

-- RFC
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_rfc_org_active 
ON public.patients (rfc, organization_id) 
WHERE (deleted_at IS NULL AND rfc IS NOT NULL);

-- Email
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_email_org_active 
ON public.patients (email, organization_id) 
WHERE (deleted_at IS NULL AND email IS NOT NULL);

COMMENT ON INDEX idx_patients_curp_org_active IS 'Enforces CURP uniqueness per organization for active patients.';
COMMENT ON INDEX idx_patients_email_org_active IS 'Enforces Email uniqueness per organization for active patients.';

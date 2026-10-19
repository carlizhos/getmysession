-- Migration: Implementación RIPS JSON (Res. 2275/2023) y Facturación Electrónica DIAN (Colombia)
-- Description: Adapta el esquema a la normativa del Ministerio de Salud y DIAN para profesionales independientes de salud mental.
-- Created: 2026-10-19

BEGIN;

-- 1. Ampliar tabla de pacientes (patients) con datos sociodemográficos colombianos
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'CC', -- CC, TI, CE, PA, RC, PPT, CD
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS municipality_code TEXT DEFAULT '11001', -- Código DANE (ej: 11001 Bogotá)
  ADD COLUMN IF NOT EXISTS department_code TEXT DEFAULT '11', -- Código DANE Depto
  ADD COLUMN IF NOT EXISTS residence_area TEXT DEFAULT '01', -- 01: Urbana, 02: Rural
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT '04'; -- 01: Contributivo Cotizante, 02: Beneficiario, 03: Subsidiado, 04: Particular

-- Eliminar restricciones viejas de CURP si existían
DROP INDEX IF EXISTS idx_patients_curp_org_active;
DROP INDEX IF EXISTS idx_patients_curp_unique;

-- Índice único por organización para tipo y número de documento colombiano
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_doc_org_active
ON public.patients (document_type, document_number, organization_id)
WHERE (deleted_at IS NULL AND document_number IS NOT NULL);

COMMENT ON COLUMN public.patients.document_type IS 'Tipo de documento colombiano: CC, TI, CE, PA, RC, PPT, CD.';
COMMENT ON COLUMN public.patients.document_number IS 'Número de identificación del paciente.';
COMMENT ON COLUMN public.patients.municipality_code IS 'Código DANE del municipio de residencia (Divipola 5 dígitos).';
COMMENT ON COLUMN public.patients.residence_area IS 'Zona territorial: 01 Urbana, 02 Rural.';
COMMENT ON COLUMN public.patients.user_type IS 'Tipo de usuario MinSalud: 01 Contributivo Cotizante, 02 Beneficiario, 03 Subsidiado, 04 Particular.';

-- 2. Ampliar perfiles y organizaciones con datos del prestador REPS / DIAN
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reps_code TEXT, -- Código de Habilitación en el REPS (Secretaría de Salud)
  ADD COLUMN IF NOT EXISTS rethus_number TEXT, -- Registro Único Nacional del Talento Humano en Salud
  ADD COLUMN IF NOT EXISTS nit TEXT, -- NIT o Cédula tributaria del psicólogo
  ADD COLUMN IF NOT EXISTS dian_prefix TEXT DEFAULT 'SETP', -- Prefijo autorizado por la DIAN
  ADD COLUMN IF NOT EXISTS dian_resolution TEXT; -- Número de resolución de autorización de facturación DIAN

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS reps_code TEXT,
  ADD COLUMN IF NOT EXISTS nit TEXT;

-- 3. Ampliar catálogo de servicios y citas con códigos CUPS de MinSalud
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS cups_code TEXT DEFAULT '943100', -- Código CUPS (ej: 943100 Psicoterapia individual)
  ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT '01'; -- 01 Intramural (Consultorio), 02 Extramural, 03 Telemedicina

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cups_code TEXT DEFAULT '943100',
  ADD COLUMN IF NOT EXISTS service_modality TEXT DEFAULT '01',
  ADD COLUMN IF NOT EXISTS consultation_purpose TEXT DEFAULT '10', -- 10 Diagnóstico, 14 Tratamiento
  ADD COLUMN IF NOT EXISTS external_cause TEXT DEFAULT '13'; -- 13 Enfermedad general

-- Actualizar moneda por defecto a COP en la tabla de servicios
ALTER TABLE public.services 
  ALTER COLUMN currency SET DEFAULT 'COP';

-- 4. Ampliar tabla de pagos para DIAN FEV Salud y RIPS JSON (MinSalud)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cufe TEXT, -- Código Único de Facturación Electrónica (DIAN)
  ADD COLUMN IF NOT EXISTS cuv TEXT, -- Código Único de Validación (Ministerio de Salud)
  ADD COLUMN IF NOT EXISTS dian_status TEXT DEFAULT 'none', -- none, processing, issued, error
  ADD COLUMN IF NOT EXISTS rips_status TEXT DEFAULT 'none', -- none, generated, validated, rejected
  ADD COLUMN IF NOT EXISTS rips_json JSONB, -- Payload RIPS JSON (Res. 2275)
  ADD COLUMN IF NOT EXISTS dian_xml_url TEXT, -- Factura electrónica UBL 2.1
  ADD COLUMN IF NOT EXISTS dian_error_log TEXT, -- Detalle de inconsistencias DIAN o MinSalud
  ADD COLUMN IF NOT EXISTS dian_invoice_number TEXT; -- Consecutivo fiscal (ej: SETP-101)

CREATE INDEX IF NOT EXISTS idx_payments_cufe ON public.payments (cufe);
CREATE INDEX IF NOT EXISTS idx_payments_cuv ON public.payments (cuv);

COMMIT;

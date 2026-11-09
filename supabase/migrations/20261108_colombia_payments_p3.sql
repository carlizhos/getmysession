-- Migration: Soporte de Métodos de Pago Locales y Pasarelas Colombianas (P3)
-- Description: Configuración para Nequi, Daviplata, Bancolombia, Wompi, Bold y Régimen Fiscal DIAN.
-- Created: 2026-11-08

BEGIN;

-- 1. Añadir configuración de métodos de pago colombianos y régimen fiscal a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS colombia_payment_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT 'no_responsable_iva', -- 'no_responsable_iva' (Art 437 ET), 'responsable_iva'
  ADD COLUMN IF NOT EXISTS dian_technical_key TEXT; -- Clave técnica autorizada por DIAN

COMMENT ON COLUMN public.profiles.colombia_payment_config IS 'Configuración de cobro en Colombia: Nequi, Daviplata, Bancolombia, Wompi y Bold';
COMMENT ON COLUMN public.profiles.tax_regime IS 'Régimen de IVA en Colombia: no_responsable_iva o responsable_iva';
COMMENT ON COLUMN public.profiles.dian_technical_key IS 'Clave técnica expedida por la DIAN para validación previa';

-- 2. Añadir colombia_payment_config a organizations para clínicas o consultorios grupales
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS colombia_payment_config JSONB DEFAULT '{}'::jsonb;

-- 3. Índices de consulta de pagos por método
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments (method);
CREATE INDEX IF NOT EXISTS idx_payments_status_method ON public.payments (status, method);

COMMIT;

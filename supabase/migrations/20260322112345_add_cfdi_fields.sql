-- Migración para añadir soporte Facturapi / CFDI 4.0

-- 1. Ampliar la tabla de pacientes con campos fiscales
ALTER TABLE "public"."patients" 
  ADD COLUMN IF NOT EXISTS "rfc" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_name" TEXT, -- Razón Social
  ADD COLUMN IF NOT EXISTS "tax_zip_code" TEXT, -- Código Postal Fiscal
  ADD COLUMN IF NOT EXISTS "tax_regime" TEXT, -- Régimen Fiscal (ej: 616)
  ADD COLUMN IF NOT EXISTS "cfdi_use" TEXT; -- Uso de CFDI (ej: D01)

-- 2. Ampliar la tabla de pagos para enlazar facturas
ALTER TABLE "public"."payments" 
  ADD COLUMN IF NOT EXISTS "invoice_id" TEXT, -- ID generado por Facturapi
  ADD COLUMN IF NOT EXISTS "invoice_url" TEXT, -- Link para descargar (PDF o ZIP manual)
  ADD COLUMN IF NOT EXISTS "invoice_status" TEXT DEFAULT 'none'; -- none, pending, issued, error

-- Crear un índice en invoice_id para búsquedas más rápidas en webhooks si es necesario
CREATE INDEX IF NOT EXISTS "idx_payments_invoice_id" ON "public"."payments" ("invoice_id");

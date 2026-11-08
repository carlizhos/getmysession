-- Migración: Soporte para Menores de Edad (Ley 1098 de 2006) y Telepsicología (Res. 2654 de 2019)
-- Agrega campos de representante legal / acudiente / tutor a la tabla patients

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_document_type TEXT,
ADD COLUMN IF NOT EXISTS guardian_document_number TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
ADD COLUMN IF NOT EXISTS guardian_relationship TEXT;

COMMENT ON COLUMN patients.guardian_name IS 'Nombre completo del representante legal, acudiente o tutor (Ley 1098 de 2006 de Infancia y Adolescencia)';
COMMENT ON COLUMN patients.guardian_document_type IS 'Tipo de documento del acudiente (CC, CE, PA, PPT)';
COMMENT ON COLUMN patients.guardian_document_number IS 'Número de documento de identificación del acudiente';
COMMENT ON COLUMN patients.guardian_phone IS 'Teléfono de contacto del acudiente';
COMMENT ON COLUMN patients.guardian_relationship IS 'Parentesco con el paciente menor (Padre, Madre, Tutor Legal, etc.)';

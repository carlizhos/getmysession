-- Add WhatsApp Magic Link columns to patients table

-- 1. Añadir la columna para el código de vinculación (único)
ALTER TABLE patients ADD COLUMN link_code VARCHAR(15) UNIQUE;

-- 2. Añadir la columna de estado de vinculación
ALTER TABLE patients ADD COLUMN is_whatsapp_linked BOOLEAN DEFAULT FALSE;

-- 3. Crear función para generar link_code automáticamente si viene nulo
CREATE OR REPLACE FUNCTION generate_patient_link_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code VARCHAR(15);
    code_exists BOOLEAN;
BEGIN
    IF NEW.link_code IS NULL OR NEW.link_code = '' THEN
        LOOP
            -- Genera un código estilo PAC-XXXXX
            new_code := 'PAC-' || upper(substr(md5(random()::text), 1, 5));
            
            -- Verifica que el código sea único
            SELECT EXISTS(SELECT 1 FROM patients WHERE link_code = new_code) INTO code_exists;
            
            IF NOT code_exists THEN
                NEW.link_code := new_code;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Asignar el trigger a la tabla patients
DROP TRIGGER IF EXISTS trigger_generate_patient_link_code ON patients;
CREATE TRIGGER trigger_generate_patient_link_code
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION generate_patient_link_code();

-- 5. Generar códigos para los pacientes existentes que no lo tienen
DO $$
DECLARE
    patient_record RECORD;
    new_code VARCHAR(15);
    code_exists BOOLEAN;
BEGIN
    FOR patient_record IN SELECT id FROM patients WHERE link_code IS NULL LOOP
        LOOP
            new_code := 'PAC-' || upper(substr(md5(random()::text), 1, 5));
            SELECT EXISTS(SELECT 1 FROM patients WHERE link_code = new_code) INTO code_exists;
            IF NOT code_exists THEN
                UPDATE patients SET link_code = new_code WHERE id = patient_record.id;
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

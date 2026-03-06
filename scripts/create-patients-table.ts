import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
    console.log('Por favor configura estas variables de entorno en un archivo .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPatientsTable() {
    console.log('🚀 Creando tabla patients en Supabase...\n');

    const sql = `
    -- Crear tabla patients
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
      deleted_at TIMESTAMPTZ
    );

    -- Crear índices
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
    CREATE INDEX IF NOT EXISTS idx_patients_tags ON patients USING GIN(tags);

    -- Habilitar RLS
    ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

    -- Políticas básicas
    DROP POLICY IF EXISTS "Allow all for authenticated users" ON patients;
    CREATE POLICY "Allow all for authenticated users" ON patients
      FOR ALL
      USING (auth.uid() IS NOT NULL);

    -- Función para actualizar updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger para updated_at
    DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
    CREATE TRIGGER update_patients_updated_at
      BEFORE UPDATE ON patients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    -- Insertar datos de ejemplo
    INSERT INTO patients (name, email, phone, date_of_birth, notes, tags, last_session) VALUES
      ('María López García', 'maria.lopez@example.com', '+1 (555) 123-4567', '1985-03-15', 'Paciente regular con sesiones semanales', ARRAY['Ansiedad', 'Terapia Individual'], '2024-02-05T10:00:00Z'),
      ('Carlos Rodríguez', 'carlos.rodriguez@example.com', '+1 (555) 234-5678', '1990-07-22', 'Primera consulta completada', ARRAY['Depresión', 'Consulta Inicial'], '2024-02-01T14:00:00Z'),
      ('Ana Martínez', 'ana.martinez@example.com', '+1 (555) 345-6789', '1978-11-30', 'Terapia de pareja', ARRAY['Terapia de Pareja', 'Comunicación'], '2024-01-28T16:00:00Z')
    ON CONFLICT (id) DO NOTHING;
  `;

    try {
        // Ejecutar SQL usando la API de Supabase
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            // Si exec_sql no existe, intentar con el método directo
            console.log('⚠️  Intentando método alternativo...\n');

            // Separar y ejecutar cada statement
            const statements = sql.split(';').filter(s => s.trim());

            for (const statement of statements) {
                if (statement.trim()) {
                    const { error: stmtError } = await supabase.from('_sql').select(statement);
                    if (stmtError) {
                        console.error('❌ Error en statement:', stmtError.message);
                    }
                }
            }
        }

        console.log('✅ Tabla patients creada exitosamente!\n');
        console.log('📊 Verificando tabla...\n');

        // Verificar que la tabla existe
        const { data: patients, error: selectError } = await supabase
            .from('patients')
            .select('*')
            .limit(5);

        if (selectError) {
            console.error('❌ Error al verificar tabla:', selectError.message);
            console.log('\n⚠️  La tabla podría no haberse creado correctamente.');
            console.log('Por favor, ejecuta el SQL manualmente en el dashboard de Supabase.');
            process.exit(1);
        }

        console.log(`✅ Tabla verificada! ${patients?.length || 0} pacientes encontrados.\n`);

        if (patients && patients.length > 0) {
            console.log('📋 Pacientes de ejemplo:');
            patients.forEach(p => {
                console.log(`  - ${p.name} (${p.email})`);
            });
        }

        console.log('\n🎉 ¡Todo listo! Ahora puedes usar la aplicación.\n');

    } catch (error: any) {
        console.error('❌ Error al crear tabla:', error.message);
        console.log('\n📝 Por favor, ejecuta el SQL manualmente:');
        console.log('1. Ve a https://app.supabase.com');
        console.log('2. Abre SQL Editor');
        console.log('3. Copia el contenido de: supabase/migrations/create_patients_table.sql');
        console.log('4. Ejecuta la query\n');
        process.exit(1);
    }
}

// Ejecutar
createPatientsTable();

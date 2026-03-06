import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zhnbrftspwzacarpjqxd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no encontrada.');
    console.error('Por favor ejecútalo así:');
    console.error('  Windows (PowerShell): $env:SUPABASE_SERVICE_ROLE_KEY="tu-key"; node scripts/setup_database.js');
    console.error('  Mac/Linux: SUPABASE_SERVICE_ROLE_KEY="tu-key" node scripts/setup_database.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runSqlFile(filePath) {
    try {
        const fullPath = path.resolve(__dirname, '..', filePath);
        console.log(`📖 Leyendo archivo: ${filePath}...`);
        const sql = fs.readFileSync(fullPath, 'utf8');

        console.log(`🚀 Ejecutando SQL...`);

        // Primero intentamos usar pg_net o similar si existe, pero lo más seguro es dividir y vencer
        // Pero Supabase JS no tiene exec_sql por defecto.
        // Usaremos una función RPC si existe, o llamada directa a la API de REST si la tabla existe? No.
        // La única forma de ejecutar DDL arbitrario con supabase-js es si tenemos una función 'exec_sql' 
        // O si usamos la API de Management (que requiere token personal, no service key).

        // ERROR: Service Key permite bypass RLS pero NO ejecutar DDL arbitrario via client.from().

        // Espera, si el cliente tiene Service Key, ¿puede ejecutar SQL?
        // Solo si hay una función RPC expuesta para eso, o vía PostgREST si la tabla existiera.
        // Para crear tablas (DDL), necesitamos conexión directa a Postgres (pg library) O usar la API de Management de Supabase.

        console.log('⚠️ ADVERTENCIA: supabase-js no puede ejecutar DDL (CREATE TABLE) directamente sin una función RPC de ayuda.');
        console.log('Voy a intentar conectarme usando la API REST para invocar una función SQL genérica si existe.');

        // Intento con RPC común 'exec_sql' o 'exec'
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Falló ejecución RPC:', error.message);
            console.log('ℹ️ Para que esto funcione, necesitas crear una función "exec_sql" en tu base de datos primero.');
            console.log('O usar la CLI de Supabase.');
            return false;
        }

        console.log('✅ SQL ejecutado correctamente.');
        return true;

    } catch (err) {
        console.error(`❌ Error inesperado: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log('🛠️  Iniciando configuración de base de datos...\n');

    const files = [
        'supabase/migrations/create_patients_table.sql',
        'supabase/migrations/create_clinical_notes_table.sql'
    ];

    for (const file of files) {
        const success = await runSqlFile(file);
        if (!success) {
            console.log('\n❌ No se pudo completar la configuración automáticamente.');
            process.exit(1);
        }
    }

    console.log('\n🎉 ¡Tablas creadas exitosamente!');
}

main();

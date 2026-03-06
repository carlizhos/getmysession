-- 1. Asegurar que la columna user_id existe
ALTER TABLE session_notes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Actualizar registros existentes sin dueño para asignarlos al usuario que ejecuta este script
UPDATE session_notes 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

-- 3. Habilitar RLS
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON session_notes;
DROP POLICY IF EXISTS "Users can only see their own notes" ON session_notes;

-- 5. Crear nueva política estricta: Solo el dueño puede ver/editar sus notas
CREATE POLICY "Users can only access their own notes"
ON session_notes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Otorgar permisos
GRANT ALL ON session_notes TO authenticated;
GRANT ALL ON session_notes TO service_role;

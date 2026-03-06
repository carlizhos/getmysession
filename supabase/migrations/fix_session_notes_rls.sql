-- Habilitar RLS en session_notes por si no estaba
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Crear política permisiva para usuarios autenticados
-- Permite SELECT, INSERT, UPDATE, DELETE a cualquier usuario autenticado
CREATE POLICY "Enable all access for authenticated users" ON session_notes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Otorgar permisos básicos
GRANT ALL ON session_notes TO authenticated;
GRANT ALL ON session_notes TO service_role;

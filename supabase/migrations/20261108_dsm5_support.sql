-- Migración: Adición de soporte para criterio clínico DSM-5 en notas de sesión
-- Compatible con MinSalud Res. 2275 (CIE-10 para RIPS) y autonomía clínica APA

ALTER TABLE session_notes 
ADD COLUMN IF NOT EXISTS dsm5_code TEXT,
ADD COLUMN IF NOT EXISTS dsm5_description TEXT;

-- Índice para optimizar búsquedas por diagnóstico DSM-5
CREATE INDEX IF NOT EXISTS idx_session_notes_dsm5 
ON session_notes(dsm5_code) 
WHERE dsm5_code IS NOT NULL;

COMMENT ON COLUMN session_notes.dsm5_code IS 'Código diagnóstico DSM-5 de la APA (ej: 300.02, 296.22)';
COMMENT ON COLUMN session_notes.dsm5_description IS 'Denominación clínica oficial del trastorno según el DSM-5';

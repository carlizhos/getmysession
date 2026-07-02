-- Migration: Restrict session_notes to Therapist and Owner roles
-- Description: Overrides previous RLS that allowed any organization member to read session notes
-- Created: 2026-07-02

-- 1. Eliminar la política permisiva anterior
DROP POLICY IF EXISTS "Org members can manage session notes" ON public.session_notes;

-- 2. Crear nueva política estricta
-- Permite acceso solo si el usuario es el creador (auth.uid() = user_id) 
-- O si el usuario es 'owner' de la organización
CREATE POLICY "Strict access for session notes" ON public.session_notes
FOR ALL USING (
    (auth.uid() = user_id) OR
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = public.session_notes.organization_id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    )
);

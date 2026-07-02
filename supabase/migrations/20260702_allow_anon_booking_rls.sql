-- Migration: Allow anonymous users to book appointments
-- Description: Creates an RLS policy so the public Booking Page can insert into appointments
-- Created: 2026-07-02

-- Enable insert for anonymous users (so patients can book via public link)
CREATE POLICY "Anon users can insert appointments" 
ON public.appointments
FOR INSERT 
TO public
WITH CHECK (
    -- Permite la inserción siempre que se asigne a un terapeuta y una organización válidos.
    user_id IS NOT NULL 
    AND organization_id IS NOT NULL
);

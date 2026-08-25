-- ============================================================================
-- MIGRACIÓN 00014: COLUMNA Y PERSISTENCIA DE ESTADO DE CUMPLIMIENTO EN EVENTOS
-- ============================================================================

ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS completion_status text NOT NULL DEFAULT 'pending';

-- Actualizar política UPDATE para permitir modificar completion_status a usuarios autenticados
DROP POLICY IF EXISTS "Events UPDATE" ON public.events;
CREATE POLICY "Events UPDATE" ON public.events FOR UPDATE TO authenticated 
  USING (family_id = (SELECT private.get_auth_family_id()))
  WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

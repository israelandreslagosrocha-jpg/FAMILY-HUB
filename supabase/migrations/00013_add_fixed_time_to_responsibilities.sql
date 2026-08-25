-- ============================================================================
-- MIGRACIÓN 00013: HORARIO FIJO Y CAMPOS EXTENDIDOS EN RESPONSABILIDADES
-- ============================================================================

ALTER TABLE public.responsibilities 
  ADD COLUMN IF NOT EXISTS fixed_time text,
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '🛠️',
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

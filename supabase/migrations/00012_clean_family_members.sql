-- ============================================================================
-- MIGRACIÓN 00012: LIMPIEZA DE MIEMBROS TEST Y REESTRUCTURACIÓN DE LA FAMILIA
-- ============================================================================

-- 1. Eliminar miembros de prueba o duplicados de la tabla family_members
DELETE FROM public.family_members 
WHERE LOWER(name) LIKE '%prueba%' 
   OR LOWER(name) LIKE '%esposa%'
   OR (LOWER(name) = 'vicente' AND role = 'Mamá');

-- 2. Asegurar que solo permanezcan activos los 4 integrantes oficiales del hogar:
-- - Israel (Papá)
-- - Naty (Mamá)
-- - Santi (Hijo)
-- - Vicente (Hijo)

UPDATE public.family_members
SET is_active = false
WHERE name NOT IN ('Israel', 'Naty', 'Santi', 'Vicente');

-- 3. Asegurar nombres y roles correctos
UPDATE public.family_members
SET role = 'Papá' WHERE name = 'Israel';

UPDATE public.family_members
SET role = 'Mamá' WHERE name = 'Naty';

UPDATE public.family_members
SET role = 'Hijo' WHERE name IN ('Santi', 'Vicente');

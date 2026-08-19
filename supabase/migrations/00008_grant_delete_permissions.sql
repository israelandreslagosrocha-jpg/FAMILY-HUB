-- ============================================================================
-- MIGRACIÓN 00008: HABILITAR BORRADO LIMPIO EN TRANSFERS Y FAMILY_MEMBERS
-- ============================================================================

-- 1. OTORGAR PERMISOS Y POLÍTICA DE BORRADO EN TRANSFERS
GRANT DELETE ON public.transfers TO authenticated;

DROP POLICY IF EXISTS "Transfers DELETE" ON public.transfers;
CREATE POLICY "Transfers DELETE" ON public.transfers FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 2. OTORGAR PERMISOS Y POLÍTICA DE BORRADO EN EXPENSES E INCOMES
GRANT DELETE ON public.expenses TO authenticated;

DROP POLICY IF EXISTS "Expenses DELETE" ON public.expenses;
CREATE POLICY "Expenses DELETE" ON public.expenses FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

GRANT DELETE ON public.incomes TO authenticated;

DROP POLICY IF EXISTS "Incomes DELETE" ON public.incomes;
CREATE POLICY "Incomes DELETE" ON public.incomes FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 3. OTORGAR PERMISOS Y POLÍTICA DE BORRADO EN FAMILY_MEMBERS
GRANT DELETE ON public.family_members TO authenticated;

DROP POLICY IF EXISTS "Family Members DELETE" ON public.family_members;
CREATE POLICY "Family Members DELETE" ON public.family_members FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 4. OTORGAR PERMISOS Y POLÍTICA DE BORRADO EN TASK_INSTANCES
GRANT DELETE ON public.task_instances TO authenticated;

DROP POLICY IF EXISTS "Tasks DELETE" ON public.task_instances;
CREATE POLICY "Tasks DELETE" ON public.task_instances FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 5. OTORGAR PERMISOS Y POLÍTICA DE BORRADO EN EVENTS
GRANT DELETE ON public.events TO authenticated;

DROP POLICY IF EXISTS "Events DELETE" ON public.events;
CREATE POLICY "Events DELETE" ON public.events FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

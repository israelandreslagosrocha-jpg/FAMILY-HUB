-- ============================================================================
-- MIGRACIÓN 00009: CORRECCIÓN COMPLETA DE POLÍTICAS RLS DE BORRADO (DELETE)
-- ============================================================================

-- 1. Permisos y Políticas en TRANSFERS
GRANT ALL ON public.transfers TO authenticated;

DROP POLICY IF EXISTS "Transfers DELETE" ON public.transfers;
CREATE POLICY "Transfers DELETE" ON public.transfers FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 2. Permisos y Políticas en EXPENSES
GRANT ALL ON public.expenses TO authenticated;

DROP POLICY IF EXISTS "Expenses DELETE" ON public.expenses;
CREATE POLICY "Expenses DELETE" ON public.expenses FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 3. Permisos y Políticas en INCOMES
GRANT ALL ON public.incomes TO authenticated;

DROP POLICY IF EXISTS "Incomes DELETE" ON public.incomes;
CREATE POLICY "Incomes DELETE" ON public.incomes FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 4. Permisos y Políticas en HISTORY_LOGS
GRANT ALL ON public.history_logs TO authenticated;

DROP POLICY IF EXISTS "History Logs DELETE" ON public.history_logs;
CREATE POLICY "History Logs DELETE" ON public.history_logs FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 5. Permisos y Políticas en FAMILY_MEMBERS
GRANT ALL ON public.family_members TO authenticated;

DROP POLICY IF EXISTS "Family Members DELETE" ON public.family_members;
CREATE POLICY "Family Members DELETE" ON public.family_members FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 6. RPC para vaciado seguro de datos de prueba por el Jefe de Hogar
CREATE OR REPLACE FUNCTION public.wipe_family_test_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  v_family_id := private.get_auth_family_id();

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado o sin familia asignada';
  END IF;

  DELETE FROM public.transfers WHERE family_id = v_family_id;
  DELETE FROM public.expenses WHERE family_id = v_family_id;
  DELETE FROM public.incomes WHERE family_id = v_family_id;
  DELETE FROM public.history_logs WHERE family_id = v_family_id;
  DELETE FROM public.family_members WHERE family_id = v_family_id AND ilike(name, '%Prueba%');
END;
$$;

GRANT EXECUTE ON FUNCTION public.wipe_family_test_data TO authenticated;

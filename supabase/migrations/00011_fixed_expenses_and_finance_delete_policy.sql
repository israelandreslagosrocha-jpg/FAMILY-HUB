-- ============================================================================
-- MIGRACIÓN 00011 (V2.1 IDEMPOTENT): TABLA FIXED_EXPENSES, RLS DELETE & REALTIME
-- ============================================================================

-- 1. CREAR TABLA PUBLIC.FIXED_EXPENSES CON DEFAULT AUTOMÁTICO DE FAMILY_ID
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid DEFAULT private.get_auth_family_id() REFERENCES public.families(id) ON DELETE CASCADE,
    title text NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    category_name text NOT NULL DEFAULT 'Servicios del Hogar',
    due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp with time zone,
    icon text DEFAULT '💡',
    color text DEFAULT '#3b82f6',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- HABILITAR RLS EN FIXED_EXPENSES
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

-- PERMISOS RLS EN FIXED_EXPENSES PARA USUARIOS AUTENTICADOS
DROP POLICY IF EXISTS "FixedExpenses SELECT" ON public.fixed_expenses;
CREATE POLICY "FixedExpenses SELECT" ON public.fixed_expenses FOR SELECT TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "FixedExpenses INSERT" ON public.fixed_expenses;
CREATE POLICY "FixedExpenses INSERT" ON public.fixed_expenses FOR INSERT TO authenticated
WITH CHECK (family_id = (SELECT private.get_auth_family_id()) OR family_id IS NULL);

DROP POLICY IF EXISTS "FixedExpenses UPDATE" ON public.fixed_expenses;
CREATE POLICY "FixedExpenses UPDATE" ON public.fixed_expenses FOR UPDATE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()))
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "FixedExpenses DELETE" ON public.fixed_expenses;
CREATE POLICY "FixedExpenses DELETE" ON public.fixed_expenses FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 2. OTORGAR PERMISOS COMPLETOS (GRANT ALL) A AUTHENTICATED
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.incomes TO authenticated;
GRANT ALL ON public.transfers TO authenticated;
GRANT ALL ON public.budgets TO authenticated;
GRANT ALL ON public.fixed_expenses TO authenticated;

-- 3. POLÍTICAS DELETE RLS PARA EXPENSES, INCOMES, TRANSFERS Y BUDGETS (FIX ERROR HTTP 403 BASURERO)
DROP POLICY IF EXISTS "Expenses DELETE" ON public.expenses;
CREATE POLICY "Expenses DELETE" ON public.expenses FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Incomes DELETE" ON public.incomes;
CREATE POLICY "Incomes DELETE" ON public.incomes FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Transfers DELETE" ON public.transfers;
CREATE POLICY "Transfers DELETE" ON public.transfers FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Budgets DELETE" ON public.budgets;
CREATE POLICY "Budgets DELETE" ON public.budgets FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- POLÍTICAS INSERT RLS
DROP POLICY IF EXISTS "Expenses INSERT" ON public.expenses;
CREATE POLICY "Expenses INSERT" ON public.expenses FOR INSERT TO authenticated
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Incomes INSERT" ON public.incomes;
CREATE POLICY "Incomes INSERT" ON public.incomes FOR INSERT TO authenticated
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Transfers INSERT" ON public.transfers;
CREATE POLICY "Transfers INSERT" ON public.transfers FOR INSERT TO authenticated
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

-- HABILITAR PUBLICACIÓN REALTIME PARA FIXED_EXPENSES DE FORMA IDEMPOTENTE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'fixed_expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_expenses;
  END IF;
END $$;

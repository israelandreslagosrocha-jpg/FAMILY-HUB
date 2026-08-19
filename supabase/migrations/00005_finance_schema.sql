-- ============================================================================
-- MIGRACIÓN 00005: ESQUEMA DE PERSISTENCIA Y AUDITORÍA DE FINANZAS DEL HOGAR
-- ============================================================================

-- 1. TABLA DE TRANSFERENCIAS NEUTRAS ENTRE CUENTAS
CREATE TABLE IF NOT EXISTS public.transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    registered_by_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    source_account text NOT NULL, -- Ej: 'Cuenta Corriente Banco', 'Caja Efectivo'
    destination_account text NOT NULL, -- Ej: 'Caja Efectivo', 'Tarjeta Credito'
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    currency char(3) DEFAULT 'CLP' NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_different_accounts CHECK (source_account <> destination_account)
);

-- HABILITAR RLS EN TRANSFERS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transfers SELECT" ON public.transfers;
CREATE POLICY "Transfers SELECT" ON public.transfers FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Transfers INSERT" ON public.transfers;
CREATE POLICY "Transfers INSERT" ON public.transfers FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

DROP POLICY IF EXISTS "Transfers DELETE" ON public.transfers;
CREATE POLICY "Transfers DELETE" ON public.transfers FOR DELETE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));


-- 2. POLÍTICAS RLS EN EXPENSES, INCOMES Y BUDGETS (DEL ESQUEMA 00001)

-- EXPENSES RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Expenses SELECT" ON public.expenses;
CREATE POLICY "Expenses SELECT" ON public.expenses FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Expenses INSERT" ON public.expenses;
CREATE POLICY "Expenses INSERT" ON public.expenses FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  (belonging_to_member_id IS NULL OR belonging_to_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);

DROP POLICY IF EXISTS "Expenses UPDATE" ON public.expenses;
CREATE POLICY "Expenses UPDATE" ON public.expenses FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()))
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

DROP POLICY IF EXISTS "Expenses DELETE" ON public.expenses;
CREATE POLICY "Expenses DELETE" ON public.expenses FOR DELETE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));


-- INCOMES RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Incomes SELECT" ON public.incomes;
CREATE POLICY "Incomes SELECT" ON public.incomes FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Incomes INSERT" ON public.incomes;
CREATE POLICY "Incomes INSERT" ON public.incomes FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

DROP POLICY IF EXISTS "Incomes DELETE" ON public.incomes;
CREATE POLICY "Incomes DELETE" ON public.incomes FOR DELETE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));


-- BUDGETS RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Budgets SELECT" ON public.budgets;
CREATE POLICY "Budgets SELECT" ON public.budgets FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Budgets INSERT" ON public.budgets;
CREATE POLICY "Budgets INSERT" ON public.budgets FOR INSERT TO authenticated 
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Budgets UPDATE" ON public.budgets;
CREATE POLICY "Budgets UPDATE" ON public.budgets FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()))
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));


-- 3. RPC TRANSACCIONAL PRINCIPAL: REGISTRAR MOVIMIENTO FINANCIERO UNIFICADO
CREATE OR REPLACE FUNCTION public.create_financial_movement(
  p_movement_type text,            -- 'expense' | 'income' | 'transfer'
  p_title text,
  p_amount numeric,
  p_category_id uuid DEFAULT NULL,
  p_registered_by_member_id uuid DEFAULT NULL,
  p_belonging_to_member_id uuid DEFAULT NULL,
  p_is_family_scope boolean DEFAULT true,
  p_date date DEFAULT CURRENT_DATE,
  p_source_account text DEFAULT NULL,
  p_destination_account text DEFAULT NULL,
  p_receipt_image_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid := private.get_auth_family_id();
  v_actor_profile_id uuid := auth.uid();
  v_effective_registered_by uuid := p_registered_by_member_id;
  v_effective_belonging_to uuid := p_belonging_to_member_id;
  v_new_id uuid;
BEGIN
  -- 1. Validar autenticación de familia
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no pertenece a una familia activa';
  END IF;

  -- 2. Validar monto estrictamente positivo
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto del movimiento debe ser estrictamente mayor a 0';
  END IF;

  -- 3. Determinar o validar registered_by_member_id
  IF v_effective_registered_by IS NULL THEN
    SELECT id INTO v_effective_registered_by
    FROM public.family_members
    WHERE family_id = v_family_id AND profile_id = v_actor_profile_id AND is_active = true
    LIMIT 1;
  END IF;

  IF v_effective_registered_by IS NULL OR NOT private.validate_family_member(v_family_id, v_effective_registered_by) THEN
    RAISE EXCEPTION 'El miembro registrador no pertenece activamente a su familia';
  END IF;

  -- 4. Validar belonging_to_member_id si es un movimiento personal
  IF NOT p_is_family_scope THEN
    IF v_effective_belonging_to IS NULL THEN
      v_effective_belonging_to := v_effective_registered_by;
    END IF;
    IF NOT private.validate_family_member(v_family_id, v_effective_belonging_to) THEN
      RAISE EXCEPTION 'El miembro destinatario del gasto personal no pertenece activamente a su familia';
    END IF;
  ELSE
    -- Coherencia: Si es gasto familiar, belonging_to debe ser NULL
    v_effective_belonging_to := NULL;
  END IF;

  -- 5. Procesar según tipo de movimiento
  IF p_movement_type = 'expense' THEN
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'Debe especificar una categoría para el gasto';
    END IF;

    INSERT INTO public.expenses (
      family_id, category_id, registered_by_member_id, belonging_to_member_id,
      title, amount, currency, date, is_family_expense, receipt_image_url
    ) VALUES (
      v_family_id, p_category_id, v_effective_registered_by, v_effective_belonging_to,
      p_title, p_amount, 'CLP', coalesce(p_date, CURRENT_DATE), p_is_family_scope, p_receipt_image_url
    ) RETURNING id INTO v_new_id;

    -- Auditoría PostgreSQL inalterable
    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_family_id, v_actor_profile_id, v_effective_registered_by, 'expense_registered', 'expense', v_new_id,
      jsonb_build_object('title', p_title, 'amount', p_amount, 'scope', CASE WHEN p_is_family_scope THEN 'family' ELSE 'personal' END)
    );

  ELSIF p_movement_type = 'income' THEN
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'Debe especificar una categoría para el ingreso';
    END IF;

    INSERT INTO public.incomes (
      family_id, category_id, registered_by_member_id, belonging_to_member_id,
      title, amount, currency, date, is_family_income
    ) VALUES (
      v_family_id, p_category_id, v_effective_registered_by, v_effective_belonging_to,
      p_title, p_amount, 'CLP', coalesce(p_date, CURRENT_DATE), p_is_family_scope
    ) RETURNING id INTO v_new_id;

    -- Auditoría PostgreSQL inalterable
    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_family_id, v_actor_profile_id, v_effective_registered_by, 'income_registered', 'income', v_new_id,
      jsonb_build_object('title', p_title, 'amount', p_amount)
    );

  ELSIF p_movement_type = 'transfer' THEN
    IF coalesce(p_source_account, '') = '' OR coalesce(p_destination_account, '') = '' THEN
      RAISE EXCEPTION 'Debe especificar la cuenta de origen y la cuenta de destino para la transferencia';
    END IF;

    IF p_source_account = p_destination_account THEN
      RAISE EXCEPTION 'La cuenta de origen debe ser distinta a la cuenta de destino';
    END IF;

    INSERT INTO public.transfers (
      family_id, registered_by_member_id, source_account, destination_account,
      amount, currency, date, description
    ) VALUES (
      v_family_id, v_effective_registered_by, p_source_account, p_destination_account,
      p_amount, 'CLP', coalesce(p_date, CURRENT_DATE), p_title
    ) RETURNING id INTO v_new_id;

    -- Auditoría PostgreSQL inalterable
    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_family_id, v_actor_profile_id, v_effective_registered_by, 'transfer_registered', 'transfer', v_new_id,
      jsonb_build_object('source', p_source_account, 'destination', p_destination_account, 'amount', p_amount)
    );

  ELSE
    RAISE EXCEPTION 'Tipo de movimiento inválido: %', p_movement_type;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'id', v_new_id,
    'movement_type', p_movement_type,
    'amount', p_amount
  );
END;
$$;

-- PERMISOS DE EJECUCIÓN RPC
REVOKE EXECUTE ON FUNCTION public.create_financial_movement FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_financial_movement TO authenticated;

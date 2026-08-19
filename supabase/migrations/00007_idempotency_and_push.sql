-- ============================================================================
-- MIGRACIÓN 00007: IDEMPOTENCIA FINANCIERA EN SERVIDOR Y WEBPUSH SUBSCRIPTIONS
-- ============================================================================

-- 1. ADICIÓN DE COLUMNA IDEMPOTENCY_KEY Y RESTRICCIÓN DE UNICIDAD POR FAMILIA
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS idempotency_key text;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_expenses_family_idempotency') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT unique_expenses_family_idempotency UNIQUE (family_id, idempotency_key);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_incomes_family_idempotency') THEN
    ALTER TABLE public.incomes ADD CONSTRAINT unique_incomes_family_idempotency UNIQUE (family_id, idempotency_key);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_transfers_family_idempotency') THEN
    ALTER TABLE public.transfers ADD CONSTRAINT unique_transfers_family_idempotency UNIQUE (family_id, idempotency_key);
  END IF;
END $$;

-- 2. TABLA PUSH_SUBSCRIPTIONS CON RLS ESTRICTO POR USER_ID Y FAMILY_ID
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    subscription_json jsonb NOT NULL,
    device_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_device_push UNIQUE (user_id, device_name)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push Subscriptions ALL" ON public.push_subscriptions;
CREATE POLICY "Push Subscriptions ALL" ON public.push_subscriptions FOR ALL TO authenticated
USING (
  user_id = auth.uid() AND 
  family_id = (SELECT private.get_auth_family_id())
)
WITH CHECK (
  user_id = auth.uid() AND 
  family_id = (SELECT private.get_auth_family_id())
);

REVOKE INSERT, UPDATE, DELETE ON public.push_subscriptions FROM PUBLIC;
GRANT ALL ON public.push_subscriptions TO authenticated;

-- 3. ACTUALIZACIÓN QUIRÚRGICA DE LA RPC CREATE_FINANCIAL_MOVEMENT CON SOPORTE P_IDEMPOTENCY_KEY
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
  p_receipt_image_url text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL -- Parámetro de Idempotencia de Servidor
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
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- 1. Validar autenticación de familia
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no pertenece a una familia activa';
  END IF;

  -- 2. RECONCILIACIÓN SERVIDOR: Verificar si la idempotency_key ya fue procesada previamente
  IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) <> '' THEN
    IF p_movement_type = 'expense' THEN
      SELECT id INTO v_existing_id FROM public.expenses WHERE family_id = v_family_id AND idempotency_key = p_idempotency_key LIMIT 1;
    ELSIF p_movement_type = 'income' THEN
      SELECT id INTO v_existing_id FROM public.incomes WHERE family_id = v_family_id AND idempotency_key = p_idempotency_key LIMIT 1;
    ELSIF p_movement_type = 'transfer' THEN
      SELECT id INTO v_existing_id FROM public.transfers WHERE family_id = v_family_id AND idempotency_key = p_idempotency_key LIMIT 1;
    END IF;

    -- Si la transacción ya existe, se devuelve el resultado existente atómicamente sin duplicar
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'status', 'reconciled',
        'id', v_existing_id,
        'movement_type', p_movement_type,
        'amount', p_amount,
        'is_reconciled', true
      );
    END IF;
  END IF;

  -- 3. Validar monto estrictamente positivo
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto del movimiento debe ser estrictamente mayor a 0';
  END IF;

  -- 4. Determinar o validar registered_by_member_id
  IF v_effective_registered_by IS NULL THEN
    SELECT id INTO v_effective_registered_by
    FROM public.family_members
    WHERE family_id = v_family_id AND profile_id = v_actor_profile_id AND is_active = true
    LIMIT 1;
  END IF;

  IF v_effective_registered_by IS NULL OR NOT private.validate_family_member(v_family_id, v_effective_registered_by) THEN
    RAISE EXCEPTION 'El miembro registrador no pertenece activamente a su familia';
  END IF;

  -- 5. Validar belonging_to_member_id si es un movimiento personal
  IF NOT p_is_family_scope THEN
    IF v_effective_belonging_to IS NULL THEN
      v_effective_belonging_to := v_effective_registered_by;
    END IF;
    IF NOT private.validate_family_member(v_family_id, v_effective_belonging_to) THEN
      RAISE EXCEPTION 'El miembro destinatario del gasto personal no pertenece activamente a su familia';
    END IF;
  ELSE
    v_effective_belonging_to := NULL;
  END IF;

  -- 6. VALIDACIÓN CROSS-FAMILY DE CATEGORÍA
  IF p_movement_type IN ('expense', 'income') THEN
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'Debe especificar una categoría para el movimiento financiero';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = p_category_id AND (family_id = v_family_id OR family_id IS NULL)
    ) THEN
      RAISE EXCEPTION 'La categoría especificada no pertenece a su familia o no existe';
    END IF;
  END IF;

  -- 7. Procesar según tipo de movimiento (con manejo de conflicto e idempotencia)
  IF p_movement_type = 'expense' THEN
    INSERT INTO public.expenses (
      family_id, category_id, registered_by_member_id, belonging_to_member_id,
      title, amount, currency, date, is_family_expense, receipt_image_url, idempotency_key
    ) VALUES (
      v_family_id, p_category_id, v_effective_registered_by, v_effective_belonging_to,
      p_title, p_amount, 'CLP', coalesce(p_date, CURRENT_DATE), p_is_family_scope, p_receipt_image_url, p_idempotency_key
    )
    ON CONFLICT (family_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_new_id;

    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_family_id, v_actor_profile_id, v_effective_registered_by, 'expense_registered', 'expense', v_new_id,
      jsonb_build_object('title', p_title, 'amount', p_amount, 'scope', CASE WHEN p_is_family_scope THEN 'family' ELSE 'personal' END)
    );

  ELSIF p_movement_type = 'income' THEN
    INSERT INTO public.incomes (
      family_id, category_id, registered_by_member_id, belonging_to_member_id,
      title, amount, currency, date, is_family_income, idempotency_key
    ) VALUES (
      v_family_id, p_category_id, v_effective_registered_by, v_effective_belonging_to,
      p_title, p_amount, 'CLP', coalesce(p_date, CURRENT_DATE), p_is_family_scope, p_idempotency_key
    )
    ON CONFLICT (family_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_new_id;

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
      amount, currency, date, description, idempotency_key
    ) VALUES (
      v_family_id, v_effective_registered_by, p_source_account, p_destination_account,
      p_amount, 'CLP', coalesce(p_date, CURRENT_DATE), p_title, p_idempotency_key
    )
    ON CONFLICT (family_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_new_id;

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

-- REVOKE / GRANT CON FIRMA DE PARÁMETROS ACTUALIZADA (12 PARÁMETROS)
REVOKE EXECUTE ON FUNCTION public.create_financial_movement(text, text, numeric, uuid, uuid, uuid, boolean, date, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_financial_movement(text, text, numeric, uuid, uuid, uuid, boolean, date, text, text, text, text) TO authenticated;

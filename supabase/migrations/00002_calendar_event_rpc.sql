-- ============================================================================
-- MIGRACIÓN 00002: HARDENING DE RECURRENCIAS Y RPC TRANSACCIONAL DE EVENTOS
-- ============================================================================

-- 1. RESTRICCIÓN ESTRUCTURAL DE UNICIDAD PARA REGLAS DE RECURRENCIA EXCLUSIVAS
ALTER TABLE public.events 
  ADD CONSTRAINT unique_event_recurrence_rule UNIQUE (recurrence_rule_id);

-- 2. TRIGGER PRIVADO PARA LIMPIEZA AUTOMÁTICA DE REGLAS DE RECURRENCIA HUÉRFANAS
CREATE OR REPLACE FUNCTION private.cleanup_event_recurrence_rule_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.recurrence_rule_id IS NOT NULL THEN
    DELETE FROM public.recurrence_rules WHERE id = OLD.recurrence_rule_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_event_recurrence
  AFTER DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION private.cleanup_event_recurrence_rule_fn();

-- 3. FUNCIÓN RPC TRANSACCIONAL HARDENED PARA CREACIÓN DE EVENTOS FAMILIARES
CREATE OR REPLACE FUNCTION public.create_family_event(
  p_title text,
  p_description text,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_is_all_day boolean,
  p_is_family_event boolean,
  p_category_id uuid,
  p_member_ids uuid[],
  p_recurrence_frequency recurrence_frequency_enum DEFAULT NULL,
  p_recurrence_days_of_week integer[] DEFAULT NULL,
  p_recurrence_day_of_month integer DEFAULT NULL,
  p_recurrence_monthly_pattern monthly_pattern_enum DEFAULT NULL,
  p_recurrence_end_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid := private.get_auth_family_id();
  v_recurrence_id uuid := NULL;
  v_event_id uuid;
  v_member_id uuid;
  v_clean_member_ids uuid[];
BEGIN
  -- 1. Validación de Autenticación y Familia Activa
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no pertenece a una familia activa';
  END IF;

  -- 2. Validación de Título Obligatorio
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'El título del evento es obligatorio';
  END IF;

  -- 3. Validación de Categoría (Debe pertenecer a la misma familia)
  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.categories 
      WHERE id = p_category_id AND family_id = v_family_id
    ) THEN
      RAISE EXCEPTION 'La categoría especificada no pertenece a su familia';
    END IF;
  END IF;

  -- 4. Deduplicación y Validación de Participantes
  IF p_member_ids IS NULL OR cardinality(p_member_ids) = 0 THEN
    RAISE EXCEPTION 'Debe especificar al menos un participante para el evento';
  END IF;

  -- Deduplicación explícita mediante ARRAY(SELECT DISTINCT unnest(...))
  SELECT ARRAY(SELECT DISTINCT unnest(p_member_ids)) INTO v_clean_member_ids;

  -- Verificar que TODOS los participantes pertenezcan a la misma familia y estén activos
  IF EXISTS (
    SELECT 1 FROM unnest(v_clean_member_ids) mid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.family_members 
      WHERE id = mid AND family_id = v_family_id AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Uno o más participantes no pertenecen activamente a su familia';
  END IF;

  -- 5. Validación Estricta de Coherencia de Parámetros de Recurrencia
  IF p_recurrence_frequency IS NULL THEN
    IF p_recurrence_days_of_week IS NOT NULL OR 
       p_recurrence_day_of_month IS NOT NULL OR 
       p_recurrence_monthly_pattern IS NOT NULL OR 
       p_recurrence_end_date IS NOT NULL THEN
      RAISE EXCEPTION 'No se permiten parámetros de recurrencia si la frecuencia es nula';
    END IF;
  ELSE
    -- Validaciones de Recurrencia Activa
    IF p_recurrence_end_date IS NOT NULL AND p_recurrence_end_date < p_start_time::date THEN
      RAISE EXCEPTION 'La fecha de fin de la recurrencia debe ser mayor o igual a la fecha de inicio';
    END IF;

    IF p_recurrence_day_of_month IS NOT NULL AND (p_recurrence_day_of_month < 1 OR p_recurrence_day_of_month > 31) THEN
      RAISE EXCEPTION 'El día del mes para la recurrencia debe estar entre 1 y 31';
    END IF;

    IF p_recurrence_days_of_week IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(p_recurrence_days_of_week) d WHERE d < 1 OR d > 7
    ) THEN
      RAISE EXCEPTION 'Los días de la semana deben estar entre 1 (Lunes) y 7 (Domingo)';
    END IF;

    IF p_recurrence_frequency = 'weekly' AND (p_recurrence_days_of_week IS NULL OR cardinality(p_recurrence_days_of_week) = 0) THEN
      RAISE EXCEPTION 'La frecuencia semanal requiere especificar al menos un día de la semana';
    END IF;

    -- Inserción de la Regla de Recurrencia Exclusiva
    INSERT INTO public.recurrence_rules (
      family_id, frequency, days_of_week, day_of_month, 
      monthly_pattern, start_date, end_date
    ) VALUES (
      v_family_id, p_recurrence_frequency, p_recurrence_days_of_week, 
      p_recurrence_day_of_month, p_recurrence_monthly_pattern, 
      p_start_time::date, p_recurrence_end_date
    ) RETURNING id INTO v_recurrence_id;
  END IF;

  -- 6. Inserción del Evento Maestro
  INSERT INTO public.events (
    family_id, category_id, recurrence_rule_id, title, description,
    start_time, end_time, is_all_day, is_family_event
  ) VALUES (
    v_family_id, p_category_id, v_recurrence_id, trim(p_title), p_description,
    p_start_time, p_end_time, p_is_all_day, p_is_family_event
  ) RETURNING id INTO v_event_id;

  -- 7. Inserción Masiva Deduplicada de Participantes
  FOREACH v_member_id IN ARRAY v_clean_member_ids LOOP
    INSERT INTO public.event_members (event_id, member_id)
    VALUES (v_event_id, v_member_id);
  END LOOP;

  RETURN v_event_id;
END;
$$;

-- 4. RESTRICCIÓN ESTRICTA DE PERMISOS EXECUTE
REVOKE EXECUTE ON FUNCTION public.create_family_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family_event TO authenticated;

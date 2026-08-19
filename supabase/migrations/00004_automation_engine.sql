-- ============================================================================
-- MIGRACIÓN 00004 (V2.2 HARDENED): MOTOR DE AUTOMATIZACIONES DE FAMILY-HUB
-- ============================================================================

-- 1. TIPOS ENUMERADOS DEL MOTOR DE AUTOMATIZACIÓN (EN ESQUEMA PUBLIC)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trigger_type_enum') THEN
    CREATE TYPE public.trigger_type_enum AS ENUM ('data_event', 'scheduled_time');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_kind_enum') THEN
    CREATE TYPE public.action_kind_enum AS ENUM ('CREATE_TASK', 'ROTATE_MEMBER', 'SEND_NOTIFICATION', 'REASSIGN_TASK', 'SKIP_TASK');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status_enum') THEN
    CREATE TYPE public.execution_status_enum AS ENUM ('running', 'success', 'failed', 'skipped_idempotent');
  END IF;
END $$;

-- 2. TABLA MAESTRA DE DEFINICIÓN DE REGLAS DE AUTOMATIZACIÓN
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    created_by_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    trigger_type public.trigger_type_enum NOT NULL,
    trigger_event text NOT NULL, -- ej: 'task.completed', 'expense.created', 'cron.weekly_sunday_1900'
    condition_config jsonb DEFAULT '{}'::jsonb,
    action_type public.action_kind_enum NOT NULL,
    action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- HABILITAR RLS EN AUTOMATION_RULES
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation Rules SELECT" ON public.automation_rules;
CREATE POLICY "Automation Rules SELECT" ON public.automation_rules FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));

DROP POLICY IF EXISTS "Automation Rules INSERT" ON public.automation_rules;
CREATE POLICY "Automation Rules INSERT" ON public.automation_rules FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (created_by_member_id IS NULL OR created_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);

DROP POLICY IF EXISTS "Automation Rules UPDATE" ON public.automation_rules;
CREATE POLICY "Automation Rules UPDATE" ON public.automation_rules FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (created_by_member_id IS NULL OR created_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);

DROP POLICY IF EXISTS "Automation Rules DELETE" ON public.automation_rules;
CREATE POLICY "Automation Rules DELETE" ON public.automation_rules FOR DELETE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));


-- 3. TABLA DE BITÁCORA DE EJECUCIONES E IDEMPOTENCIA
CREATE TABLE IF NOT EXISTS public.automation_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    deduplication_key text UNIQUE NOT NULL, -- md5(rule_id || ':' || trigger_event_id || ':' || entity_id || ':' || action)
    target_entity_type text NOT NULL,
    target_entity_id uuid,
    status public.execution_status_enum NOT NULL DEFAULT 'running',
    error_message text,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);

-- HABILITAR RLS EN AUTOMATION_EXECUTIONS
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation Executions SELECT" ON public.automation_executions;
CREATE POLICY "Automation Executions SELECT" ON public.automation_executions FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));


-- 4. FUNCIONES HELPER PRIVADAS DE VALIDACIÓN Y NAVEGACIÓN DE MIEMBROS

-- 4.1 Validar que un member_id pertenezca activamente a la misma family_id
CREATE OR REPLACE FUNCTION private.validate_family_member(p_family_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_member_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE id = p_member_id AND family_id = p_family_id AND is_active = true
  );
END;
$$;

-- 4.2 Obtener deterministamente el siguiente miembro activo en rotación circular
CREATE OR REPLACE FUNCTION private.get_next_rotated_member(p_family_id uuid, p_current_member_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_members uuid[];
  v_idx integer;
  v_next_idx integer;
BEGIN
  SELECT array_agg(id ORDER BY created_at ASC) INTO v_members
  FROM public.family_members
  WHERE family_id = p_family_id AND is_active = true;

  IF v_members IS NULL OR array_length(v_members, 1) = 0 THEN
    RETURN NULL;
  END IF;

  IF p_current_member_id IS NULL THEN
    RETURN v_members[1];
  END IF;

  v_idx := array_position(v_members, p_current_member_id);
  IF v_idx IS NULL OR v_idx >= array_length(v_members, 1) THEN
    v_next_idx := 1;
  ELSE
    v_next_idx := v_idx + 1;
  END IF;

  RETURN v_members[v_next_idx];
END;
$$;

-- 4.3 Evaluador Real de Condiciones Booleanas con Catálogo Estricto Cerrado
CREATE OR REPLACE FUNCTION private.evaluate_automation_condition(
  p_condition_config jsonb,
  p_event_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Si no hay condiciones definidas, la regla aplica automáticamente
  IF p_condition_config IS NULL OR p_condition_config = '{}'::jsonb THEN
    RETURN true;
  END IF;

  -- 1. Filtro por Categoría
  IF p_condition_config ? 'category_id' AND p_condition_config->>'category_id' IS NOT NULL THEN
    IF p_event_payload->>'category_id' IS DISTINCT FROM (p_condition_config->>'category_id') THEN
      RETURN false;
    END IF;
  END IF;

  -- 2. Filtro por Encargado Asignado
  IF p_condition_config ? 'assigned_member_id' AND p_condition_config->>'assigned_member_id' IS NOT NULL THEN
    IF p_event_payload->>'assigned_member_id' IS DISTINCT FROM (p_condition_config->>'assigned_member_id') THEN
      RETURN false;
    END IF;
  END IF;

  -- 3. Filtro por Prioridad
  IF p_condition_config ? 'priority' AND p_condition_config->>'priority' IS NOT NULL THEN
    IF p_event_payload->>'priority' IS DISTINCT FROM (p_condition_config->>'priority') THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;


-- 5. FUNCIÓN PRINCIPAL DE EJECUCIÓN DE UNA REGLA INDIVIDUAL (HARDENED V2.2)
CREATE OR REPLACE FUNCTION private.execute_single_automation_rule(
  p_rule_id uuid,
  p_trigger_event_id text,
  p_target_entity_type text,
  p_target_entity_id uuid,
  p_event_payload jsonb DEFAULT '{}'::jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rule public.automation_rules%ROWTYPE;
  v_dedup_key text;
  v_existing_id uuid;
  v_existing_status public.execution_status_enum;
  v_execution_id uuid;
  v_assigned_target_id uuid;
  v_next_member_id uuid;
  v_current_assigned_id uuid;
  v_new_task_title text;
  v_actor_profile_id uuid := auth.uid();
  v_actor_member_id uuid;
  v_row_count integer;
BEGIN
  -- 1. Obtener datos de la regla y validar activa
  SELECT * INTO v_rule
  FROM public.automation_rules
  WHERE id = p_rule_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN 'rule_not_found_or_inactive';
  END IF;

  -- 2. EVALUACIÓN EXPLÍCITA DE CONDICIONES (condition_config)
  IF NOT private.evaluate_automation_condition(v_rule.condition_config, p_event_payload) THEN
    RETURN 'condition_not_met';
  END IF;

  -- 3. VALIDACIÓN CROSS-FAMILY DE ENTIDAD DESTINO (si aplica)
  IF p_target_entity_id IS NOT NULL AND p_target_entity_type = 'task' THEN
    SELECT assigned_member_id INTO v_current_assigned_id
    FROM public.task_instances
    WHERE id = p_target_entity_id AND family_id = v_rule.family_id;

    IF NOT FOUND THEN
      RETURN 'target_entity_cross_family_mismatch';
    END IF;
  END IF;

  -- 4. Construcción determinista de la Clave Hash de Idempotencia por Evento Concreto
  v_dedup_key := md5(
    v_rule.id::text || ':' || 
    coalesce(p_trigger_event_id, 'no_event') || ':' || 
    coalesce(p_target_entity_id::text, 'no_entity') || ':' || 
    v_rule.action_type::text
  );

  -- 5. MANEJO ATÓMICO CONCURRENTE DE CONFLICTO, IDEMPOTENCIA Y RETRY CONTROLADO
  INSERT INTO public.automation_executions (
    family_id, rule_id, deduplication_key, target_entity_type, target_entity_id, status
  ) VALUES (
    v_rule.family_id, v_rule.id, v_dedup_key, p_target_entity_type, p_target_entity_id, 'running'
  ) ON CONFLICT (deduplication_key) DO NOTHING
  RETURNING id INTO v_execution_id;

  -- Si v_execution_id es NULL, la deduplication_key ya existía
  IF v_execution_id IS NULL THEN
    SELECT id, status INTO v_existing_id, v_existing_status
    FROM public.automation_executions
    WHERE deduplication_key = v_dedup_key;

    IF v_existing_status IN ('success', 'running', 'skipped_idempotent') THEN
      RETURN 'skipped_idempotent';
    ELSIF v_existing_status = 'failed' THEN
      -- Reintento atómico controlado con UPDATE condicional para evitar carreras concurrentes
      UPDATE public.automation_executions
      SET status = 'running', error_message = NULL, executed_at = now()
      WHERE id = v_existing_id AND status = 'failed'
      RETURNING id INTO v_execution_id;

      IF v_execution_id IS NULL THEN
        RETURN 'skipped_idempotent';
      END IF;
    END IF;
  END IF;

  -- 6. Activar variable local de transacción para prohibir cascadas re-entrantes (Stack Depth = 1)
  PERFORM set_config('family_hub.automation_depth', '1', true);

  -- Obtener member_id del actor autenticado si existe
  SELECT id INTO v_actor_member_id
  FROM public.family_members
  WHERE family_id = v_rule.family_id AND profile_id = v_actor_profile_id AND is_active = true
  LIMIT 1;

  -- 7. EJECUCIÓN DEL CATÁLOGO CERRADO DE ACCIONES CON VERIFICACIÓN RIGUROSA DE ROW_COUNT
  BEGIN
    IF v_rule.action_type = 'CREATE_TASK' THEN
      v_new_task_title := coalesce(v_rule.action_config->>'task_title', 'Tarea Automática Derivada');
      v_assigned_target_id := (v_rule.action_config->>'assigned_member_id')::uuid;

      -- Validación Estricta: Si el encargado configurado es inválido o inactivo, FALLAR sin sustituciones silenciosas
      IF v_assigned_target_id IS NOT NULL AND NOT private.validate_family_member(v_rule.family_id, v_assigned_target_id) THEN
        RAISE EXCEPTION 'El miembro asignado configurado no pertenece activamente al hogar';
      END IF;

      IF v_assigned_target_id IS NULL THEN
        v_assigned_target_id := coalesce(v_actor_member_id, v_rule.created_by_member_id);
      END IF;

      INSERT INTO public.task_instances (
        family_id, created_by_member_id, assigned_member_id, title,
        description, priority, status, due_date
      ) VALUES (
        v_rule.family_id,
        coalesce(v_actor_member_id, v_rule.created_by_member_id),
        v_assigned_target_id,
        v_new_task_title,
        'Creada automáticamente por la regla: ' || v_rule.name,
        coalesce((v_rule.action_config->>'priority')::public.priority_enum, 'media'),
        'pending',
        now() + interval '1 day'
      );

    ELSIF v_rule.action_type = 'ROTATE_MEMBER' THEN
      IF p_target_entity_id IS NOT NULL THEN
        v_next_member_id := private.get_next_rotated_member(v_rule.family_id, v_current_assigned_id);

        IF v_next_member_id IS NULL THEN
          RAISE EXCEPTION 'No hay miembros activos suficientes para realizar la rotación';
        END IF;

        UPDATE public.task_instances
        SET assigned_member_id = v_next_member_id
        WHERE id = p_target_entity_id AND family_id = v_rule.family_id;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count = 0 THEN
          RAISE EXCEPTION 'No se encontró la tarea destino o no pertenece a su familia';
        END IF;
      END IF;

    ELSIF v_rule.action_type = 'SEND_NOTIFICATION' THEN
      -- Materialización interna en history_logs (Sin HTTP externo síncrono en PostgreSQL)
      INSERT INTO public.history_logs (
        family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
      ) VALUES (
        v_rule.family_id, v_actor_profile_id, v_actor_member_id, 'notification_created', 'automation', v_rule.id,
        jsonb_build_object('rule_name', v_rule.name, 'message', coalesce(v_rule.action_config->>'message', 'Notificación automática generada'))
      );

    ELSIF v_rule.action_type = 'REASSIGN_TASK' THEN
      v_assigned_target_id := (v_rule.action_config->>'new_assigned_member_id')::uuid;

      IF NOT private.validate_family_member(v_rule.family_id, v_assigned_target_id) THEN
        RAISE EXCEPTION 'El nuevo miembro configurado para reasignación no es válido o está inactivo';
      END IF;

      IF p_target_entity_id IS NOT NULL THEN
        UPDATE public.task_instances
        SET assigned_member_id = v_assigned_target_id
        WHERE id = p_target_entity_id AND family_id = v_rule.family_id;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count = 0 THEN
          RAISE EXCEPTION 'No se encontró la tarea destino para reasignar';
        END IF;
      END IF;

    ELSIF v_rule.action_type = 'SKIP_TASK' THEN
      IF p_target_entity_id IS NOT NULL THEN
        UPDATE public.task_instances
        SET status = 'skipped'
        WHERE id = p_target_entity_id AND family_id = v_rule.family_id;

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        IF v_row_count = 0 THEN
          RAISE EXCEPTION 'No se encontró la tarea destino para omitir';
        END IF;
      END IF;
    END IF;

    -- Actualizar Estado de Bitácora a 'success'
    UPDATE public.automation_executions
    SET status = 'success'
    WHERE id = v_execution_id;

    -- Registrar Auditoría General de la Automatización
    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_rule.family_id, v_actor_profile_id, v_actor_member_id, 'automation_triggered', 'automation', v_rule.id,
      jsonb_build_object('rule_name', v_rule.name, 'action_type', v_rule.action_type)
    );

    RETURN 'success';

  EXCEPTION WHEN OTHERS THEN
    -- Resiliencia: Registrar fallo en la bitácora sin tumbar la transacción principal del usuario
    UPDATE public.automation_executions
    SET status = 'failed', error_message = SQLERRM
    WHERE id = v_execution_id;

    RETURN 'failed';
  END;
END;
$$;


-- 6. DISPARADOR DE BD CON MATCHING EXPLÍCITO DE TRIGGER_EVENT
CREATE OR REPLACE FUNCTION private.trg_process_task_automations_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rule_row public.automation_rules%ROWTYPE;
  v_payload jsonb;
BEGIN
  -- Anti-Cascada: Si la transacción actual fue iniciada por el motor de automatización, RETORNAR INMEDIATAMENTE
  IF current_setting('family_hub.automation_depth', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Procesar solo si la tarea pasó a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    v_payload := jsonb_build_object(
      'category_id', NEW.category_id,
      'assigned_member_id', NEW.assigned_member_id,
      'priority', NEW.priority
    );

    FOR v_rule_row IN
      SELECT * FROM public.automation_rules
      WHERE family_id = NEW.family_id 
        AND trigger_type = 'data_event' 
        AND trigger_event = 'task.completed' -- COINCIDENCIA DE EVENTO EXPLÍCITA
        AND is_active = true
    LOOP
      PERFORM private.execute_single_automation_rule(
        v_rule_row.id,
        'task.completed:' || NEW.id::text,
        'task',
        NEW.id,
        v_payload
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_task_automations ON public.task_instances;
CREATE TRIGGER trg_process_task_automations
  AFTER UPDATE ON public.task_instances
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_process_task_automations_fn();


-- 7. SCHEDULER PROGRAMADO SEPARADO Y PROTEGIDO CONTRA EJECUCIÓN CROSS-FAMILY

-- 7.1 RPC Pública para el Usuario Autenticado (SOLO ejecuta su propia familia)
CREATE OR REPLACE FUNCTION public.execute_my_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid := private.get_auth_family_id();
  v_rule_row public.automation_rules%ROWTYPE;
  v_now_family timestamp with time zone := now() AT TIME ZONE 'America/Santiago';
  v_dow integer := extract(dow from v_now_family)::integer; -- 0=Domingo
  v_hhmm text := to_char(v_now_family, 'HH24:MI');
  v_window text := to_char(v_now_family, 'YYYY-MM-DD:HH24');
  v_processed_count integer := 0;
  v_result_status text;
  v_should_run boolean;
BEGIN
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no pertenece a una familia activa';
  END IF;

  FOR v_rule_row IN
    SELECT * FROM public.automation_rules
    WHERE family_id = v_family_id 
      AND trigger_type = 'scheduled_time' 
      AND is_active = true
  LOOP
    v_should_run := false;

    IF v_rule_row.trigger_event = 'cron.weekly_sunday_1900' THEN
      IF v_dow = 0 AND v_hhmm >= '19:00' AND v_hhmm < '20:00' THEN
        v_should_run := true;
      END IF;
    ELSIF v_rule_row.trigger_event = 'cron.daily_0800' THEN
      IF v_hhmm >= '08:00' AND v_hhmm < '09:00' THEN
        v_should_run := true;
      END IF;
    ELSIF v_rule_row.trigger_event = 'cron.every_hour' OR v_rule_row.trigger_event = 'cron.custom' THEN
      v_should_run := true;
    END IF;

    IF v_should_run THEN
      v_result_status := private.execute_single_automation_rule(
        v_rule_row.id,
        'cron:' || v_window,
        'cron',
        NULL,
        '{}'::jsonb
      );

      IF v_result_status = 'success' THEN
        v_processed_count := v_processed_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'executed_count', v_processed_count,
    'window', v_window,
    'dow', v_dow,
    'time', v_hhmm
  );
END;
$$;

-- PERMISOS EXECUTE DE RPC PÚBLICA
REVOKE EXECUTE ON FUNCTION public.execute_my_scheduled_automations FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_my_scheduled_automations TO authenticated;

-- 7.2 Función Privada del Sistema para el Scheduler de Fondo / Worker
CREATE OR REPLACE FUNCTION private.process_system_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rule_row public.automation_rules%ROWTYPE;
  v_now_family timestamp with time zone := now() AT TIME ZONE 'America/Santiago';
  v_dow integer := extract(dow from v_now_family)::integer;
  v_hhmm text := to_char(v_now_family, 'HH24:MI');
  v_window text := to_char(v_now_family, 'YYYY-MM-DD:HH24');
  v_processed_count integer := 0;
  v_result_status text;
  v_should_run boolean;
BEGIN
  FOR v_rule_row IN
    SELECT * FROM public.automation_rules
    WHERE trigger_type = 'scheduled_time' AND is_active = true
  LOOP
    v_should_run := false;

    IF v_rule_row.trigger_event = 'cron.weekly_sunday_1900' THEN
      IF v_dow = 0 AND v_hhmm >= '19:00' AND v_hhmm < '20:00' THEN
        v_should_run := true;
      END IF;
    ELSIF v_rule_row.trigger_event = 'cron.daily_0800' THEN
      IF v_hhmm >= '08:00' AND v_hhmm < '09:00' THEN
        v_should_run := true;
      END IF;
    ELSIF v_rule_row.trigger_event = 'cron.every_hour' OR v_rule_row.trigger_event = 'cron.custom' THEN
      v_should_run := true;
    END IF;

    IF v_should_run THEN
      v_result_status := private.execute_single_automation_rule(
        v_rule_row.id,
        'cron:' || v_window,
        'cron',
        NULL,
        '{}'::jsonb
      );

      IF v_result_status = 'success' THEN
        v_processed_count := v_processed_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'executed_count', v_processed_count,
    'window', v_window
  );
END;
$$;

-- PROHIBIR STRICTAMENTE EXECUTE EN LA FUNCIÓN SISTEMA PRIVADA
REVOKE EXECUTE ON FUNCTION private.process_system_scheduled_automations FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.process_system_scheduled_automations FROM authenticated;

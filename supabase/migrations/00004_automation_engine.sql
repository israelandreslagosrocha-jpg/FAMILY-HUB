-- ============================================================================
-- MIGRACIÓN 00004 (V1.0): MOTOR DE AUTOMATIZACIONES DEL HOGAR (ETAPA 5C.3)
-- ============================================================================

-- 1. TIPOS ENUMERADOS DEL MOTOR DE AUTOMATIZACIÓN
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trigger_type_enum') THEN
    CREATE TYPE trigger_type_enum AS ENUM ('data_event', 'scheduled_time');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_kind_enum') THEN
    CREATE TYPE action_kind_enum AS ENUM ('CREATE_TASK', 'ROTATE_MEMBER', 'SEND_NOTIFICATION', 'REASSIGN_TASK', 'SKIP_TASK');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status_enum') THEN
    CREATE TYPE execution_status_enum AS ENUM ('running', 'success', 'failed', 'skipped_idempotent');
  END IF;
END $$;

-- 2. TABLA MAESTRA DE DEFINICIÓN DE REGLAS DE AUTOMATIZACIÓN
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    created_by_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    trigger_type trigger_type_enum NOT NULL,
    trigger_event text NOT NULL, -- ej: 'task.completed', 'expense.created', 'cron.weekly_sunday_1900'
    condition_config jsonb DEFAULT '{}'::jsonb,
    action_type action_kind_enum NOT NULL,
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
    status execution_status_enum NOT NULL DEFAULT 'running',
    error_message text,
    executed_at timestamp with time zone DEFAULT now() NOT NULL
);

-- HABILITAR RLS EN AUTOMATION_EXECUTIONS
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation Executions SELECT" ON public.automation_executions;
CREATE POLICY "Automation Executions SELECT" ON public.automation_executions FOR SELECT TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id()));


-- 4. FUNCIÓN INTERNA DE PROCESAMIENTO DE UNA REGLA INDIVIDUAL (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION private.execute_single_automation_rule(
  p_rule_id uuid,
  p_trigger_event_id text,
  p_target_entity_type text,
  p_target_entity_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rule public.automation_rules%ROWTYPE;
  v_dedup_key text;
  v_existing_status execution_status_enum;
  v_execution_id uuid;
  v_next_member_id uuid;
  v_new_task_title text;
  v_actor_profile_id uuid := auth.uid();
  v_actor_member_id uuid;
BEGIN
  -- 1. Obtener datos de la regla y validar que esté activa
  SELECT * INTO v_rule
  FROM public.automation_rules
  WHERE id = p_rule_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN 'rule_not_found_or_inactive';
  END IF;

  -- 2. Construcción determinista de la Clave Hash de Idempotencia por Evento Concreto
  v_dedup_key := md5(
    v_rule.id::text || ':' || 
    coalesce(p_trigger_event_id, 'no_event') || ':' || 
    coalesce(p_target_entity_id::text, 'no_entity') || ':' || 
    v_rule.action_type::text
  );

  -- 3. Verificación Explícita de Idempotencia para no confundir la clave deduplication_key con otros errores UNIQUE
  SELECT status INTO v_existing_status
  FROM public.automation_executions
  WHERE deduplication_key = v_dedup_key
  LIMIT 1;

  IF v_existing_status IS NOT NULL THEN
    IF v_existing_status IN ('success', 'running', 'skipped_idempotent') THEN
      RETURN 'skipped_idempotent';
    END IF;
  END IF;

  -- 4. Registrar la Ejecución en Estado 'running'
  INSERT INTO public.automation_executions (
    family_id, rule_id, deduplication_key, target_entity_type, target_entity_id, status
  ) VALUES (
    v_rule.family_id, v_rule.id, v_dedup_key, p_target_entity_type, p_target_entity_id, 'running'
  ) RETURNING id INTO v_execution_id;

  -- 5. Activar la variable local de transacción para prohibir cascadas re-entrantes (Stack Depth = 1)
  PERFORM set_config('family_hub.automation_depth', '1', true);

  -- Obtener member_id del actor autenticado para auditoría si existe
  SELECT id INTO v_actor_member_id
  FROM public.family_members
  WHERE family_id = v_rule.family_id AND profile_id = v_actor_profile_id AND is_active = true
  LIMIT 1;

  -- 6. Ejecución Determinista del Catálogo Cerrado de Acciones
  BEGIN
    IF v_rule.action_type = 'CREATE_TASK' THEN
      v_new_task_title := coalesce(v_rule.action_config->>'task_title', 'Tarea Automática Derivada');
      
      INSERT INTO public.task_instances (
        family_id, created_by_member_id, assigned_member_id, title,
        description, priority, status, due_date
      ) VALUES (
        v_rule.family_id,
        coalesce(v_actor_member_id, v_rule.created_by_member_id),
        coalesce((v_rule.action_config->>'assigned_member_id')::uuid, v_rule.created_by_member_id),
        v_new_task_title,
        'Creada automáticamente por la regla: ' || v_rule.name,
        coalesce((v_rule.action_config->>'priority')::public.priority_enum, 'media'),
        'pending',
        now() + interval '1 day'
      );

    ELSIF v_rule.action_type = 'ROTATE_MEMBER' THEN
      IF p_target_entity_id IS NOT NULL THEN
        -- Obtener el siguiente miembro activo de la familia para rotación
        SELECT id INTO v_next_member_id
        FROM public.family_members
        WHERE family_id = v_rule.family_id AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_next_member_id IS NOT NULL THEN
          UPDATE public.task_instances
          SET assigned_member_id = v_next_member_id
          WHERE id = p_target_entity_id AND family_id = v_rule.family_id;
        END IF;
      END IF;

    ELSIF v_rule.action_type = 'SEND_NOTIFICATION' THEN
      -- Inserción interna en history_logs (Sin HTTP externo síncrono en PostgreSQL)
      INSERT INTO public.history_logs (
        family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
      ) VALUES (
        v_rule.family_id, v_actor_profile_id, v_actor_member_id, 'notification_created', 'automation', v_rule.id,
        jsonb_build_object('rule_name', v_rule.name, 'message', coalesce(v_rule.action_config->>'message', 'Notificación automática enviada'))
      );

    ELSIF v_rule.action_type = 'REASSIGN_TASK' THEN
      IF p_target_entity_id IS NOT NULL AND v_rule.action_config->>'new_assigned_member_id' IS NOT NULL THEN
        UPDATE public.task_instances
        SET assigned_member_id = (v_rule.action_config->>'new_assigned_member_id')::uuid
        WHERE id = p_target_entity_id AND family_id = v_rule.family_id;
      END IF;

    ELSIF v_rule.action_type = 'SKIP_TASK' THEN
      IF p_target_entity_id IS NOT NULL THEN
        UPDATE public.task_instances
        SET status = 'skipped'
        WHERE id = p_target_entity_id AND family_id = v_rule.family_id;
      END IF;
    END IF;

    -- Actualizar Estado a 'success'
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
    -- Resiliencia: Registrar fallo en la bitácora sin hacer caer la transacción principal del usuario
    UPDATE public.automation_executions
    SET status = 'failed', error_message = SQLERRM
    WHERE id = v_execution_id;

    RETURN 'failed';
  END;
END;
$$;


-- 5. DISPARADOR EN BD PARA AUTOMATIZACIONES DE EVENTOS DE DATOS (TASK COMPLETED)
CREATE OR REPLACE FUNCTION private.trg_process_task_automations_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rule_row public.automation_rules%ROWTYPE;
BEGIN
  -- Anti-Cascada: Si la transacción actual fue iniciada por el motor de automatización, RETORNAR INMEDIATAMENTE
  IF current_setting('family_hub.automation_depth', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Procesar solo si la tarea pasó a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    FOR v_rule_row IN
      SELECT * FROM public.automation_rules
      WHERE family_id = NEW.family_id AND trigger_type = 'data_event' AND is_active = true
    LOOP
      PERFORM private.execute_single_automation_rule(
        v_rule_row.id,
        'task.completed:' || NEW.id::text,
        'task',
        NEW.id
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


-- 6. RPC PÚBLICA PARA EJECUCIÓN DE AUTOMATIZACIONES TEMPORALES PROGRAMADAS (SCHEDULED)
CREATE OR REPLACE FUNCTION public.execute_scheduled_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid := private.get_auth_family_id();
  v_rule_row public.automation_rules%ROWTYPE;
  v_window text := to_char(now(), 'YYYY-MM-DD:HH24');
  v_processed_count integer := 0;
  v_result_status text;
BEGIN
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no pertenece a una familia activa';
  END IF;

  FOR v_rule_row IN
    SELECT * FROM public.automation_rules
    WHERE family_id = v_family_id AND trigger_type = 'scheduled_time' AND is_active = true
  LOOP
    v_result_status := private.execute_single_automation_rule(
      v_rule_row.id,
      'cron:' || v_window,
      'cron',
      NULL
    );

    IF v_result_status = 'success' THEN
      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('status', 'success', 'executed_count', v_processed_count, 'window', v_window);
END;
$$;

-- RESTRICCIÓN DE PERMISOS EXECUTE
REVOKE EXECUTE ON FUNCTION public.execute_scheduled_automations FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_scheduled_automations TO authenticated;

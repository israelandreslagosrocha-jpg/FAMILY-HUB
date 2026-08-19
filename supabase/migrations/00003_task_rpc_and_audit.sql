-- ============================================================================
-- MIGRACIÓN 00003 (V2.1 CORREGIDA): RPC DE TAREAS, HARDENING RLS Y AUDITORÍA REAL
-- ============================================================================

-- 1. SOPORTE DE REFERENCIA A RESPONSABILIDADES EN INSTANCIAS DE TAREAS
ALTER TABLE public.task_instances 
  ADD COLUMN IF NOT EXISTS responsibility_id uuid REFERENCES public.responsibilities(id) ON DELETE SET NULL;

-- 2. HARDENING DE POLÍTICAS RLS EN TASK_INSTANCES PARA LA NUEVA COLUMNA RESPONSIBILITY_ID
DROP POLICY IF EXISTS "Task Instances INSERT" ON public.task_instances;
CREATE POLICY "Task Instances INSERT" ON public.task_instances FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (task_series_id IS NULL OR task_series_id IN (SELECT id FROM public.task_series WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (responsibility_id IS NULL OR responsibility_id IN (SELECT id FROM public.responsibilities WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  created_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

DROP POLICY IF EXISTS "Task Instances UPDATE" ON public.task_instances;
CREATE POLICY "Task Instances UPDATE" ON public.task_instances FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (task_series_id IS NULL OR task_series_id IN (SELECT id FROM public.task_series WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (responsibility_id IS NULL OR responsibility_id IN (SELECT id FROM public.responsibilities WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  created_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

-- 3. FUNCIÓN PRIVADA DE AUDITORÍA AUTOMÁTICA E INALTERABLE DE TAREAS (ESQUEMA EXACTO 00001)
CREATE OR REPLACE FUNCTION private.audit_task_instance_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_profile_id uuid := auth.uid();
  v_family_member_id uuid;
  v_family_id uuid;
  v_old_assigned_name text;
  v_new_assigned_name text;
BEGIN
  -- Determinar la family_id
  IF TG_OP = 'DELETE' THEN
    v_family_id := OLD.family_id;
  ELSE
    v_family_id := NEW.family_id;
  END IF;

  -- Obtener el family_member_id del actor autenticado si existe
  SELECT id INTO v_family_member_id
  FROM public.family_members
  WHERE profile_id = v_actor_profile_id AND family_id = v_family_id AND is_active = true
  LIMIT 1;

  -- 1. AUDITORÍA DE CREACIÓN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_family_id, v_actor_profile_id, v_family_member_id, 'created', 'task', NEW.id,
      jsonb_build_object('title', NEW.title, 'priority', NEW.priority, 'assigned_member_id', NEW.assigned_member_id)
    );
    RETURN NEW;
  END IF;

  -- 2. AUDITORÍA DE EDICIÓN / TRANSICIONES DE ESTADO / REASIGNACIÓN
  IF TG_OP = 'UPDATE' THEN
    -- A. Transición de Estado: Completada
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO public.history_logs (
        family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
      ) VALUES (
        v_family_id, v_actor_profile_id, v_family_member_id, 'completed', 'task', NEW.id,
        jsonb_build_object('title', NEW.title, 'completed_at', NEW.completed_at)
      );
    -- B. Transición de Estado: Omitida
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'skipped' THEN
      INSERT INTO public.history_logs (
        family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
      ) VALUES (
        v_family_id, v_actor_profile_id, v_family_member_id, 'skipped', 'task', NEW.id,
        jsonb_build_object('title', NEW.title)
      );
    -- C. Transición de Estado: Reabierta (Completada -> Pendiente)
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND OLD.status = 'completed' AND NEW.status = 'pending' THEN
      INSERT INTO public.history_logs (
        family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
      ) VALUES (
        v_family_id, v_actor_profile_id, v_family_member_id, 'reopened', 'task', NEW.id,
        jsonb_build_object('title', NEW.title)
      );
    END IF;

    -- D. Reasignación Real de Encargado (Diferente a la previa)
    IF OLD.assigned_member_id IS DISTINCT FROM NEW.assigned_member_id THEN
      SELECT name INTO v_old_assigned_name FROM public.family_members WHERE id = OLD.assigned_member_id;
      SELECT name INTO v_new_assigned_name FROM public.family_members WHERE id = NEW.assigned_member_id;

      INSERT INTO public.history_logs (
        family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
      ) VALUES (
        v_family_id, v_actor_profile_id, v_family_member_id, 'reassigned', 'task', NEW.id,
        jsonb_build_object(
          'title', NEW.title,
          'old_assigned_member_id', OLD.assigned_member_id,
          'old_assigned_name', coalesce(v_old_assigned_name, 'Desconocido'),
          'new_assigned_member_id', NEW.assigned_member_id,
          'new_assigned_name', coalesce(v_new_assigned_name, 'Desconocido')
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- 3. AUDITORÍA DE ELIMINACIÓN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.history_logs (
      family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata
    ) VALUES (
      v_family_id, v_actor_profile_id, v_family_member_id, 'deleted', 'task', OLD.id,
      jsonb_build_object('title', OLD.title)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- DISPARADOR DE AUDITORÍA EN TASK_INSTANCES
DROP TRIGGER IF EXISTS trg_audit_task_instance ON public.task_instances;
CREATE TRIGGER trg_audit_task_instance
  AFTER INSERT OR UPDATE OR DELETE ON public.task_instances
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_task_instance_fn();


-- 4. FUNCIÓN RPC TRANSACCIONAL HARDENED PARA CREACIÓN DE TAREAS Y SERIES
CREATE OR REPLACE FUNCTION public.create_family_task(
  p_title text,
  p_description text,
  p_assigned_member_id uuid,
  p_priority priority_enum,
  p_due_date date,
  p_category_id uuid DEFAULT NULL,
  p_responsibility_id uuid DEFAULT NULL,
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
  v_creator_member_id uuid;
  v_recurrence_id uuid := NULL;
  v_series_id uuid := NULL;
  v_instance_id uuid;
BEGIN
  -- 1. Validación de Autenticación y Familia Activa
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no pertenece a una familia activa';
  END IF;

  -- 2. Obtener el member_id del creador autenticado
  SELECT id INTO v_creator_member_id
  FROM public.family_members
  WHERE profile_id = auth.uid() AND family_id = v_family_id AND is_active = true
  LIMIT 1;

  IF v_creator_member_id IS NULL THEN
    RAISE EXCEPTION 'Perfil de miembro no encontrado para el usuario autenticado';
  END IF;

  -- 3. Validación de Título Obligatorio
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'El título de la tarea es obligatorio';
  END IF;

  -- 4. Validación de Encargado Asignado (Debe pertenecer a la misma familia y estar activo)
  IF p_assigned_member_id IS NULL THEN
    RAISE EXCEPTION 'Debe asignar la tarea a un miembro de la familia';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE id = p_assigned_member_id AND family_id = v_family_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El miembro asignado no pertenece activamente a su familia';
  END IF;

  -- 5. Validación de Categoría (si se especifica)
  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = p_category_id AND family_id = v_family_id
    ) THEN
      RAISE EXCEPTION 'La categoría especificada no pertenece a su familia';
    END IF;
  END IF;

  -- 6. Validación de Responsabilidad (si se especifica)
  IF p_responsibility_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.responsibilities
      WHERE id = p_responsibility_id AND family_id = v_family_id
    ) THEN
      RAISE EXCEPTION 'La responsabilidad especificada no pertenece a su familia';
    END IF;
  END IF;

  -- 7. Validación Estricta de Coherencia de Parámetros de Recurrencia
  IF p_recurrence_frequency IS NULL THEN
    IF p_recurrence_days_of_week IS NOT NULL OR 
       p_recurrence_day_of_month IS NOT NULL OR 
       p_recurrence_monthly_pattern IS NOT NULL OR 
       p_recurrence_end_date IS NOT NULL THEN
      RAISE EXCEPTION 'No se permiten parámetros de recurrencia si la frecuencia es nula';
    END IF;
  ELSE
    -- Validaciones de Recurrencia Activa
    IF p_recurrence_end_date IS NOT NULL AND p_recurrence_end_date < p_due_date THEN
      RAISE EXCEPTION 'La fecha de fin de la recurrencia debe ser mayor o igual a la fecha límite';
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

    -- Inserción de la Regla de Recurrencia
    INSERT INTO public.recurrence_rules (
      family_id, frequency, days_of_week, day_of_month,
      monthly_pattern, start_date, end_date
    ) VALUES (
      v_family_id, p_recurrence_frequency, p_recurrence_days_of_week,
      p_recurrence_day_of_month, p_recurrence_monthly_pattern,
      p_due_date, p_recurrence_end_date
    ) RETURNING id INTO v_recurrence_id;

    -- Inserción de la Serie / Plantilla Maestra (asociando la responsabilidad si se especificó)
    INSERT INTO public.task_series (
      family_id, category_id, responsibility_id, recurrence_rule_id, default_assigned_member_id,
      title, description, priority, is_active
    ) VALUES (
      v_family_id, p_category_id, p_responsibility_id, v_recurrence_id, p_assigned_member_id,
      trim(p_title), p_description, p_priority, true
    ) RETURNING id INTO v_series_id;
  END IF;

  -- 8. Inserción de la Primera Instancia Física Concreta
  INSERT INTO public.task_instances (
    family_id, task_series_id, category_id, assigned_member_id,
    created_by_member_id, responsibility_id, title, description,
    priority, status, due_date
  ) VALUES (
    v_family_id, v_series_id, p_category_id, p_assigned_member_id,
    v_creator_member_id, p_responsibility_id, trim(p_title), p_description,
    p_priority, 'pending', p_due_date
  ) RETURNING id INTO v_instance_id;

  RETURN v_instance_id;
END;
$$;

-- 5. RESTRICCIÓN ESTRICTA DE PERMISOS EXECUTE
REVOKE EXECUTE ON FUNCTION public.create_family_task FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_family_task TO authenticated;

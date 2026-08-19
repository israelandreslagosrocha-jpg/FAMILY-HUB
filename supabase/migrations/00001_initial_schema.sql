-- ============================================================================
-- MIGRACIÓN 00001 (V4.1): ESQUEMA INICIAL DE BASE DE DATOS FAMILY-HUB
-- ============================================================================

-- 1. CREACIÓN DE ESQUEMA PRIVADO (Funciones de seguridad aisladas del Data API)
CREATE SCHEMA IF NOT EXISTS private;

-- 2. TIPOS ENUMERADOS
CREATE TYPE category_type_enum AS ENUM ('task', 'expense', 'income', 'event');
CREATE TYPE recurrence_frequency_enum AS ENUM ('daily', 'weekly', 'monthly', 'yearly', 'custom');
CREATE TYPE monthly_pattern_enum AS ENUM ('FIRST_MONDAY', 'LAST_DAY');
CREATE TYPE priority_enum AS ENUM ('alta', 'media', 'baja');
CREATE TYPE task_status_enum AS ENUM ('pending', 'completed', 'skipped');

-- 3. CREACIÓN DE TABLAS PÚBLICAS

-- 3.1 Familias (Hogar)
CREATE TABLE public.families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.2 Perfiles de Usuario (Extensión de auth.users)
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.3 Miembros de la Familia (Identidad del Hogar)
CREATE TABLE public.family_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    name text NOT NULL,
    avatar_id text NOT NULL DEFAULT 'avatar-01',
    color text NOT NULL DEFAULT '#3b82f6',
    role text NOT NULL DEFAULT 'Familiar',
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Restricción de Unicidad: Un profile_id solo puede estar asociado a una cuenta familiar activa
CREATE UNIQUE INDEX idx_unique_active_profile_family 
ON public.family_members (profile_id) 
WHERE profile_id IS NOT NULL AND is_active = true;

-- 3.4 Categorías (Sistema vs Personalizadas)
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name text NOT NULL,
    type category_type_enum NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    color text NOT NULL DEFAULT '#3b82f6',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.5 Responsabilidades del Hogar
CREATE TABLE public.responsibilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    default_assigned_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.6 Reglas de Recurrencia
CREATE TABLE public.recurrence_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    frequency recurrence_frequency_enum NOT NULL,
    days_of_week integer[],
    day_of_month integer,
    monthly_pattern monthly_pattern_enum,
    time_of_day time without time zone NOT NULL DEFAULT '09:00:00',
    duration_minutes integer DEFAULT 30 NOT NULL,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.7 Series de Tareas (Plantillas Maestras)
CREATE TABLE public.task_series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    responsibility_id uuid REFERENCES public.responsibilities(id) ON DELETE SET NULL,
    recurrence_rule_id uuid REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
    default_assigned_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    priority priority_enum DEFAULT 'media' NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.8 Instancias Concretas de Tareas (Sin duplicidad de estado; status + completed_at)
CREATE TABLE public.task_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    task_series_id uuid REFERENCES public.task_series(id) ON DELETE CASCADE,
    assigned_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    created_by_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    priority priority_enum DEFAULT 'media' NOT NULL,
    status task_status_enum DEFAULT 'pending' NOT NULL,
    due_date timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.9 Eventos de Calendario
CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
    recurrence_rule_id uuid REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_all_day boolean DEFAULT false NOT NULL,
    is_family_event boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.10 Participantes de Eventos (Relación M:N)
CREATE TABLE public.event_members (
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, member_id)
);

-- 3.11 Gastos (Egresos)
CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    registered_by_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    belonging_to_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    title text NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    currency char(3) DEFAULT 'CLP' NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    is_family_expense boolean DEFAULT true NOT NULL,
    receipt_image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.12 Ingresos
CREATE TABLE public.incomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    registered_by_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
    belonging_to_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    title text NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    currency char(3) DEFAULT 'CLP' NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    is_family_income boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3.13 Presupuestos
CREATE TABLE public.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    limit_amount numeric(12,2) NOT NULL CHECK (limit_amount >= 0),
    currency char(3) DEFAULT 'CLP' NOT NULL,
    period_start date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_budget_family_category_period UNIQUE (family_id, category_id, period_start)
);

-- 3.14 Bitácora de Auditoría e Histórico Estructurado
CREATE TABLE public.history_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    family_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
    action_type text NOT NULL, -- 'created' | 'completed' | 'skipped' | 'reassigned' | 'deleted'
    entity_type text NOT NULL, -- 'task' | 'expense' | 'income' | 'event' | 'responsibility' | 'family_member'
    entity_id uuid NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. ÍNDICES DE RENDIMIENTO PARA POLÍTICAS RLS
CREATE INDEX idx_family_members_profile_active ON public.family_members (profile_id, is_active) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_categories_family ON public.categories (family_id);
CREATE INDEX idx_task_instances_family ON public.task_instances (family_id);
CREATE INDEX idx_events_family ON public.events (family_id);
CREATE INDEX idx_expenses_family ON public.expenses (family_id);
CREATE INDEX idx_incomes_family ON public.incomes (family_id);
CREATE INDEX idx_history_logs_family ON public.history_logs (family_id);

-- 5. FUNCIONES DE SEGURIDAD (Esquema Private)

-- 5.1 Resolución de la Familia del Usuario Autenticado
CREATE OR REPLACE FUNCTION private.get_auth_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT fm.family_id 
  FROM public.family_members fm
  WHERE fm.profile_id = auth.uid() 
    AND fm.is_active = true 
  LIMIT 1;
$$;

-- 5.2 Sembrado de Categorías Predeterminadas
CREATE OR REPLACE FUNCTION private.seed_default_categories(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.categories (family_id, name, type, is_system, color) VALUES
    (p_family_id, 'Supermercado y Alimentación', 'expense', true, '#22c55e'),
    (p_family_id, 'Servicios y Cuentas', 'expense', true, '#ef4444'),
    (p_family_id, 'Transporte y Combustible', 'expense', true, '#f59e0b'),
    (p_family_id, 'Salud y Medicina', 'expense', true, '#ec4899'),
    (p_family_id, 'Educación y Colegio', 'expense', true, '#8b5cf6'),
    (p_family_id, 'Sueldo e Ingresos', 'income', true, '#10b981'),
    (p_family_id, 'Tareas del Hogar', 'task', true, '#3b82f6'),
    (p_family_id, 'Mantenimiento', 'task', true, '#64748b'),
    (p_family_id, 'Eventos Familiares', 'event', true, '#a855f7');
END;
$$;

-- 6. HABILITACIÓN DE ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS EXPLÍCITAS CON VALIDACIÓN CROSS-FAMILY

-- 7.1 PROFILES
CREATE POLICY "Profiles SELECT" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR id IN (
  SELECT profile_id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND profile_id IS NOT NULL
));

CREATE POLICY "Profiles UPDATE" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 7.2 FAMILIES
CREATE POLICY "Families SELECT" ON public.families FOR SELECT TO authenticated
USING (id = (SELECT private.get_auth_family_id()));

CREATE POLICY "Families UPDATE" ON public.families FOR UPDATE TO authenticated
USING (id = (SELECT private.get_auth_family_id())) WITH CHECK (id = (SELECT private.get_auth_family_id()));

-- 7.3 FAMILY_MEMBERS
CREATE POLICY "Family Members SELECT" ON public.family_members FOR SELECT TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

CREATE POLICY "Family Members INSERT" ON public.family_members FOR INSERT TO authenticated
WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

CREATE POLICY "Family Members UPDATE" ON public.family_members FOR UPDATE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id())) WITH CHECK (family_id = (SELECT private.get_auth_family_id()));

-- 7.4 CATEGORIES
CREATE POLICY "Categories SELECT" ON public.categories FOR SELECT TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

CREATE POLICY "Categories INSERT" ON public.categories FOR INSERT TO authenticated
WITH CHECK (family_id = (SELECT private.get_auth_family_id()) AND is_system = false);

CREATE POLICY "Categories UPDATE" ON public.categories FOR UPDATE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()) AND is_system = false)
WITH CHECK (family_id = (SELECT private.get_auth_family_id()) AND is_system = false);

CREATE POLICY "Categories DELETE" ON public.categories FOR DELETE TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()) AND is_system = false);

-- 7.5 RESPONSIBILITIES
CREATE POLICY "Responsibilities SELECT" ON public.responsibilities FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Responsibilities INSERT" ON public.responsibilities FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  default_assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);
CREATE POLICY "Responsibilities UPDATE" ON public.responsibilities FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  default_assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);
CREATE POLICY "Responsibilities DELETE" ON public.responsibilities FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

-- 7.6 RECURRENCE_RULES
CREATE POLICY "Recurrence Rules SELECT" ON public.recurrence_rules FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Recurrence Rules INSERT" ON public.recurrence_rules FOR INSERT TO authenticated WITH CHECK (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Recurrence Rules UPDATE" ON public.recurrence_rules FOR UPDATE TO authenticated USING (family_id = (SELECT private.get_auth_family_id())) WITH CHECK (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Recurrence Rules DELETE" ON public.recurrence_rules FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

-- 7.7 TASK_SERIES
CREATE POLICY "Task Series SELECT" ON public.task_series FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Task Series INSERT" ON public.task_series FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (responsibility_id IS NULL OR responsibility_id IN (SELECT id FROM public.responsibilities WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (recurrence_rule_id IS NULL OR recurrence_rule_id IN (SELECT id FROM public.recurrence_rules WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  default_assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);
CREATE POLICY "Task Series UPDATE" ON public.task_series FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (responsibility_id IS NULL OR responsibility_id IN (SELECT id FROM public.responsibilities WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (recurrence_rule_id IS NULL OR recurrence_rule_id IN (SELECT id FROM public.recurrence_rules WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  default_assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);
CREATE POLICY "Task Series DELETE" ON public.task_series FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

-- 7.8 TASK_INSTANCES
CREATE POLICY "Task Instances SELECT" ON public.task_instances FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Task Instances INSERT" ON public.task_instances FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (task_series_id IS NULL OR task_series_id IN (SELECT id FROM public.task_series WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  created_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);
CREATE POLICY "Task Instances UPDATE" ON public.task_instances FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (task_series_id IS NULL OR task_series_id IN (SELECT id FROM public.task_series WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  assigned_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);
CREATE POLICY "Task Instances DELETE" ON public.task_instances FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

-- 7.9 EVENTS & EVENT_MEMBERS
CREATE POLICY "Events SELECT" ON public.events FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Events INSERT" ON public.events FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (recurrence_rule_id IS NULL OR recurrence_rule_id IN (SELECT id FROM public.recurrence_rules WHERE family_id = (SELECT private.get_auth_family_id())))
);
CREATE POLICY "Events UPDATE" ON public.events FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  (category_id IS NULL OR category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))) AND
  (recurrence_rule_id IS NULL OR recurrence_rule_id IN (SELECT id FROM public.recurrence_rules WHERE family_id = (SELECT private.get_auth_family_id())))
);
CREATE POLICY "Events DELETE" ON public.events FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

CREATE POLICY "Event Members SELECT" ON public.event_members FOR SELECT TO authenticated
USING (event_id IN (SELECT id FROM public.events WHERE family_id = (SELECT private.get_auth_family_id())));

CREATE POLICY "Event Members INSERT" ON public.event_members FOR INSERT TO authenticated
WITH CHECK (
  event_id IN (SELECT id FROM public.events WHERE family_id = (SELECT private.get_auth_family_id())) AND
  member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

CREATE POLICY "Event Members UPDATE" ON public.event_members FOR UPDATE TO authenticated
USING (event_id IN (SELECT id FROM public.events WHERE family_id = (SELECT private.get_auth_family_id())))
WITH CHECK (
  event_id IN (SELECT id FROM public.events WHERE family_id = (SELECT private.get_auth_family_id())) AND
  member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true)
);

CREATE POLICY "Event Members DELETE" ON public.event_members FOR DELETE TO authenticated
USING (event_id IN (SELECT id FROM public.events WHERE family_id = (SELECT private.get_auth_family_id())));

-- 7.10 EXPENSES & INCOMES (Validación estricta de categorías y miembros de mi familia)
CREATE POLICY "Expenses SELECT" ON public.expenses FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Expenses INSERT" ON public.expenses FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id())) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  (belonging_to_member_id IS NULL OR belonging_to_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);
CREATE POLICY "Expenses UPDATE" ON public.expenses FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id())) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  (belonging_to_member_id IS NULL OR belonging_to_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);
CREATE POLICY "Expenses DELETE" ON public.expenses FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

CREATE POLICY "Incomes SELECT" ON public.incomes FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Incomes INSERT" ON public.incomes FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id())) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  (belonging_to_member_id IS NULL OR belonging_to_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);
CREATE POLICY "Incomes UPDATE" ON public.incomes FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id())) AND
  registered_by_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true) AND
  (belonging_to_member_id IS NULL OR belonging_to_member_id IN (SELECT id FROM public.family_members WHERE family_id = (SELECT private.get_auth_family_id()) AND is_active = true))
);
CREATE POLICY "Incomes DELETE" ON public.incomes FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

-- 7.11 BUDGETS
CREATE POLICY "Budgets SELECT" ON public.budgets FOR SELECT TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));
CREATE POLICY "Budgets INSERT" ON public.budgets FOR INSERT TO authenticated 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))
);
CREATE POLICY "Budgets UPDATE" ON public.budgets FOR UPDATE TO authenticated 
USING (family_id = (SELECT private.get_auth_family_id())) 
WITH CHECK (
  family_id = (SELECT private.get_auth_family_id()) AND
  category_id IN (SELECT id FROM public.categories WHERE family_id = (SELECT private.get_auth_family_id()))
);
CREATE POLICY "Budgets DELETE" ON public.budgets FOR DELETE TO authenticated USING (family_id = (SELECT private.get_auth_family_id()));

-- 7.12 HISTORY_LOGS (Solo Lectura desde Cliente, Inserción por Triggers de BD)
CREATE POLICY "History Logs SELECT" ON public.history_logs FOR SELECT TO authenticated
USING (family_id = (SELECT private.get_auth_family_id()));

-- 8. TRIGGERS DE CONTROL Y AUDITORÍA INALTERABLE

-- 8.1 Inmutabilidad Estructural de Family Members
CREATE OR REPLACE FUNCTION private.prevent_family_member_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.family_id IS DISTINCT FROM NEW.family_id THEN
    RAISE EXCEPTION 'No se permite alterar el family_id de un miembro de familia';
  END IF;
  IF OLD.profile_id IS NOT NULL AND OLD.profile_id IS DISTINCT FROM NEW.profile_id THEN
    RAISE EXCEPTION 'No se permite cambiar el profile_id de un miembro de familia ya vinculado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_family_member_structure
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_family_member_mutation();

-- 8.2 Trigger Auditoría para Tareas (CREATE, COMPLETE, SKIP, REASSIGN, DELETE)
CREATE OR REPLACE FUNCTION private.audit_tasks_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (NEW.family_id, auth.uid(), NEW.assigned_member_id, 'created', 'task', NEW.id, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      NEW.completed_at := now();
      INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
      VALUES (NEW.family_id, auth.uid(), NEW.assigned_member_id, 'completed', 'task', NEW.id, jsonb_build_object('title', NEW.title));
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'skipped' THEN
      INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
      VALUES (NEW.family_id, auth.uid(), NEW.assigned_member_id, 'skipped', 'task', NEW.id, jsonb_build_object('title', NEW.title));
    ELSIF OLD.assigned_member_id IS DISTINCT FROM NEW.assigned_member_id THEN
      INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
      VALUES (NEW.family_id, auth.uid(), NEW.assigned_member_id, 'reassigned', 'task', NEW.id, jsonb_build_object('title', NEW.title));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (OLD.family_id, auth.uid(), OLD.assigned_member_id, 'deleted', 'task', OLD.id, jsonb_build_object('title', OLD.title));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_tasks_history
  BEFORE INSERT OR UPDATE OR DELETE ON public.task_instances
  FOR EACH ROW EXECUTE FUNCTION private.audit_tasks_trigger_fn();

-- 8.3 Trigger Auditoría para Gastos (CREATE, DELETE)
CREATE OR REPLACE FUNCTION private.audit_expenses_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (NEW.family_id, auth.uid(), NEW.registered_by_member_id, 'created', 'expense', NEW.id, jsonb_build_object('title', NEW.title, 'amount', NEW.amount));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (OLD.family_id, auth.uid(), OLD.registered_by_member_id, 'deleted', 'expense', OLD.id, jsonb_build_object('title', OLD.title, 'amount', OLD.amount));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_expenses_history
  AFTER INSERT OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION private.audit_expenses_trigger_fn();

-- 8.4 Trigger Auditoría para Ingresos (CREATE, DELETE)
CREATE OR REPLACE FUNCTION private.audit_incomes_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (NEW.family_id, auth.uid(), NEW.registered_by_member_id, 'created', 'income', NEW.id, jsonb_build_object('title', NEW.title, 'amount', NEW.amount));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (OLD.family_id, auth.uid(), OLD.registered_by_member_id, 'deleted', 'income', OLD.id, jsonb_build_object('title', OLD.title, 'amount', OLD.amount));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_incomes_history
  AFTER INSERT OR DELETE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION private.audit_incomes_trigger_fn();

-- 8.5 Trigger Auditoría para Eventos (CREATE, DELETE)
CREATE OR REPLACE FUNCTION private.audit_events_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (NEW.family_id, auth.uid(), NULL, 'created', 'event', NEW.id, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.history_logs (family_id, actor_profile_id, family_member_id, action_type, entity_type, entity_id, metadata)
    VALUES (OLD.family_id, auth.uid(), NULL, 'deleted', 'event', OLD.id, jsonb_build_object('title', OLD.title));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_events_history
  AFTER INSERT OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION private.audit_events_trigger_fn();

-- 9. FUNCIÓN RPC PÚBLICA DE ONBOARDING IDEMPOTENTE Y PROTEGIDA CONTRA CONCURRENCIA
CREATE OR REPLACE FUNCTION public.onboard_first_family(
  p_family_name text,
  p_member_name text,
  p_avatar_id text,
  p_color text,
  p_role text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_family_id uuid;
  v_family_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Bloqueo Transaccional Advisory para prevenir condiciones de carrera simultáneas del mismo usuario
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- Comprobación Idempotente
  v_existing_family_id := private.get_auth_family_id();
  IF v_existing_family_id IS NOT NULL THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una familia activa';
  END IF;

  -- 1. Crear Profile si no existe
  INSERT INTO public.profiles (id, display_name)
  VALUES (v_user_id, p_member_name)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- 2. Crear Familia
  INSERT INTO public.families (name)
  VALUES (p_family_name)
  RETURNING id INTO v_family_id;

  -- 3. Crear Miembro Principal
  INSERT INTO public.family_members (family_id, profile_id, name, avatar_id, color, role, is_active)
  VALUES (v_family_id, v_user_id, p_member_name, p_avatar_id, p_color, p_role, true);

  -- 4. Sembrado de Categorías Iniciales
  PERFORM private.seed_default_categories(v_family_id);

  RETURN v_family_id;
END;
$$;

-- 10. RESTRICCIÓN DE PERMISOS EXECUTE EN TODAS LAS FUNCIONES (Hardening de Seguridad)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.onboard_first_family(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboard_first_family(text, text, text, text, text) TO authenticated;

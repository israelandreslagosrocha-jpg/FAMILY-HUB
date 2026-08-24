-- ============================================================================
-- MIGRACIÓN 00010: VINCULACIÓN DE CUENTAS DE USUARIO A LA FAMILIA Y FIX PROFILES FKEY
-- ============================================================================

-- 1. AGREGAR COLUMNA DE CÓDIGO DE INVITACIÓN EN LA TABLA FAMILIES
ALTER TABLE public.families 
  ADD COLUMN IF NOT EXISTS invite_code text DEFAULT 'LAGOS-FAMILY';

-- Asignar código por defecto a cualquier familia existente que tenga NULL
UPDATE public.families 
SET invite_code = 'LAGOS-FAMILY' 
WHERE invite_code IS NULL;

-- 2. AGREGAR COLUMNA DE EMAIL OPCIONAL EN FAMILY_MEMBERS
ALTER TABLE public.family_members 
  ADD COLUMN IF NOT EXISTS email text;

-- 2.1 HABILITAR POLÍTICA RLS INSERT EN PUBLIC.PROFILES (EVITA ERROR HTTP 403)
DROP POLICY IF EXISTS "Profiles INSERT" ON public.profiles;
CREATE POLICY "Profiles INSERT" ON public.profiles FOR INSERT TO authenticated 
WITH CHECK (id = auth.uid());

-- 3. TRIGGER AUTOMÁTICO EN AUTH.USERS PARA GARANTIZAR PROFILE EN PUBLIC.PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 4. FUNCIÓN RPC DE BÚSQUEDA DE INTEGRANTES UNLINKED O DISPONIBLES POR CÓDIGO DE INVITACIÓN
CREATE OR REPLACE FUNCTION public.get_unlinked_family_members_by_code(p_invite_code text)
RETURNS TABLE (
  id uuid,
  family_id uuid,
  name text,
  role text,
  avatar_id text,
  color text,
  is_claimed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  SELECT f.id INTO v_family_id
  FROM public.families f
  WHERE UPPER(TRIM(f.invite_code)) = UPPER(TRIM(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido o no encontrado.';
  END IF;

  RETURN QUERY
  SELECT 
    fm.id,
    fm.family_id,
    fm.name,
    fm.role,
    fm.avatar_id,
    fm.color,
    (fm.profile_id IS NOT NULL) AS is_claimed
  FROM public.family_members fm
  WHERE fm.family_id = v_family_id 
    AND fm.is_active = true
  ORDER BY fm.created_at ASC;
END;
$$;

-- 5. FUNCIÓN RPC PARA VINCULAR EL USUARIO AUTENTICADO A UN PERFIL DE LA FAMILIA
CREATE OR REPLACE FUNCTION public.link_member_profile(p_invite_code text, p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_member_record public.family_members%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  -- 1. Validar Código de Invitación
  SELECT f.id INTO v_family_id
  FROM public.families f
  WHERE UPPER(TRIM(f.invite_code)) = UPPER(TRIM(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Código de invitación inválido.';
  END IF;

  -- 2. Validar que el integrante pertenezca a esa familia
  SELECT * INTO v_member_record
  FROM public.family_members fm
  WHERE fm.id = p_member_id AND fm.family_id = v_family_id AND fm.is_active = true;

  IF v_member_record.id IS NULL THEN
    RAISE EXCEPTION 'El perfil seleccionado no pertenece a la familia indicada.';
  END IF;

  -- 3. GARANTIZAR QUE EL PERFIL EXISTA EN PUBLIC.PROFILES (FIX CLAVE FORÁNEA)
  INSERT INTO public.profiles (id, display_name)
  VALUES (v_user_id, COALESCE(v_member_record.name, 'Familiar'))
  ON CONFLICT (id) DO NOTHING;

  -- 4. Desvincular de cualquier otro perfil previo de este usuario si existiera
  UPDATE public.family_members
  SET profile_id = NULL
  WHERE profile_id = v_user_id;

  -- 5. Vincular el profile_id al integrante de la familia seleccionado
  UPDATE public.family_members
  SET profile_id = v_user_id
  WHERE id = p_member_id;

  RETURN true;
END;
$$;

-- 6. FUNCIÓN RPC DE AUTO-VINCULACIÓN POR CORREO ELECTRÓNICO (AUTO-LINK)
CREATE OR REPLACE FUNCTION public.auto_link_member_by_email()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_target_member_id uuid;
  v_member_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Obtener email del usuario autenticado
  SELECT u.email INTO v_user_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN false;
  END IF;

  -- Buscar si existe un integrante con email coincidente que esté libre
  SELECT fm.id, fm.name INTO v_target_member_id, v_member_name
  FROM public.family_members fm
  WHERE LOWER(TRIM(fm.email)) = LOWER(TRIM(v_user_email))
    AND fm.profile_id IS NULL
    AND fm.is_active = true
  LIMIT 1;

  IF v_target_member_id IS NOT NULL THEN
    -- Garantizar profile en public.profiles
    INSERT INTO public.profiles (id, display_name)
    VALUES (v_user_id, COALESCE(v_member_name, 'Familiar'))
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.family_members
    SET profile_id = v_user_id
    WHERE id = v_target_member_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 7. PERMISOS DE EJECUCIÓN PARA USUARIOS AUTENTICADOS
GRANT EXECUTE ON FUNCTION public.get_unlinked_family_members_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_member_profile(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_link_member_by_email() TO authenticated;

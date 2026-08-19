-- ============================================================================
-- MIGRACIÓN 00006 (V2.5 HARDENED): BUCKET PRIVADO 'RECEIPTS' Y POLÍTICAS RLS
-- ============================================================================

-- 1. REGISTRO Y CONFIGURACIÓN DEL BUCKET PRIVADO 'RECEIPTS' EN STORAGE.BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,                 -- Bucket Privado (Lectura/Escritura bajo RLS)
  10485760,              -- Límite de Tamaño de Archivo: 10 MB (10 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. POLÍTICAS DE SEGURIDAD RLS EN STORAGE.OBJECTS PARA EL BUCKET RECEIPTS
-- (Nota: RLS viene habilitado por defecto en la tabla storage.objects por el sistema de Supabase)

-- 2.1 Política SELECT: Permitir lectura solo si el primer segmento del path coincide con la familia del usuario
DROP POLICY IF EXISTS "Receipts Storage SELECT" ON storage.objects;
CREATE POLICY "Receipts Storage SELECT" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT private.get_auth_family_id()::text)
);

-- 2.2 Política INSERT: Permitir carga solo en la carpeta asignada a la familia del usuario (Sin Upsert / No Sobrescribir)
DROP POLICY IF EXISTS "Receipts Storage INSERT" ON storage.objects;
CREATE POLICY "Receipts Storage INSERT" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT private.get_auth_family_id()::text)
);

-- 2.3 Ausencia de políticas UPDATE y DELETE para los comprobantes del bucket receipts
-- (Al estar RLS habilitado y no crearse políticas UPDATE/DELETE, el cliente authenticated no puede modificar ni borrar comprobantes)
DROP POLICY IF EXISTS "Receipts Storage UPDATE" ON storage.objects;
DROP POLICY IF EXISTS "Receipts Storage DELETE" ON storage.objects;

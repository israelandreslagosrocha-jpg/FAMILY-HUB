-- ============================================================================
-- MIGRACIÓN 00006: CONFIGURACIÓN DE STORAGE BUCKET 'RECEIPTS' Y POLÍTICAS RLS
-- ============================================================================

-- 1. REGISTRO DEL BUCKET PRIVADO 'RECEIPTS' EN STORAGE.BUCKETS
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
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2.1 Política SELECT: Permitir lectura solo si el primer segmento del path coincide con la familia del usuario
DROP POLICY IF EXISTS "Receipts Storage SELECT" ON storage.objects;
CREATE POLICY "Receipts Storage SELECT" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT private.get_auth_family_id()::text)
);

-- 2.2 Política INSERT: Permitir carga solo en la carpeta asignada a la familia del usuario
DROP POLICY IF EXISTS "Receipts Storage INSERT" ON storage.objects;
CREATE POLICY "Receipts Storage INSERT" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = (SELECT private.get_auth_family_id()::text)
);

-- 2.3 Bloqueo Estricto de UPDATE y DELETE directo para clientes (Preservar trazabilidad del comprobante)
DROP POLICY IF EXISTS "Receipts Storage UPDATE" ON storage.objects;
DROP POLICY IF EXISTS "Receipts Storage DELETE" ON storage.objects;

REVOKE UPDATE, DELETE ON storage.objects FROM PUBLIC, authenticated;

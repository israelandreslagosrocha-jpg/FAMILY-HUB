import { supabase } from './supabaseClient'

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/**
 * Servicio desacoplado de Almacenamiento en Supabase Storage (Bucket 'receipts')
 */
export const storageService = {
  /**
   * Genera un path único e inmutable ({family_id}/{YYYY}/{MM}/{uuid}.{ext})
   * y sube la imagen sin permitir sobrescritura (upsert = false).
   */
  async uploadReceiptFile(file: File | Blob, familyId: string, extension: string = 'png'): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const fileUuid = crypto.randomUUID()

    const storagePath = `${familyId}/${year}/${month}/${fileUuid}.${extension}`

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false // Garantía de no sobrescritura
      })

    if (error) {
      throw new Error(`Error al subir comprobante a Storage: ${error.message}`)
    }

    return data.path
  },

  /**
   * Genera una URL firmada temporal de lectura privada para previsualización en UI con caché en memoria.
   */
  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!storagePath) return ''
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:')) {
      return storagePath
    }

    // Verificar si existe en caché vigente
    const cached = signedUrlCache.get(storagePath)
    const now = Date.now()
    if (cached && cached.expiresAt > now + 60000) { // Margen de 1 minuto
      return cached.url
    }

    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(storagePath, expiresInSeconds)

      if (error || !data?.signedUrl) {
        console.warn(`⚠️ Error al generar URL firmada para ${storagePath}:`, error?.message)
        return ''
      }

      signedUrlCache.set(storagePath, {
        url: data.signedUrl,
        expiresAt: now + (expiresInSeconds * 1000)
      })

      return data.signedUrl
    } catch (err: any) {
      console.warn('⚠️ Excepción al generar URL firmada:', err?.message)
      return ''
    }
  }
}


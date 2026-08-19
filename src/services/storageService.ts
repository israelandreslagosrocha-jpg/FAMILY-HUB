import { supabase } from './supabaseClient'

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
   * Genera una URL firmada temporal de lectura privada para previsualización en UI.
   */
  async getSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(storagePath, expiresInSeconds)

    if (error || !data?.signedUrl) {
      throw new Error(`Error al generar URL firmada de la boleta: ${error?.message || 'URL no generada'}`)
    }

    return data.signedUrl
  }
}

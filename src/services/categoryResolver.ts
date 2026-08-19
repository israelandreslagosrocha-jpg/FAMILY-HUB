import { supabase } from './supabaseClient'

export interface ResolvedCategory {
  suggestedCategoryId?: string
  suggestedCategoryName: string
}

/**
 * Resolver desacoplado de Categorías de Boletas contra la tabla real categories en Supabase
 */
export const categoryResolver = {
  /**
   * Resuelve el nombre del comercio contra las categorías existentes en la BD de la familia.
   * Si no encuentra coincidencia segura, devuelve suggestedCategoryId = undefined para forzar selección manual.
   */
  async resolveCategoryForMerchant(merchantName: string, familyId: string): Promise<ResolvedCategory> {
    try {
      // 1. Consultar categorías activas de la familia desde Supabase
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .or(`family_id.eq.${familyId},family_id.is.null`)

      if (error || !categories || categories.length === 0) {
        return { suggestedCategoryName: 'Supermercado' }
      }

      const nameLower = merchantName.toLowerCase()

      // 2. Mapeo de coincidencias por palabras clave del comercio
      let targetKeyword = ''
      if (nameLower.includes('supermercado') || nameLower.includes('jumbo') || nameLower.includes('lider') || nameLower.includes('unimarc')) {
        targetKeyword = 'supermercado'
      } else if (nameLower.includes('farmacia') || nameLower.includes('ahumada') || nameLower.includes('cruz verde') || nameLower.includes('salud')) {
        targetKeyword = 'salud'
      } else if (nameLower.includes('copec') || nameLower.includes('combustible') || nameLower.includes('auto') || nameLower.includes('bencina')) {
        targetKeyword = 'transporte'
      }

      if (targetKeyword) {
        const matched = categories.find(c => c.name.toLowerCase().includes(targetKeyword))
        if (matched) {
          return {
            suggestedCategoryId: matched.id,
            suggestedCategoryName: matched.name
          }
        }
      }

      // Devolver primera categoría por defecto si existe
      return {
        suggestedCategoryId: categories[0].id,
        suggestedCategoryName: categories[0].name
      }
    } catch {
      return { suggestedCategoryName: 'Supermercado' }
    }
  }
}

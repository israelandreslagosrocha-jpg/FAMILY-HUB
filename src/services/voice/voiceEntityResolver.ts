/**
 * Resolvedor de Entidades de Voz para FAMILY-HUB
 * Vincula menciones de voz con miembros familiares, categorías de Supabase y cuentas reales.
 */

import type { FamilyMember, ParsedEntities } from '../../types'

const KNOWN_CATEGORIES = [
  {
    name: 'Supermercado y Alimentación',
    icon: '🛒',
    color: '#22c55e',
    keywords: ['supermercado', 'jumbo', 'lider', 'unimarc', 'pan', 'comida', 'almuerzo', 'cena', 'mercadería', 'almacen']
  },
  {
    name: 'Servicios y Cuentas',
    icon: '💡',
    color: '#ef4444',
    keywords: ['luz', 'electricidad', 'enel', 'cge', 'agua', 'aguas andinas', 'esval', 'gas', 'gasco', 'lipigas', 'abastible', 'internet', 'vtr', 'movistar', 'entel', 'claro', 'wom', 'gasto común', 'gasto comun']
  },
  {
    name: 'Transporte y Combustible',
    icon: '🚗',
    color: '#f59e0b',
    keywords: ['bencina', 'combustible', 'copec', 'shell', 'petrobras', 'tag', 'peaje', 'uber', 'didi', 'estacionamiento', 'auto', 'vehiculo']
  },
  {
    name: 'Salud y Medicina',
    icon: '💊',
    color: '#ec4899',
    keywords: ['farmacia', 'ahumada', 'cruz verde', 'salcobrand', 'doctor', 'medico', 'dentista', 'remedio', 'consulta', 'clinica', 'hospital', 'psicologo']
  },
  {
    name: 'Educación y Colegio',
    icon: '🎓',
    color: '#8b5cf6',
    keywords: ['colegio', 'escuela', 'cuota', 'matricula', 'mensualidad', 'cuaderno', 'utiles', 'taller', 'universidad', 'instituto']
  },
  {
    name: 'Entretención & Salidas',
    icon: '🍕',
    color: '#3b82f6',
    keywords: ['pizza', 'cine', 'salida', 'restaurante', 'mcdonalds', 'sushi', 'helado', 'parque', 'juegos', 'cumpleaños', 'carrete']
  },
  {
    name: 'Honorarios & Partituras',
    icon: '🎼',
    color: '#10b981',
    keywords: ['partitura', 'musica', 'honorario', 'produccion', 'estudio', 'ensayo', 'clase']
  }
]

const KNOWN_ACCOUNTS = [
  { name: 'BancoEstado', keywords: ['bancoestado', 'banco estado', 'cuentarut', 'cuenta rut', 'rut'] },
  { name: 'Banco Santander', keywords: ['santander', 'banco santander'] },
  { name: 'Banco de Chile', keywords: ['banco de chile', 'banco chile', 'edwards'] },
  { name: 'Banco BCI', keywords: ['bci', 'mach'] },
  { name: 'Banco Falabella', keywords: ['falabella', 'cmr'] },
  { name: 'Efectivo / Billetera', keywords: ['efectivo', 'billetera', 'plata en mano', 'mano'] },
  { name: 'Cuenta Ahorro', keywords: ['ahorro', 'cuenta de ahorro'] }
]

export const voiceEntityResolver = {
  /**
   * Resuelve miembros, categorías y cuentas dentro del texto normalizado
   */
  resolve(cleanText: string, members: FamilyMember[] = []): Partial<ParsedEntities> {
    const resolved: Partial<ParsedEntities> = {}

    // 1. Resolver Miembro del Hogar
    const member = this.resolveMember(cleanText, members)
    if (member) {
      resolved.memberId = member.id
      resolved.memberName = member.name
    }

    // 2. Resolver Categoría de Gasto / Tarea
    const category = this.resolveCategory(cleanText)
    if (category) {
      resolved.categoryName = category.name
      resolved.categoryIcon = category.icon
      resolved.categoryColor = category.color
    }

    // 3. Resolver Cuentas de Transferencia
    const accounts = this.resolveTransferAccounts(cleanText)
    if (accounts.source) resolved.sourceAccount = accounts.source
    if (accounts.destination) resolved.destinationAccount = accounts.destination

    return resolved
  },

  /**
   * Identifica qué integrante familiar se menciona por nombre o parentesco ("papá", "mamá", etc.)
   */
  resolveMember(text: string, members: FamilyMember[]): FamilyMember | undefined {
    if (!members || members.length === 0) return undefined

    const t = text.toLowerCase()

    // Búsqueda por nombre directo
    for (const m of members) {
      if (t.includes(m.name.toLowerCase())) {
        return m
      }
    }

    // Búsqueda por parentesco / rol
    if (/(?:^|[\s,])(?:papá|papa|padre|esposo)(?:[\s,]|$|[.,])/i.test(t)) {
      return members.find(m => m.role?.toLowerCase().includes('papá') || m.role?.toLowerCase().includes('padre') || m.name.toLowerCase().includes('israel')) || members[0]
    }

    if (/(?:^|[\s,])(?:mamá|mama|madre|esposa|señora)(?:[\s,]|$|[.,])/i.test(t)) {
      return members.find(m => m.role?.toLowerCase().includes('mamá') || m.role?.toLowerCase().includes('madre') || m.role?.toLowerCase().includes('esposa') || m.name.toLowerCase().includes('naty') || m.name.toLowerCase().includes('maría'))
    }

    if (/(?:^|[\s,])(?:hijo|hija|niño|niña|pequeño)(?:[\s,]|$|[.,])/i.test(t)) {
      return members.find(m => m.role?.toLowerCase().includes('hijo') || m.role?.toLowerCase().includes('hija'))
    }

    return undefined
  },

  /**
   * Identifica la categoría más adecuada según palabras clave
   */
  resolveCategory(text: string): { name: string; icon: string; color: string } | undefined {
    const t = text.toLowerCase()

    for (const cat of KNOWN_CATEGORIES) {
      for (const kw of cat.keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i')
        if (regex.test(t)) {
          return { name: cat.name, icon: cat.icon, color: cat.color }
        }
      }
    }

    return undefined
  },

  /**
   * Identifica cuentas de origen y destino en intenciones de transferencia
   * Ej: "Transferí 100 mil de BancoEstado a efectivo"
   */
  resolveTransferAccounts(text: string): { source?: string; destination?: string } {
    const t = text.toLowerCase()
    let source: string | undefined = undefined
    let destination: string | undefined = undefined

    // Patrón "de [cuenta1] a [cuenta2]" o "desde [cuenta1] a [cuenta2]"
    const transferMatch = t.match(/(?:desde|de)\s+([a-záéíóú\s]+?)\s+a\s+([a-záéíóú\s]+)/i)
    if (transferMatch) {
      const rawSource = transferMatch[1].trim()
      const rawDest = transferMatch[2].trim()

      for (const acc of KNOWN_ACCOUNTS) {
        if (acc.keywords.some(kw => rawSource.includes(kw))) {
          source = acc.name
        }
        if (acc.keywords.some(kw => rawDest.includes(kw))) {
          destination = acc.name
        }
      }
    }

    // Fallback individual si no hubo match exacto
    if (!source || !destination) {
      for (const acc of KNOWN_ACCOUNTS) {
        if (!source && acc.keywords.some(kw => t.includes(`de ${kw}`) || t.includes(`desde ${kw}`))) {
          source = acc.name
        }
        if (!destination && acc.keywords.some(kw => t.includes(`a ${kw}`) || t.includes(`al ${kw}`))) {
          destination = acc.name
        }
      }
    }

    return { source, destination }
  }
}

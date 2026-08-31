/**
 * Resolvedor Determinista y Extensible de Intenciones de Voz para FAMILY-HUB
 */

import { voiceNormalizer } from './voiceNormalizer'
import { voiceEntityResolver } from './voiceEntityResolver'
import type { VoiceParsedResult, ParsedEntities } from '../../types/voice'
import type { FamilyMember } from '../../types'
import { getChileTodayString } from '../../utils/dateUtils'

export const voiceIntentResolver = {
  /**
   * Resuelve el transcript en una intención tipada con entidades validadas
   */
  resolve(rawTranscript: string, members: FamilyMember[] = []): VoiceParsedResult {
    const raw = rawTranscript.trim()
    if (!raw || raw.length < 3) {
      return this.buildUnknown(raw, raw, 'Comando de voz no reconocido o demasiado breve.')
    }

    const norm = voiceNormalizer.normalize(raw)
    const text = norm.cleanText
    const entities: ParsedEntities = {
      amount: norm.extractedAmount,
      currency: 'CLP',
      date: norm.extractedDate || getChileTodayString(),
      time: norm.extractedTime,
      relativeOffsetMinutes: norm.relativeOffsetMinutes,
      recurrence: norm.extractedRecurrence || 'never',
      recurrenceDaysOfWeek: norm.extractedDaysOfWeek,
      scope: 'family'
    }

    // Resolver entidades contextuales (miembro, categoría, cuentas)
    const resolvedEntities = voiceEntityResolver.resolve(text, members)
    Object.assign(entities, resolvedEntities)

    // ========================================================================
    // 1. INTENCIÓN: RECORDATORIO (reminder.create)
    // "Recuérdame pagar el colegio en cinco días", "Recuérdame el dentista media hora antes"
    // ========================================================================
    if (/(?:^|[\s,])(?:recu[eé]rdame|recuerdame|avisame|av[íi]same|alarma|pon\s+una\s+alarma)(?:[\s,]|$|[.,])/i.test(text)) {
      const cleanTitle = this.cleanReminderTitle(raw)
      entities.title = cleanTitle || 'Recordatorio'
      entities.targetType = this.inferReminderTargetType(text)

      // Comprobar campos faltantes
      const missingFields: string[] = []
      if (!entities.date && !norm.relativeOffsetMinutes) {
        missingFields.push('date')
      }

      return {
        intent: 'reminder.create',
        confidence: 0.95,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: missingFields.length > 0,
        missingFields,
        proposalTitle: '🔔 Nuevo Recordatorio',
        proposalSummary: `Recordar: "${entities.title}" para el ${entities.date || 'día indicado'} ${entities.time ? 'a las ' + entities.time : ''}`
      }
    }

    // ========================================================================
    // 2. INTENCIÓN: RESPONSABILIDAD RECURRENTE (responsibility.create)
    // "Papá sacará la basura todos los lunes", "Mamá se encarga del almuerzo cada sábado"
    // ========================================================================
    if (
      (text.includes('se encarga') || text.includes('se encarga de') || text.includes('sacará') || text.includes('sacara') || text.includes('hará') || text.includes('hara') || text.includes('hacer') || text.includes('limpiar') || text.includes('cocinar')) &&
      norm.extractedRecurrence === 'weekly' &&
      entities.memberId
    ) {
      const cleanTitle = this.cleanResponsibilityTitle(raw)
      entities.title = cleanTitle || 'Responsabilidad familiar'

      return {
        intent: 'responsibility.create',
        confidence: 0.92,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: false,
        missingFields: [],
        proposalTitle: '📋 Nueva Responsabilidad del Hogar',
        proposalSummary: `${entities.memberName || 'Miembro'} se encargará de "${entities.title}" todas las semanas`
      }
    }

    // ========================================================================
    // 3. INTENCIÓN: TRANSFERENCIA BANCARIA (finance.transfer.create)
    // "Transferí 100 mil de BancoEstado a efectivo", "Traspasar 50 lucas a la cuenta de ahorro"
    // ========================================================================
    if (/(?:^|[\s,])(?:transfer[ií]|transferir|traspasar|traspas[eé]|mov[ií]|mover)(?:[\s,]|$|[.,])/i.test(text) && entities.amount) {
      entities.title = `Transferencia de fondos`
      const missingFields: string[] = []
      if (!entities.amount) missingFields.push('amount')

      return {
        intent: 'finance.transfer.create',
        confidence: 0.94,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: !entities.sourceAccount || !entities.destinationAccount,
        missingFields,
        proposalTitle: '🔄 Propuesta de Transferencia',
        proposalSummary: `Mover $${entities.amount?.toLocaleString('es-CL')} desde ${entities.sourceAccount || 'Cuenta origen'} hacia ${entities.destinationAccount || 'Cuenta destino'}`
      }
    }

    // ========================================================================
    // 4. INTENCIÓN: INGRESO FINANCIERO (finance.income.create)
    // "Me pagaron 200 mil de honorarios", "Recibí 50 lucas"
    // ========================================================================
    if (/(?:^|[\s,])(?:me\s+pagaron|recib[ií]|ingreso|sueldo|honorarios?|dep[oó]sito|deposito|venta)(?:[\s,]|$|[.,])/i.test(text) && entities.amount) {
      entities.title = this.cleanIncomeTitle(raw) || 'Ingreso registrado'
      return {
        intent: 'finance.income.create',
        confidence: 0.93,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: false,
        missingFields: [],
        proposalTitle: '💰 Propuesta de Ingreso',
        proposalSummary: `Ingreso de $${entities.amount?.toLocaleString('es-CL')} por concepto de "${entities.title}"`
      }
    }

    // ========================================================================
    // 5. INTENCIÓN: GASTO FINANCIERO (finance.expense.create)
    // "Pagué 48 mil de luz", "Gasté 15 lucas en bencina", "Compré remedios por 12 mil"
    // ========================================================================
    if (
      (/(?:^|[\s,])(?:pagu[eé]|pago|gast[eé]|gasto|compr[eé]|compra|cuenta\s+de)(?:[\s,]|$|[.,])/i.test(text) && entities.amount) ||
      (entities.amount && (entities.categoryName || text.includes('luz') || text.includes('bencina') || text.includes('supermercado') || text.includes('colegio')))
    ) {
      entities.title = this.cleanExpenseTitle(raw) || entities.categoryName || 'Gasto registrado'
      return {
        intent: 'finance.expense.create',
        confidence: 0.95,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: !entities.categoryName,
        missingFields: [],
        proposalTitle: '💸 Propuesta de Gasto Familiar',
        proposalSummary: `Gasto de $${entities.amount?.toLocaleString('es-CL')} en ${entities.categoryName || 'Gasto General'} (${entities.title})`
      }
    }

    // ========================================================================
    // 6. INTENCIÓN: EVENTO DE CALENDARIO (calendar.event.create)
    // "El viernes tenemos reunión del colegio a las siete", "Tenemos dentista mañana a las 4"
    // ========================================================================
    if (
      (/(?:^|[\s,])(?:tenemos|reuni[oó]n|reunion|cita|doctor|dentista|cumpleaños|cumpleanos|junta|viaje|evento|visita)(?:[\s,]|$|[.,])/i.test(text) && (entities.time || norm.extractedDate)) ||
      (entities.time && text.includes('tenemos'))
    ) {
      entities.title = this.cleanEventTitle(raw) || 'Compromiso familiar'
      entities.time = entities.time || '10:00'

      return {
        intent: 'calendar.event.create',
        confidence: 0.92,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: false,
        missingFields: [],
        proposalTitle: '📅 Nuevo Evento en Calendario',
        proposalSummary: `Evento: "${entities.title}" para el ${entities.date} a las ${entities.time}`
      }
    }

    // ========================================================================
    // 7. INTENCIÓN: TAREA (task.create)
    // "Comprar pan mañana", "Sacar la basura", "Lavar el auto", "Revisar tareas de los niños"
    // ========================================================================
    if (/(?:^|[\s,])(?:comprar|sacar|lavar|ordenar|limpiar|hacer|llevar|buscar|revisar|llamar|arreglar|tarea|recoger)(?:[\s,]|$|[.,])/i.test(text)) {
      entities.title = this.cleanTaskTitle(raw) || 'Nueva tarea'

      // Detectar caso ambiguo (ej. "Comprar cosas")
      if (text === 'comprar cosas' || text === 'comprar algo' || text === 'hacer cosas') {
        return {
          intent: 'ambiguous',
          confidence: 0.5,
          rawTranscript: raw,
          normalizedTranscript: text,
          entities,
          requiresDisambiguation: true,
          missingFields: ['title', 'category'],
          proposalTitle: '❓ Instrucción Incompleta',
          proposalSummary: 'Especifica qué deseas comprar o realizar para crear la tarea.'
        }
      }

      return {
        intent: 'task.create',
        confidence: 0.90,
        rawTranscript: raw,
        normalizedTranscript: text,
        entities,
        requiresDisambiguation: false,
        missingFields: [],
        proposalTitle: '✅ Nueva Tarea Familiar',
        proposalSummary: `Tarea: "${entities.title}" con fecha límite ${entities.date}`
      }
    }

    // ========================================================================
    // 8. DESCONOCIDO O INCOMPLETO (unknown)
    // ========================================================================
    return this.buildUnknown(raw, text, 'No pude identificar una tarea, evento, gasto o recordatorio en tu instrucción.')
  },

  cleanReminderTitle(raw: string): string {
    return raw
      .replace(/^[\s,]*(?:recu[eé]rdame|recuerdame|avisame|av[íi]same|alarma|pon una alarma|que tengo que|de)\s+/i, '')
      .replace(/\s+(?:en\s+\d+\s+d[íi]as|en\s+[a-z]+\s+d[íi]as|mañana|el\s+viernes|el\s+[a-z]+|a\s+las\s+\d+|a\s+las\s+[a-z]+|media\s+hora\s+antes|1\s+hora\s+antes|\d+\s+minutos?\s+antes)[\s,.]*$/i, '')
      .trim()
  },

  cleanExpenseTitle(raw: string): string {
    return raw
      .replace(/^[\s,]*(?:pagu[eé]|pago|gast[eé]|gasto|compr[eé]|compra)\s+/i, '')
      .replace(/\s+(?:de\s+\d+|por\s+\d+|\$\d+|\d+\s+mil|\d+\s+lucas|[a-z]+\s+mil|[a-z]+\s+lucas)[\s,.]*/gi, '')
      .trim()
  },

  cleanIncomeTitle(raw: string): string {
    return raw
      .replace(/^[\s,]*(?:me\s+pagaron|recib[ií]|ingreso\s+de)\s+/i, '')
      .replace(/\s+(?:de\s+\d+|por\s+\d+|\$\d+|\d+\s+mil|\d+\s+lucas|[a-z]+\s+mil|[a-z]+\s+lucas)[\s,.]*/gi, '')
      .trim()
  },

  cleanEventTitle(raw: string): string {
    return raw
      .replace(/^[\s,]*(?:el\s+[a-z]+\s+tenemos|tenemos|hay\s+que\s+ir\s+a|cita\s+con|reuni[oó]n\s+de)\s+/i, '')
      .replace(/\s+(?:el\s+[a-z]+|mañana|a\s+las\s+\d+|a\s+las\s+[a-z]+|de\s+la\s+tarde|de\s+la\s+mañana)[\s,.]*$/gi, '')
      .trim()
  },

  cleanTaskTitle(raw: string): string {
    return raw
      .replace(/\s+(?:mañana|pasado\s+mañana|el\s+[a-z]+|hoy|a\s+las\s+\d+|a\s+las\s+[a-z]+)[\s,.]*$/gi, '')
      .trim()
  },

  cleanResponsibilityTitle(raw: string): string {
    return raw
      .replace(/^[\s,]*(?:papá|papa|mamá|mama|israel|naty)\s+(?:se\s+encarga\s+de|se\s+encargará\s+de|sacar[aá]|har[aá]|limpiar[aá])\s+/i, '')
      .replace(/\s+(?:todos\s+los\s+[a-z]+|cada\s+[a-z]+|todas\s+las\s+semanas)[\s,.]*$/gi, '')
      .trim()
  },

  inferReminderTargetType(text: string): ParsedEntities['targetType'] {
    if (text.includes('tarea')) return 'task'
    if (text.includes('dentista') || text.includes('reunión') || text.includes('reunion') || text.includes('evento') || text.includes('cita')) return 'event'
    if (text.includes('pagar') || text.includes('cuota') || text.includes('cuenta')) return 'expense'
    return 'standalone'
  },

  buildUnknown(raw: string, normalized: string, summary: string): VoiceParsedResult {
    return {
      intent: 'unknown',
      confidence: 0.1,
      rawTranscript: raw,
      normalizedTranscript: normalized,
      entities: { currency: 'CLP', scope: 'family' },
      requiresDisambiguation: false,
      missingFields: [],
      proposalTitle: '🤔 No se entendió el comando',
      proposalSummary: summary
    }
  }
}

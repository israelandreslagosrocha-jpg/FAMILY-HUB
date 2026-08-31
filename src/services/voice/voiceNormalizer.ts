/**
 * Normalizador de Voz en Español Chileno para FAMILY-HUB
 * Transforma modismos, expresiones numéricas, horas y fechas relativas a valores normalizados.
 */

import { getChileTodayString } from '../../utils/dateUtils'

export interface NormalizedVoiceData {
  cleanText: string
  extractedAmount?: number
  extractedDate?: string // YYYY-MM-DD
  extractedTime?: string // HH:mm
  relativeOffsetMinutes?: number
  extractedRecurrence?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  extractedDaysOfWeek?: number[]
}

const NUMBER_WORDS: Record<string, number> = {
  'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 'once': 11,
  'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15, 'dieciséis': 16,
  'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20,
  'veintiuno': 21, 'veintidós': 22, 'veintitrés': 23, 'veinticuatro': 24,
  'veinticinco': 25, 'veintiséis': 26, 'veintisiete': 27, 'veintiocho': 28,
  'veintinueve': 29, 'treinta': 30, 'cuarenta': 40, 'cincuenta': 50,
  'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90,
  'cien': 100, 'ciento': 100, 'doscientos': 200, 'trescientos': 300,
  'cuatrocientos': 400, 'quinientos': 500, 'seiscientos': 600,
  'setecientos': 700, 'ochocientos': 800, 'novecientos': 900,
  'mil': 1000, 'millón': 1000000, 'millones': 1000000, 'luca': 1000, 'lucas': 1000
}

const DAYS_OF_WEEK_MAP: Record<string, number> = {
  'domingo': 0,
  'lunes': 1,
  'martes': 2,
  'miércoles': 3,
  'miercoles': 3,
  'jueves': 4,
  'viernes': 5,
  'sábado': 6,
  'sabado': 6
}

export const voiceNormalizer = {
  /**
   * Procesa y normaliza un texto en lenguaje natural de Chile
   */
  normalize(rawText: string): NormalizedVoiceData {
    const text = rawText.trim().toLowerCase()
    let cleanText = text
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const extractedAmount = this.extractAmount(cleanText)
    const extractedDate = this.extractDate(cleanText)
    const extractedTime = this.extractTime(cleanText)
    const relativeOffsetMinutes = this.extractRelativeOffset(cleanText)
    const { recurrence, daysOfWeek } = this.extractRecurrence(cleanText)

    return {
      cleanText,
      extractedAmount,
      extractedDate,
      extractedTime,
      relativeOffsetMinutes,
      extractedRecurrence: recurrence,
      extractedDaysOfWeek: daysOfWeek
    }
  },

  /**
   * Extrae montos en pesos chilenos considerando "lucas", "mil", números escritos y signos de peso
   */
  extractAmount(text: string): number | undefined {
    // 1. Patrón: "48 lucas", "10 lucas", "100 lucas", "una luca", "dos lucas"
    const lucasMatch = text.match(/(?:^|\s)(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|treinta|cuarenta|cincuenta|cien)\s+(?:lucas|luca)(?:[\s,.]|$)/i)
    if (lucasMatch) {
      const valStr = lucasMatch[1].toLowerCase()
      const multiplier = NUMBER_WORDS[valStr] || parseInt(valStr, 10) || 1
      return multiplier * 1000
    }

    // 2. Patrón: "48 mil", "100 mil", "cuarenta y ocho mil"
    const milMatch = text.match(/(?:^|\s)(\d+|[a-záéíóú]+(?:\s+y\s+[a-záéíóú]+)?)\s+mil(?:[\s,.]|$)/i)
    if (milMatch) {
      const prefix = milMatch[1].trim()
      if (/^\d+$/.test(prefix)) {
        return parseInt(prefix, 10) * 1000
      }
      const parsedWords = this.wordsToNumber(prefix)
      if (parsedWords > 0) {
        return parsedWords * 1000
      }
    }

    // 3. Patrón: "medio millón"
    if (text.includes('medio millón') || text.includes('medio millon')) {
      return 500000
    }

    // 4. Patrón: "un millón doscientos", "1 millón", "2 millones"
    const millionMatch = text.match(/(?:^|\s)(\d+|un|dos|tres|cuatro|cinco)\s+(?:millón|millon|millones)(?:\s+(\d+|[a-záéíóú\s]+))?/i)
    if (millionMatch) {
      const baseNum = NUMBER_WORDS[millionMatch[1]] || parseInt(millionMatch[1], 10) || 1
      let restNum = 0
      if (millionMatch[2]) {
        const restStr = millionMatch[2].trim()
        if (restStr.includes('mil')) {
          restNum = (this.wordsToNumber(restStr.replace('mil', '')) || 1) * 1000
        } else {
          restNum = (NUMBER_WORDS[restStr] || parseInt(restStr, 10) || 0) * 1000
        }
      }
      return baseNum * 1000000 + restNum
    }

    // 5. Patrón numérico directo: "$48000", "48.000", "48000"
    const directNumberMatch = text.match(/(?:\$|\bpag(?:o|ué|ue)?\s+)?(\d{1,3}(?:\.\d{3})+|\d{3,9})\b/i)
    if (directNumberMatch) {
      const rawNum = directNumberMatch[1].replace(/\./g, '')
      const num = parseInt(rawNum, 10)
      if (!isNaN(num) && num >= 100) return num
    }

    return undefined
  },

  /**
   * Convierte palabras numéricas compuestas en español (ej. "cuarenta y ocho") a número
   */
  wordsToNumber(wordsStr: string): number {
    const tokens = wordsStr.toLowerCase().replace(/\by\b/g, ' ').split(/\s+/).filter(Boolean)
    let total = 0
    let current = 0

    for (const token of tokens) {
      const val = NUMBER_WORDS[token]
      if (!val) continue

      if (val === 1000) {
        current = current === 0 ? 1000 : current * 1000
        total += current
        current = 0
      } else if (val === 1000000) {
        current = current === 0 ? 1000000 : current * 1000000
        total += current
        current = 0
      } else {
        current += val
      }
    }

    return total + current
  },

  /**
   * Extrae la fecha relativa o día de la semana en zona horaria 'America/Santiago'
   */
  extractDate(text: string): string | undefined {
    const todayStr = getChileTodayString()
    const [year, month, day] = todayStr.split('-').map(Number)
    const baseDate = new Date(year, month - 1, day)

    // "hoy"
    if (/\bhoy\b/i.test(text)) {
      return todayStr
    }

    // "pasado mañana"
    if (/\bpasado\s+mañana\b/i.test(text) || /\bpasado\s+manana\b/i.test(text)) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + 2)
      return this.formatDateISO(d)
    }

    // "mañana"
    if (/\bmañana\b/i.test(text) || /\bmanana\b/i.test(text)) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + 1)
      return this.formatDateISO(d)
    }

    // "en X días" (ej. "en cinco días", "en 5 días")
    const daysInMatch = text.match(/\ben\s+(\d+|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta)\s+d[íi]as\b/i)
    if (daysInMatch) {
      const val = NUMBER_WORDS[daysInMatch[1]] || parseInt(daysInMatch[1], 10) || 0
      if (val > 0) {
        const d = new Date(baseDate)
        d.setDate(d.getDate() + val)
        return this.formatDateISO(d)
      }
    }

    // "en una semana" / "en 2 semanas"
    if (/\ben\s+(?:una|1)\s+semana\b/i.test(text)) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + 7)
      return this.formatDateISO(d)
    }

    // Días de la semana específicos: "el viernes", "este viernes", "el próximo martes", "el lunes"
    for (const [dayName, targetDayNum] of Object.entries(DAYS_OF_WEEK_MAP)) {
      const regex = new RegExp(`\\b(?:el|este|el\\s+pr[oó]ximo)\\s+${dayName}\\b`, 'i')
      if (regex.test(text)) {
        const currentDay = baseDate.getDay() // 0 = Domingo, 1 = Lunes, ...
        let diff = targetDayNum - currentDay
        if (diff <= 0) diff += 7 // Próximo día de esa semana
        const d = new Date(baseDate)
        d.setDate(d.getDate() + diff)
        return this.formatDateISO(d)
      }
    }

    return undefined
  },

  /**
   * Extrae la hora de la instrucción (ej. "a las ocho", "a las 20", "a las 7 de la tarde", "a las 7 y media")
   */
  extractTime(text: string): string | undefined {
    // "al mediodía" / "al mediodia"
    if (/\bal\s+mediod[íi]a\b/i.test(text)) {
      return '12:00'
    }

    // "en 30 minutos", "en media hora", "en 1 hora", "en dos horas"
    const inTimeMatch = text.match(/\ben\s+(\d+|media|un|una|dos|tres)\s+(minutos?|horas?)\b/i)
    if (inTimeMatch) {
      const now = new Date()
      const unit = inTimeMatch[2].toLowerCase()
      let minsToAdd = 0

      if (inTimeMatch[1] === 'media') minsToAdd = 30
      else {
        const val = NUMBER_WORDS[inTimeMatch[1]] || parseInt(inTimeMatch[1], 10) || 0
        minsToAdd = unit.startsWith('hora') ? val * 60 : val
      }

      const future = new Date(now.getTime() + minsToAdd * 60000)
      const h = String(future.getHours()).padStart(2, '0')
      const m = String(future.getMinutes()).padStart(2, '0')
      return `${h}:${m}`
    }

    // Patrón "a las X" (ej. "a las ocho", "a las 20", "a las 7 de la tarde", "a las 7 y media", "a las 19:30")
    const atTimeMatch = text.match(/\ba\s+las\s+(\d{1,2}(?::\d{2})?|[a-záéíóú]+)(?:\s+(?:y\s+media|y\s+cuarto))?(?:\s+de\s+la\s+(mañana|tarde|noche))?/i)
    if (atTimeMatch) {
      let rawHourStr = atTimeMatch[1].toLowerCase()
      let minutes = '00'
      const isHalf = text.includes('y media')
      const isQuarter = text.includes('y cuarto')
      const period = atTimeMatch[2] ? atTimeMatch[2].toLowerCase() : null

      if (isHalf) minutes = '30'
      if (isQuarter) minutes = '15'

      if (rawHourStr.includes(':')) {
        const parts = rawHourStr.split(':')
        rawHourStr = parts[0]
        minutes = parts[1]
      }

      let hourNum = NUMBER_WORDS[rawHourStr] || parseInt(rawHourStr, 10)
      if (isNaN(hourNum)) return undefined

      // Ajuste de período (tarde/noche)
      if (period === 'tarde' || period === 'noche') {
        if (hourNum < 12) hourNum += 12
      } else if (period === 'mañana' && hourNum === 12) {
        hourNum = 0
      } else if (!period) {
        // Heurística de horario familiar: "a las siete" -> 19:00 si parece cena/reunión, o 07:00
        if (hourNum >= 1 && hourNum <= 6) hourNum += 12 // 1..6 suele ser de la tarde
        if (hourNum === 7 && (text.includes('reunión') || text.includes('reunion') || text.includes('junta') || text.includes('pagar'))) {
          hourNum = 19
        }
      }

      return `${String(hourNum).padStart(2, '0')}:${minutes}`
    }

    return undefined
  },

  /**
   * Extrae antelación relativa para recordatorios (ej. "media hora antes", "1 hora antes", "10 minutos antes")
   */
  extractRelativeOffset(text: string): number | undefined {
    if (text.includes('media hora antes') || text.includes('30 minutos antes') || text.includes('30 min antes')) {
      return -30
    }
    if (text.includes('1 hora antes') || text.includes('una hora antes')) {
      return -60
    }
    if (text.includes('2 horas antes') || text.includes('dos horas antes')) {
      return -120
    }
    if (text.includes('1 día antes') || text.includes('un día antes') || text.includes('un dia antes')) {
      return -1440
    }
    const customMinMatch = text.match(/(\d+)\s+minutos?\s+antes/i)
    if (customMinMatch) {
      return -parseInt(customMinMatch[1], 10)
    }
    return undefined
  },

  /**
   * Extrae reglas de recurrencia (ej. "todos los lunes", "cada martes", "diariamente")
   */
  extractRecurrence(text: string): { recurrence?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly'; daysOfWeek?: number[] } {
    if (text.includes('todos los días') || text.includes('cada día') || text.includes('diariamente')) {
      return { recurrence: 'daily' }
    }

    for (const [dayName, dayNum] of Object.entries(DAYS_OF_WEEK_MAP)) {
      const regex = new RegExp(`(?:todos\\s+los|cada)\\s+${dayName}`, 'i')
      if (regex.test(text)) {
        return { recurrence: 'weekly', daysOfWeek: [dayNum] }
      }
    }

    if (text.includes('todas las semanas') || text.includes('semanalmente')) {
      return { recurrence: 'weekly' }
    }

    if (text.includes('todos los meses') || text.includes('mensualmente')) {
      return { recurrence: 'monthly' }
    }

    return { recurrence: 'never' }
  },

  formatDateISO(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}

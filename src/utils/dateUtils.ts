/**
 * Módulo de utilidades de fecha y hora para FAMILY-HUB
 * Todas las fechas y horas se calculan en la zona horaria oficial de Chile ('America/Santiago')
 */

const CHILE_TIMEZONE = 'America/Santiago'

/**
 * Retorna la fecha actual en Chile en formato YYYY-MM-DD
 */
export function getChileTodayString(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(now) // 'YYYY-MM-DD'
}

/**
 * Retorna la hora actual en Chile en formato HH:mm:ss o HH:mm
 */
export function getChileTimeString(includeSeconds = true): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false
  })
  return formatter.format(now)
}

/**
 * Retorna la fecha actual en Chile formateada para lectura (ej. "Lunes 24 de Agosto")
 */
export function getChileFormattedDate(): string {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIMEZONE, weekday: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIMEZONE, day: 'numeric' }).format(now)
  const month = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIMEZONE, month: 'long' }).format(now)
  
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1)
  
  return `${capWeekday} ${day} de ${capMonth}`
}

/**
 * Convierte un Date o string ISO a formato de fecha local YYYY-MM-DD en Chile
 */
export function toChileDateString(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return getChileTodayString()
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(d)
}

/**
 * Extrae la hora en formato HH:mm garantizando el horario de pared agendado por la familia (ej. "09:20")
 */
export function parseTimeString(timeInput?: string | null): string {
  if (!timeInput) return '00:00'
  const trimmed = timeInput.trim()
  
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.slice(0, 5)

  // Extraer la hora HH:mm literal de la marca de tiempo (previene desplazamientos por huso horario UTC)
  const match = trimmed.match(/(?:T|\s)(\d{2}:\d{2})/)
  if (match && match[1]) {
    return match[1]
  }

  return '00:00'
}

/**
 * Extrae la fecha en formato YYYY-MM-DD garantizando la fecha agendada por la familia (ej. "2026-08-25")
 */
export function parseDateString(dateInput?: string | null): string {
  if (!dateInput) return getChileTodayString()
  const trimmed = dateInput.trim()
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const match = trimmed.match(/(\d{4}-\d{2}-\d{2})/)
  if (match && match[1]) {
    return match[1]
  }

  return getChileTodayString()
}

/**
 * Construye un string ISO limpio en formato local YYYY-MM-DDTHH:mm:ss para enviar a Supabase
 */
export function buildChileISOString(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00`
}



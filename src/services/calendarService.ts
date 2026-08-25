import { supabase } from './supabaseClient'
import type { CalendarEvent, CalendarRecurrence } from '../types'
import { parseDateString, parseTimeString } from '../utils/dateUtils'

export interface CreateEventPayload {
  title: string
  description?: string
  startTime: string // ISO string "2026-08-19T10:30:00Z"
  endTime?: string  // ISO string "2026-08-19T11:30:00Z"
  isAllDay: boolean
  isFamilyEvent: boolean
  categoryId?: string
  memberIds: string[]
  recurrenceFrequency?: CalendarRecurrence
  recurrenceDaysOfWeek?: number[]
  recurrenceDayOfMonth?: number
  recurrenceMonthlyPattern?: 'FIRST_MONDAY' | 'LAST_DAY'
  recurrenceEndDate?: string
}

export const calendarService = {
  /**
   * Obtiene todos los eventos de la familia autenticada desde Supabase
   */
  async getEvents(): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true })

    if (error) {
      console.error('❌ Error al obtener eventos de Supabase:', error.message)
      throw error
    }

    if (!data) return []

    return data.map((item: any) => {
      const eventDate = parseDateString(item.start_time)
      const startTime = parseTimeString(item.start_time)

      let endTime: string | undefined = undefined
      if (item.end_time) {
        endTime = parseTimeString(item.end_time)
      }

      const memberIds = item.event_members ? item.event_members.map((em: any) => em.member_id) : []

      let recurrence: CalendarRecurrence = 'never'
      if (item.recurrence_rules && item.recurrence_rules.frequency) {
        recurrence = item.recurrence_rules.frequency as CalendarRecurrence
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        eventDate,
        startTime,
        endTime,
        isAllDay: item.is_all_day,
        category: item.categories?.name || 'General',
        color: item.categories?.color || '#3b82f6',
        memberIds,
        isFamilyEvent: item.is_family_event,
        recurrence
      }
    })
  },

  /**
   * Crea un evento de forma atómica e inquebrantable llamando a la RPC transaccional
   */
  async createEvent(payload: CreateEventPayload): Promise<string> {
    const { data: eventId, error } = await supabase.rpc('create_family_event', {
      p_title: payload.title,
      p_description: payload.description || null,
      p_start_time: payload.startTime,
      p_end_time: payload.endTime || null,
      p_is_all_day: payload.isAllDay,
      p_is_family_event: payload.isFamilyEvent,
      p_category_id: payload.categoryId || null,
      p_member_ids: payload.memberIds,
      p_recurrence_frequency: payload.recurrenceFrequency !== 'never' ? payload.recurrenceFrequency : null,
      p_recurrence_days_of_week: payload.recurrenceDaysOfWeek || null,
      p_recurrence_day_of_month: payload.recurrenceDayOfMonth || null,
      p_recurrence_monthly_pattern: payload.recurrenceMonthlyPattern || null,
      p_recurrence_end_date: payload.recurrenceEndDate || null
    })

    if (error) {
      console.error('❌ Error en RPC create_family_event:', error.message)
      throw error
    }

    return eventId
  },

  /**
   * Elimina un evento (borra en cascada sus event_members y limpia su recurrence_rule si aplica)
   */
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('❌ Error al eliminar evento de Supabase:', error.message)
      throw error
    }
  }
}

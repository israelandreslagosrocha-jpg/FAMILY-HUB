import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CalendarEvent, TaskItem, CalendarViewType, ViewMode, FamilyMember } from '../types'
import { mockMembers } from '../mocks/familyData'
import { calendarService, type CreateEventPayload } from '../services/calendarService'
import { supabase } from '../services/supabaseClient'
import { getChileTodayString } from '../utils/dateUtils'

export const useCalendarStore = defineStore('calendar', () => {
  // Estado Principal
  const selectedDate = ref<string>(getChileTodayString()) // Formato YYYY-MM-DD (Hoy dinámico Chile)
  const viewType = ref<CalendarViewType>('day')   // 'day' (prioridad) | 'week' | 'month'
  const viewMode = ref<ViewMode>('my_day')        // 'my_day' | 'family'
  const activeMemberId = ref<string>('m-1')       // Papá (Israel) por defecto
  const filterMemberId = ref<string>('all')       // 'all' o ID de miembro

  // Datos (Inicializa limpio)
  const members = ref<FamilyMember[]>(mockMembers)
  const events = ref<CalendarEvent[]>([])
  const tasks = ref<TaskItem[]>([])

  // Estado de Carga
  const isLoading = ref<boolean>(false)
  const loadError = ref<string | null>(null)

  // Estado del Modal Sheet de Creación
  const isSheetOpen = ref<boolean>(false)
  const sheetContextDate = ref<string>(getChileTodayString())

  // Computados
  const activeMember = computed(() => {
    return members.value.find(m => m.id === activeMemberId.value) || members.value[0]
  })

  // Eventos filtrados según la vista (Mi día vs Familia vs Filtro de Miembro)
  const filteredEvents = computed(() => {
    return events.value.filter(event => {
      // Filtro por Mi día
      if (viewMode.value === 'my_day') {
        if (!event.memberIds.includes(activeMemberId.value)) return false
      }
      // Filtro específico por integrante
      else if (filterMemberId.value !== 'all') {
        if (!event.memberIds.includes(filterMemberId.value)) return false
      }
      return true
    })
  })

  // Eventos del día seleccionado
  const selectedDayEvents = computed(() => {
    return filteredEvents.value.filter(e => e.eventDate === selectedDate.value)
      .sort((a, b) => {
        if (a.isAllDay) return -1
        if (b.isAllDay) return 1
        return a.startTime.localeCompare(b.startTime)
      })
  })

  // Tareas pendientes del día seleccionado (Capa separada de Eventos)
  const selectedDayTasks = computed(() => {
    return tasks.value.filter(t => {
      if (t.dueDate !== selectedDate.value) return false
      if (viewMode.value === 'my_day') {
        return t.assignedToMemberId === activeMemberId.value
      }
      if (filterMemberId.value !== 'all') {
        return t.assignedToMemberId === filterMemberId.value
      }
      return true
    })
  })

  // Acciones de Supabase & Persistencia

  /**
   * Carga los miembros reales y eventos reales desde Supabase si hay sesión activa
   */
  async function loadDataFromSupabase() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      console.log('ℹ️ Sin sesión activa en Supabase. Usando datos Mock locales.')
      return
    }

    isLoading.value = true
    loadError.value = null

    try {
      // Cargar miembros reales
      const { data: dbMembers } = await supabase.from('family_members').select('*')
      if (dbMembers && dbMembers.length > 0) {
        members.value = dbMembers.map((m: any) => ({
          id: m.id,
          name: m.name,
          avatarId: m.avatar_id,
          color: m.color,
          role: m.role,
          isActive: m.is_active
        }))
        if (members.value.length > 0) {
          activeMemberId.value = members.value[0].id
        }
      }

      // Cargar eventos reales
      const dbEvents = await calendarService.getEvents()
      if (dbEvents.length > 0) {
        events.value = dbEvents
      }
    } catch (err: any) {
      console.warn('⚠️ Error al cargar desde Supabase, manteniendo fallback local:', err.message)
      loadError.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  function setViewType(type: CalendarViewType) {
    viewType.value = type
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function setFilterMember(memberId: string) {
    filterMemberId.value = memberId
  }

  function setSelectedDate(dateStr: string) {
    selectedDate.value = dateStr
  }

  function openCreateSheet(dateStr?: string) {
    sheetContextDate.value = dateStr || selectedDate.value
    isSheetOpen.value = true
  }

  function closeCreateSheet() {
    isSheetOpen.value = false
  }

  /**
   * Agrega un evento utilizando la RPC de Supabase con Estado Optimista Sutil (saving -> saved/error)
   */
  async function addEventWithSupabase(payload: CreateEventPayload) {
    const tempId = `temp-${Date.now()}`
    
    // Extraer YYYY-MM-DD de la fecha ISO de inicio
    const startDateObj = new Date(payload.startTime)
    const yyyy = startDateObj.getFullYear()
    const mm = String(startDateObj.getMonth() + 1).padStart(2, '0')
    const dd = String(startDateObj.getDate()).padStart(2, '0')
    const eventDate = `${yyyy}-${mm}-${dd}`

    const startTimeStr = startDateObj.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    // 1. Agregar inmediatamente a Pinia con estado visual 'saving' (Respuesta en UI en <50ms)
    const tempEvent: CalendarEvent = {
      id: tempId,
      title: payload.title,
      description: payload.description,
      eventDate,
      startTime: startTimeStr,
      isAllDay: payload.isAllDay,
      category: 'General',
      color: '#3b82f6',
      memberIds: payload.memberIds,
      isFamilyEvent: payload.isFamilyEvent,
      recurrence: payload.recurrenceFrequency || 'never',
      statusUI: 'saving'
    }

    events.value.push(tempEvent)
    isSheetOpen.value = false

    // 2. Ejecutar RPC en Supabase en segundo plano
    try {
      const realEventId = await calendarService.createEvent(payload)
      
      // Actualizar ID y cambiar a estado 'saved'
      const target = events.value.find(e => e.id === tempId)
      if (target) {
        target.id = realEventId
        target.statusUI = 'saved'
        // Quitar la etiqueta tras 1 segundo para evitar ruido visual permanente
        setTimeout(() => {
          if (target) target.statusUI = 'idle'
        }, 1000)
      }
    } catch (err: any) {
      console.error('❌ Error al guardar evento en Supabase:', err.message)
      const target = events.value.find(e => e.id === tempId)
      if (target) {
        target.statusUI = 'error'
      }
    }
  }

  /**
   * Elimina un evento
   */
  async function deleteEvent(eventId: string) {
    const idx = events.value.findIndex(e => e.id === eventId)
    if (idx !== -1) {
      events.value.splice(idx, 1)
    }

    if (!eventId.startsWith('e-') && !eventId.startsWith('temp-')) {
      try {
        await calendarService.deleteEvent(eventId)
      } catch (err: any) {
        console.error('❌ Error al eliminar evento de Supabase:', err.message)
      }
    }
  }

  function resetToToday() {
    selectedDate.value = getChileTodayString()
  }

  function toggleTask(taskId: string) {
    const t = tasks.value.find(item => item.id === taskId)
    if (t) {
      t.completed = !t.completed
    }
  }

  return {
    selectedDate,
    viewType,
    viewMode,
    activeMemberId,
    filterMemberId,
    members,
    events,
    tasks,
    isLoading,
    loadError,
    isSheetOpen,
    sheetContextDate,
    activeMember,
    filteredEvents,
    selectedDayEvents,
    selectedDayTasks,
    loadDataFromSupabase,
    setViewType,
    setViewMode,
    setFilterMember,
    setSelectedDate,
    resetToToday,
    openCreateSheet,
    closeCreateSheet,
    addEventWithSupabase,
    deleteEvent,
    toggleTask
  }
})

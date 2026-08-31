import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CalendarEvent, CalendarViewType, ViewMode, FamilyMember } from '../types'
import { mockMembers } from '../mocks/familyData'
import { calendarService, type CreateEventPayload } from '../services/calendarService'
import { supabase } from '../services/supabaseClient'
import { getChileTodayString, getChileTimeString, parseDateString, parseTimeString } from '../utils/dateUtils'
import { useAuthStore } from './authStore'
import { useFamilyStore } from './familyStore'
import { useTaskStore } from './taskStore'

export const useCalendarStore = defineStore('calendar', () => {
  const authStore = useAuthStore()
  const familyStore = useFamilyStore()
  const taskStore = useTaskStore()

  // Estado Principal
  const selectedDate = ref<string>(getChileTodayString()) // Formato YYYY-MM-DD (Hoy dinámico Chile)
  const viewType = ref<CalendarViewType>('day')   // 'day' (prioridad) | 'week' | 'month'
  const filterMemberId = ref<string>('all')       // 'all' o ID de miembro

  // Sincronización reactiva con authStore y familyStore
  const activeMemberId = computed<string>(() => {
    return authStore.activeMemberId || authStore.familyMembers[0]?.id || 'm-1'
  })

  const viewMode = computed<ViewMode>({
    get: () => familyStore.viewMode,
    set: (val: ViewMode) => { familyStore.setViewMode(val) }
  })

  // Datos (Inicializa limpio)
  const members = computed<FamilyMember[]>(() => authStore.familyMembers.length > 0 ? authStore.familyMembers : mockMembers)
  const events = ref<CalendarEvent[]>([])

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

  // Función auxiliar de coincidencia flexible de integrante (soporta UUID Supabase, mock IDs y nombres)
  function isMemberMatch(eventMemberIds: string[] | undefined, targetMemberId: string): boolean {
    if (!eventMemberIds || eventMemberIds.length === 0) return true
    if (eventMemberIds.includes(targetMemberId)) return true

    const targetMember = authStore.familyMembers.find(m => m.id === targetMemberId)
    if (!targetMember) return false
    const targetName = targetMember.name.toLowerCase()

    return eventMemberIds.some(mId => {
      if (mId === targetMemberId) return true
      const mObj = authStore.familyMembers.find(m => m.id === mId)
      if (mObj && mObj.name.toLowerCase() === targetName) return true
      if (mId === 'm-1' && targetName.includes('israel')) return true
      if (mId === 'm-2' && (targetName.includes('naty') || targetName.includes('natalia'))) return true
      if (mId === 'm-3' && targetName.includes('santi')) return true
      if (mId === 'm-4' && targetName.includes('vicente')) return true
      return false
    })
  }

  function isTaskMemberMatch(assignedId: string | undefined, targetMemberId: string): boolean {
    if (!assignedId) return true
    if (assignedId === targetMemberId) return true

    const targetMember = authStore.familyMembers.find(m => m.id === targetMemberId)
    if (!targetMember) return false
    const targetName = targetMember.name.toLowerCase()

    const assignedObj = authStore.familyMembers.find(m => m.id === assignedId)
    if (assignedObj && assignedObj.name.toLowerCase() === targetName) return true
    if (assignedId === 'm-1' && targetName.includes('israel')) return true
    if (assignedId === 'm-2' && (targetName.includes('naty') || targetName.includes('natalia'))) return true
    if (assignedId === 'm-3' && targetName.includes('santi')) return true
    if (assignedId === 'm-4' && targetName.includes('vicente')) return true
    return false
  }

  // Eventos filtrados según la vista (Mi día vs Familia vs Filtro de Miembro)
  const filteredEvents = computed(() => {
    return events.value.filter(event => {
      // Filtro por Mi día
      if (viewMode.value === 'my_day') {
        if (event.isFamilyEvent || !event.memberIds || event.memberIds.length === 0) return true
        return isMemberMatch(event.memberIds, activeMemberId.value)
      }
      // Filtro específico por integrante
      else if (filterMemberId.value !== 'all') {
        if (event.isFamilyEvent) return true
        return isMemberMatch(event.memberIds, filterMemberId.value)
      }
      return true
    })
  })

  // Próximos eventos (Filtrados por tiempo real de Chile, excluyendo fechas y horas pasadas)
  const upcomingEvents = computed(() => {
    const todayStr = getChileTodayString()
    const nowTimeStr = getChileTimeString(false) // Formato HH:mm

    return filteredEvents.value
      .filter(event => {
        // 1. Fechas estrictamente futuras
        if (event.eventDate > todayStr) return true

        // 2. Fecha de hoy: incluir si es todo el día o si su hora no ha pasado
        if (event.eventDate === todayStr) {
          if (event.isAllDay) return true
          if (event.endTime && event.endTime >= nowTimeStr) return true
          if (event.startTime >= nowTimeStr) return true
          return false
        }

        // 3. Fechas pasadas (< todayStr)
        return false
      })
      .sort((a, b) => {
        // Orden cronológico ascendente (el más próximo primero)
        if (a.eventDate !== b.eventDate) {
          return a.eventDate.localeCompare(b.eventDate)
        }
        if (a.isAllDay && !b.isAllDay) return -1
        if (!a.isAllDay && b.isAllDay) return 1
        return a.startTime.localeCompare(b.startTime)
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

  // Tareas pendientes del día seleccionado (Sincronizadas con taskStore)
  const selectedDayTasks = computed(() => {
    return taskStore.tasks.filter(t => {
      const taskDueDate = t.dueDate ? parseDateString(t.dueDate) : ''
      if (taskDueDate !== selectedDate.value) return false
      if (viewMode.value === 'my_day') {
        return isTaskMemberMatch(t.assignedToMemberId, activeMemberId.value)
      }
      if (filterMemberId.value !== 'all') {
        return isTaskMemberMatch(t.assignedToMemberId, filterMemberId.value)
      }
      return true
    })
  })

  // Acciones de Supabase & Persistencia

  const COMPLETION_STORAGE_KEY = 'family_hub_event_completion'

  function getStoredCompletionStatuses(): Record<string, 'pending' | 'approved' | 'failed'> {
    try {
      const raw = localStorage.getItem(COMPLETION_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch (err) {
      return {}
    }
  }

  function persistCompletionStatus(eventId: string, status: 'pending' | 'approved' | 'failed') {
    try {
      const map = getStoredCompletionStatuses()
      if (status === 'pending') {
        delete map[eventId]
      } else {
        map[eventId] = status
      }
      localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(map))
    } catch (err) {
      console.warn('⚠️ Error al guardar estado en localStorage:', err)
    }
  }

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
      // Cargar eventos reales y fusionar estados persistentes
      const dbEvents = await calendarService.getEvents()
      const savedStatuses = getStoredCompletionStatuses()
      dbEvents.forEach(e => {
        if (savedStatuses[e.id]) {
          e.completionStatus = savedStatuses[e.id]
        }
      })

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
    familyStore.setViewMode(mode)
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
    
    const eventDate = parseDateString(payload.startTime)
    const startTimeStr = parseTimeString(payload.startTime)

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

  function setEventCompletionStatus(eventId: string, status: 'pending' | 'approved' | 'failed') {
    const ev = events.value.find(e => e.id === eventId)
    if (ev) {
      // Toggle de alternancia: si se vuelve a hacer clic en el mismo estado, vuelve a 'pending'
      if (ev.completionStatus === status) {
        ev.completionStatus = 'pending'
      } else {
        ev.completionStatus = status
      }
      persistCompletionStatus(eventId, ev.completionStatus)
      // Sincronizar estado en Supabase para todos los dispositivos (PC y Teléfono)
      calendarService.updateEventCompletionStatus(eventId, ev.completionStatus)
    }
  }

  function toggleTask(taskId: string) {
    taskStore.toggleTaskStatus(taskId)
  }

  return {
    selectedDate,
    viewType,
    viewMode,
    activeMemberId,
    filterMemberId,
    members,
    events,
    isLoading,
    loadError,
    isSheetOpen,
    sheetContextDate,
    activeMember,
    filteredEvents,
    upcomingEvents,
    selectedDayEvents,
    selectedDayTasks,
    loadDataFromSupabase,
    setViewType,
    setViewMode,
    setFilterMember,
    setSelectedDate,
    resetToToday,
    setEventCompletionStatus,
    openCreateSheet,
    closeCreateSheet,
    addEventWithSupabase,
    deleteEvent,
    toggleTask
  }
})


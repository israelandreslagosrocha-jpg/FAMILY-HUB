import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskItem, ResponsibilityItem, TaskFocusType, ViewMode, FamilyMember } from '../types'
import { mockMembers } from '../mocks/familyData'
import { taskService, type CreateTaskPayload } from '../services/taskService'
import { supabase } from '../services/supabaseClient'

export const useTaskStore = defineStore('taskStore', () => {
  // Estado Principal
  const taskFocus = ref<TaskFocusType>('my_tasks') // 'my_tasks' | 'family_tasks' | 'responsibilities'
  const viewMode = ref<ViewMode>('my_day')         // 'my_day' | 'family'
  const activeMemberId = ref<string>('m-1')        // Israel (Papá) por defecto
  const filterMemberId = ref<string>('all')        // 'all' o ID de miembro

  // Estado del Modal Sheet de Creación de Tarea
  const isCreateTaskSheetOpen = ref<boolean>(false)

  // Estado de Carga
  const isLoading = ref<boolean>(false)
  const loadError = ref<string | null>(null)

  // Datos Mock de Miembros
  const members = ref<FamilyMember[]>(mockMembers)

  // Datos de Responsabilidades Permanentes
  const responsibilities = ref<ResponsibilityItem[]>([])

  // Datos de Tareas Concretas (Inicializa limpio)
  const tasks = ref<TaskItem[]>([])

  // Computados
  const activeMember = computed(() => {
    return members.value.find(m => m.id === activeMemberId.value) || members.value[0]
  })

  // Tareas filtradas por Mis Tareas vs Familia vs Filtro por Miembro
  const displayedTasks = computed(() => {
    return tasks.value.filter(task => {
      if (taskFocus.value === 'my_tasks' || viewMode.value === 'my_day') {
        return task.assignedToMemberId === activeMemberId.value
      }
      if (filterMemberId.value !== 'all') {
        return task.assignedToMemberId === filterMemberId.value
      }
      return true
    })
  })

  const pendingTasks = computed(() => {
    return displayedTasks.value.filter(t => t.status === 'pending')
  })

  const completedTasks = computed(() => {
    return displayedTasks.value.filter(t => t.status === 'completed')
  })

  const skippedTasks = computed(() => {
    return displayedTasks.value.filter(t => t.status === 'skipped')
  })

  // Acciones de Carga Supabase
  async function loadDataFromSupabase() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      console.log('ℹ️ Sin sesión activa en Supabase. Usando datos Mock de tareas.')
      return
    }

    isLoading.value = true
    loadError.value = null

    try {
      // Cargar miembros
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
        activeMemberId.value = members.value[0].id
      }

      // Cargar responsabilidades
      const dbResp = await taskService.getResponsibilities()
      if (dbResp.length > 0) {
        responsibilities.value = dbResp
      }

      // Cargar tareas reales
      const dbTasks = await taskService.getTasks()
      if (dbTasks.length > 0) {
        tasks.value = dbTasks
      }
    } catch (err: any) {
      console.warn('⚠️ Error al cargar tareas desde Supabase:', err.message)
      loadError.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  function setTaskFocus(focus: TaskFocusType) {
    taskFocus.value = focus
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function setFilterMember(memberId: string) {
    filterMemberId.value = memberId
  }

  function openCreateTaskSheet() {
    isCreateTaskSheetOpen.value = true
  }

  function closeCreateTaskSheet() {
    isCreateTaskSheetOpen.value = false
  }

  /**
   * Cambia el estado de una tarea (pending <-> completed)
   * Sincroniza con Supabase en segundo plano
   */
  async function toggleTaskStatus(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    task.status = newStatus
    task.completed = newStatus === 'completed'
    task.completedAt = newStatus === 'completed' ? new Date().toISOString() : null

    // Sincronizar en Supabase si no es un ID mock
    if (!taskId.startsWith('t-')) {
      try {
        await taskService.updateTaskStatus(taskId, newStatus)
      } catch (err: any) {
        console.error('❌ Error al actualizar estado en Supabase:', err.message)
      }
    }
  }

  /**
   * Marca una tarea como omitida (skipped)
   */
  async function skipTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    task.status = 'skipped'
    task.completed = false
    task.completedAt = null

    if (!taskId.startsWith('t-')) {
      try {
        await taskService.updateTaskStatus(taskId, 'skipped')
      } catch (err: any) {
        console.error('❌ Error al omitir tarea en Supabase:', err.message)
      }
    }
  }

  /**
   * Reasigna el encargado de una tarea en 1 toque
   */
  async function reassignTask(taskId: string, newMemberId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    task.assignedToMemberId = newMemberId

    if (!taskId.startsWith('t-')) {
      try {
        await taskService.reassignTask(taskId, newMemberId)
      } catch (err: any) {
        console.error('❌ Error al reasignar tarea en Supabase:', err.message)
      }
    }
  }

  /**
   * Elimina una tarea
   */
  async function deleteTask(taskId: string) {
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      tasks.value.splice(idx, 1)
    }

    if (!taskId.startsWith('t-') && !taskId.startsWith('temp-')) {
      try {
        await taskService.deleteTask(taskId)
      } catch (err: any) {
        console.error('❌ Error al eliminar tarea de Supabase:', err.message)
      }
    }
  }

  async function addTaskWithSupabase(payload: CreateTaskPayload) {
    const tempId = `temp-${Date.now()}`
    
    // 1. Agregar inmediatamente a Pinia (Respuesta UI <50ms)
    const tempTask: TaskItem = {
      id: tempId,
      title: payload.title,
      description: payload.description,
      assignedToMemberId: payload.assignedMemberId,
      createdByMemberId: activeMemberId.value,
      priority: payload.priority,
      dueDate: payload.dueDate,
      status: 'pending',
      completed: false,
      completedAt: null,
      category: 'Hogar',
      responsibilityId: payload.responsibilityId
    }

    tasks.value.unshift(tempTask)
    isCreateTaskSheetOpen.value = false

    // 2. Ejecutar RPC en Supabase
    try {
      const realTaskId = await taskService.createTask(payload)
      const target = tasks.value.find(t => t.id === tempId)
      if (target) {
        target.id = realTaskId
      }
    } catch (err: any) {
      console.error('❌ Error al crear tarea en Supabase:', err.message)
    }
  }

  return {
    taskFocus,
    viewMode,
    activeMemberId,
    filterMemberId,
    members,
    responsibilities,
    tasks,
    isCreateTaskSheetOpen,
    isLoading,
    loadError,
    activeMember,
    displayedTasks,
    pendingTasks,
    completedTasks,
    skippedTasks,
    loadDataFromSupabase,
    setTaskFocus,
    setViewMode,
    setFilterMember,
    openCreateTaskSheet,
    closeCreateTaskSheet,
    toggleTaskStatus,
    skipTask,
    reassignTask,
    deleteTask,
    addTaskWithSupabase
  }
})

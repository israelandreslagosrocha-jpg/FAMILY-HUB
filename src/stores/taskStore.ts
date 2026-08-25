import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskItem, ResponsibilityItem, TaskFocusType, ViewMode, FamilyMember, TaskStatusEnum } from '../types'
import { mockMembers } from '../mocks/familyData'
import { taskService, type CreateTaskPayload } from '../services/taskService'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { useFamilyStore } from './familyStore'

export const useTaskStore = defineStore('taskStore', () => {
  const authStore = useAuthStore()
  const familyStore = useFamilyStore()

  // Estado Principal
  const taskFocus = ref<TaskFocusType>('my_tasks') // 'my_tasks' | 'family_tasks' | 'responsibilities'
  const filterMemberId = ref<string>('all')        // 'all' o ID de miembro

  // Sincronización reactiva con authStore y familyStore
  const activeMemberId = computed<string>(() => {
    return authStore.activeMemberId || authStore.familyMembers[0]?.id || 'm-1'
  })

  const viewMode = computed<ViewMode>({
    get: () => familyStore.viewMode,
    set: (val: ViewMode) => { familyStore.setViewMode(val) }
  })

  const members = computed<FamilyMember[]>(() => {
    return authStore.familyMembers.length > 0 ? authStore.familyMembers : mockMembers
  })

  // Estado del Modal Sheet de Creación / Edición de Tarea / Responsabilidad
  const isCreateTaskSheetOpen = ref<boolean>(false)
  const createTaskSheetMode = ref<'task' | 'responsibility'>('task')
  const editingTask = ref<TaskItem | null>(null)
  const editingResponsibility = ref<ResponsibilityItem | null>(null)

  // Estado de Carga
  const isLoading = ref<boolean>(false)
  const loadError = ref<string | null>(null)

  // Datos de Responsabilidades Permanentes
  const responsibilities = ref<ResponsibilityItem[]>([])

  // Datos de Tareas Concretas (Inicializa limpio)
  const tasks = ref<TaskItem[]>([])

  // Computados
  const activeMember = computed(() => {
    return members.value.find(m => m.id === activeMemberId.value) || members.value[0]
  })

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

  // Tareas filtradas por Mis Tareas vs Familia vs Filtro por Miembro
  const displayedTasks = computed(() => {
    return tasks.value.filter(task => {
      if (taskFocus.value === 'my_tasks' || viewMode.value === 'my_day') {
        return isTaskMemberMatch(task.assignedToMemberId, activeMemberId.value)
      }
      if (filterMemberId.value !== 'all') {
        return isTaskMemberMatch(task.assignedToMemberId, filterMemberId.value)
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

  const suggestionTasks = computed(() => {
    return tasks.value.filter(t => t.status === 'suggestion' && (t.assignedToMemberId === activeMemberId.value || viewMode.value === 'family'))
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
      // Garantizar miembros en authStore
      await authStore.loadFamilyMembers()

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

  function openCreateTaskSheet(mode: 'task' | 'responsibility' = 'task') {
    editingTask.value = null
    editingResponsibility.value = null
    createTaskSheetMode.value = mode
    isCreateTaskSheetOpen.value = true
  }

  function openEditTaskSheet(task: TaskItem) {
    editingTask.value = task
    editingResponsibility.value = null
    createTaskSheetMode.value = 'task'
    isCreateTaskSheetOpen.value = true
  }

  function openEditResponsibilitySheet(resp: ResponsibilityItem) {
    editingResponsibility.value = resp
    editingTask.value = null
    createTaskSheetMode.value = 'responsibility'
    isCreateTaskSheetOpen.value = true
  }

  function closeCreateTaskSheet() {
    isCreateTaskSheetOpen.value = false
    editingTask.value = null
    editingResponsibility.value = null
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
   * Edita título, descripción e integrante asignado de una tarea
   */
  async function updateTaskDetails(taskId: string, newTitle: string, newDesc?: string, newMemberId?: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    task.title = newTitle
    if (newDesc !== undefined) task.description = newDesc
    if (newMemberId) task.assignedToMemberId = newMemberId

    if (!taskId.startsWith('t-') && !taskId.startsWith('temp-')) {
      try {
        await supabase.from('task_instances').update({
          title: newTitle,
          description: newDesc,
          assigned_member_id: newMemberId || task.assignedToMemberId
        }).eq('id', taskId)
      } catch (err: any) {
        console.error('❌ Error al editar tarea en Supabase:', err.message)
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

  /**
   * Acepta una sugerencia de tarea recibida y la convierte en tarea pendiente activa
   */
  async function acceptTaskSuggestion(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task) return

    task.status = 'pending'
    task.completed = false

    if (!taskId.startsWith('t-') && !taskId.startsWith('temp-')) {
      try {
        await taskService.updateTaskStatus(taskId, 'pending')
      } catch (err: any) {
        console.error('❌ Error al aceptar sugerencia en Supabase:', err.message)
      }
    }
  }

  /**
   * Rechaza/Elimina una sugerencia de tarea recibida
   */
  async function rejectTaskSuggestion(taskId: string) {
    await deleteTask(taskId)
  }

  async function addTaskWithSupabase(payload: CreateTaskPayload) {
    const tempId = `temp-${Date.now()}`
    
    // Detección: Si la asigna otro miembro a Israel (Papá / Jefe de Hogar), se crea como 'suggestion'
    const targetMember = members.value.find(m => m.id === payload.assignedMemberId)
    const isTargetPapa = targetMember?.role === 'Papá' || targetMember?.role === 'Jefe de Hogar' || targetMember?.name.toLowerCase().includes('israel')
    const isCreatedByOther = activeMemberId.value !== payload.assignedMemberId
    const initialStatus: TaskStatusEnum = (isTargetPapa && isCreatedByOther) ? 'suggestion' : 'pending'

    // 1. Agregar inmediatamente a Pinia (Respuesta UI <50ms)
    const tempTask: TaskItem = {
      id: tempId,
      title: payload.title,
      description: payload.description,
      assignedToMemberId: payload.assignedMemberId,
      createdByMemberId: activeMemberId.value,
      priority: payload.priority,
      dueDate: payload.dueDate,
      status: initialStatus,
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

      // Si es sugerencia, sincronizar el estado 'suggestion' en Supabase
      if (initialStatus === 'suggestion' && !realTaskId.startsWith('t-')) {
        await supabase.from('task_instances').update({ status: 'suggestion' }).eq('id', realTaskId)
      }
    } catch (err: any) {
      console.error('❌ Error al crear tarea en Supabase:', err.message)
    }
  }

  async function addResponsibilityWithSupabase(payload: { title: string; description?: string; defaultAssignedMemberId: string; fixedTime?: string; icon?: string; color?: string }) {
    const tempId = `temp-resp-${Date.now()}`
    const newResp: ResponsibilityItem = {
      id: tempId,
      title: payload.title,
      description: payload.description || undefined,
      defaultAssignedMemberId: payload.defaultAssignedMemberId,
      fixedTime: payload.fixedTime || undefined,
      icon: payload.icon || '🛠️',
      color: payload.color || '#3b82f6'
    }
    responsibilities.value.push(newResp)
    isCreateTaskSheetOpen.value = false

    try {
      const realId = await taskService.createResponsibility(payload)
      const target = responsibilities.value.find(r => r.id === tempId)
      if (target) {
        target.id = realId
      }
    } catch (err: any) {
      console.error('❌ Error al guardar responsabilidad en Supabase:', err.message)
    }
  }

  async function updateResponsibilityWithSupabase(id: string, payload: { title: string; description?: string; defaultAssignedMemberId: string; fixedTime?: string; icon?: string; color?: string }) {
    const target = responsibilities.value.find(r => r.id === id)
    if (target) {
      target.title = payload.title
      target.description = payload.description
      target.defaultAssignedMemberId = payload.defaultAssignedMemberId
      target.fixedTime = payload.fixedTime
      if (payload.icon) target.icon = payload.icon
      if (payload.color) target.color = payload.color
    }
    isCreateTaskSheetOpen.value = false

    if (!id.startsWith('temp-')) {
      try {
        await taskService.updateResponsibility(id, payload)
      } catch (err: any) {
        console.error('❌ Error al actualizar responsabilidad en Supabase:', err.message)
      }
    }
  }

  async function deleteResponsibilityWithSupabase(id: string) {
    responsibilities.value = responsibilities.value.filter(r => r.id !== id)
    if (!id.startsWith('temp-')) {
      try {
        await taskService.deleteResponsibility(id)
      } catch (err: any) {
        console.error('❌ Error al eliminar responsabilidad en Supabase:', err.message)
      }
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
    createTaskSheetMode,
    editingTask,
    editingResponsibility,
    isLoading,
    loadError,
    activeMember,
    displayedTasks,
    pendingTasks,
    completedTasks,
    skippedTasks,
    suggestionTasks,
    loadDataFromSupabase,
    setTaskFocus,
    setViewMode,
    setFilterMember,
    openCreateTaskSheet,
    openEditTaskSheet,
    openEditResponsibilitySheet,
    closeCreateTaskSheet,
    toggleTaskStatus,
    skipTask,
    reassignTask,
    updateTaskDetails,
    deleteTask,
    addTaskWithSupabase,
    addResponsibilityWithSupabase,
    updateResponsibilityWithSupabase,
    deleteResponsibilityWithSupabase,
    acceptTaskSuggestion,
    rejectTaskSuggestion
  }
})

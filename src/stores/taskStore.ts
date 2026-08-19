import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TaskItem, ResponsibilityItem, TaskFocusType, ViewMode, FamilyMember } from '../types'
import { mockMembers } from '../mocks/familyData'

export const useTaskStore = defineStore('taskStore', () => {
  // Estado Principal
  const taskFocus = ref<TaskFocusType>('my_tasks') // 'my_tasks' | 'family_tasks' | 'responsibilities'
  const viewMode = ref<ViewMode>('my_day')         // 'my_day' | 'family'
  const activeMemberId = ref<string>('m-1')        // Israel (Papá) por defecto
  const filterMemberId = ref<string>('all')        // 'all' o ID de miembro

  // Estado del Modal Sheet de Creación de Tarea
  const isCreateTaskSheetOpen = ref<boolean>(false)

  // Datos Mock de Miembros
  const members = ref<FamilyMember[]>(mockMembers)

  // Datos Mock de Responsabilidades Fijas del Hogar
  const responsibilities = ref<ResponsibilityItem[]>([
    {
      id: 'resp-1',
      title: 'Mantenimiento & Servicios',
      description: 'Pago de cuentas de luz, agua, internet y reparaciones del hogar.',
      defaultAssignedMemberId: 'm-1',
      icon: '🛠️',
      color: '#3b82f6'
    },
    {
      id: 'resp-2',
      title: 'Alimentación & Supermercado',
      description: 'Planificación de menú semanal y compras de supermercado y feria.',
      defaultAssignedMemberId: 'm-2',
      icon: '🛒',
      color: '#ec4899'
    },
    {
      id: 'resp-3',
      title: 'Cuidado de Mascotas & Orden',
      description: 'Alimentar a la mascota, pasear y mantener ordenada la zona de juegos.',
      defaultAssignedMemberId: 'm-3',
      icon: '🐶',
      color: '#10b981'
    },
    {
      id: 'resp-4',
      title: 'Escuela & Materiales',
      description: 'Revisión de cuadernos, tareas escolares y uniformes de la semana.',
      defaultAssignedMemberId: 'm-4',
      icon: '📚',
      color: '#f59e0b'
    }
  ])

  // Datos Mock de Tareas Concretas
  const tasks = ref<TaskItem[]>([
    {
      id: 't-101',
      title: 'Comprar pan y verduras para el almuerzo',
      description: 'Ir a la feria local o supermercado de la esquina',
      assignedToMemberId: 'm-1',
      createdByMemberId: 'm-2',
      priority: 'alta',
      dueDate: '2026-08-19',
      status: 'pending',
      completed: false,
      completedAt: null,
      category: 'Supermercado',
      responsibilityId: 'resp-2'
    },
    {
      id: 't-102',
      title: 'Pagar cuenta de electricidad en Enel',
      description: 'Vence hoy 19 de agosto',
      assignedToMemberId: 'm-1',
      createdByMemberId: 'm-1',
      priority: 'alta',
      dueDate: '2026-08-19',
      status: 'pending',
      completed: false,
      completedAt: null,
      category: 'Servicios',
      responsibilityId: 'resp-1'
    },
    {
      id: 't-103',
      title: 'Revisar tarea de matemáticas de los niños',
      description: 'Guía de fracciones del 4to básico',
      assignedToMemberId: 'm-2',
      createdByMemberId: 'm-2',
      priority: 'media',
      dueDate: '2026-08-19',
      status: 'completed',
      completed: true,
      completedAt: '2026-08-19T14:30:00Z',
      category: 'Escuela',
      responsibilityId: 'resp-4'
    },
    {
      id: 't-104',
      title: 'Lavar y aspirar el auto familiar',
      description: 'Limpieza interior y exterior previa al viaje',
      assignedToMemberId: 'm-1',
      createdByMemberId: 'm-1',
      priority: 'baja',
      dueDate: '2026-08-20',
      status: 'pending',
      completed: false,
      completedAt: null,
      category: 'Hogar',
      responsibilityId: 'resp-1'
    },
    {
      id: 't-105',
      title: 'Alimentar a la mascota y limpiar su zona',
      description: 'Poner comida seca y agua fresca',
      assignedToMemberId: 'm-3',
      createdByMemberId: 'm-1',
      priority: 'media',
      dueDate: '2026-08-19',
      status: 'pending',
      completed: false,
      completedAt: null,
      category: 'Mascotas',
      responsibilityId: 'resp-3'
    }
  ])

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

  // Acciones
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
   * Cambia el estado de una tarea entre pending <-> completed (asigna/resetea completed_at)
   */
  function toggleTaskStatus(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      if (task.status === 'completed') {
        task.status = 'pending'
        task.completed = false
        task.completedAt = null
      } else {
        task.status = 'completed'
        task.completed = true
        task.completedAt = new Date().toISOString()
      }
    }
  }

  /**
   * Marca una tarea como omitida (skipped)
   */
  function skipTask(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'skipped'
      task.completed = false
      task.completedAt = null
    }
  }

  /**
   * Reasigna el encargado de una tarea en 1 toque
   */
  function reassignTask(taskId: string, newMemberId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.assignedToMemberId = newMemberId
    }
  }

  /**
   * Agrega una nueva tarea concreta
   */
  function addTask(newTaskPayload: Omit<TaskItem, 'id' | 'status' | 'completed' | 'completedAt'>) {
    const id = `t-${Date.now()}`
    const task: TaskItem = {
      ...newTaskPayload,
      id,
      status: 'pending',
      completed: false,
      completedAt: null
    }
    tasks.value.unshift(task)
    isCreateTaskSheetOpen.value = false
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
    activeMember,
    displayedTasks,
    pendingTasks,
    completedTasks,
    skippedTasks,
    setTaskFocus,
    setViewMode,
    setFilterMember,
    openCreateTaskSheet,
    closeCreateTaskSheet,
    toggleTaskStatus,
    skipTask,
    reassignTask,
    addTask
  }
})

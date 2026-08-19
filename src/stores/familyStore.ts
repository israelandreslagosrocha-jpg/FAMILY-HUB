import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FamilyMember, TaskItem, CalendarEvent, ExpenseItem, HistoryLog, ViewMode } from '../types'
import { familyService } from '../services/familyService'
import { useAuthStore } from './authStore'

export const useFamilyStore = defineStore('family', () => {
  const authStore = useAuthStore()

  // Estado de la Aplicación
  const tasks = ref<TaskItem[]>([])
  const events = ref<CalendarEvent[]>([])
  const expenses = ref<ExpenseItem[]>([])
  const history = ref<HistoryLog[]>([])

  // Estado de UI y Selección
  const selectedFilterMemberId = ref<string>('all') // 'all' o ID de miembro
  const viewMode = ref<ViewMode>('my_day') // 'my_day' o 'family'

  // Miembros provenientes del authStore (dinámicos según sesión Supabase)
  const members = computed<FamilyMember[]>(() => authStore.familyMembers)

  const activeMemberId = computed<string>(() => authStore.activeMemberId || authStore.familyMembers[0]?.id || '')

  const activeMember = computed<FamilyMember | null>(() => authStore.activeMember)

  // Tareas filtradas por vista (Mi día vs Familia vs Filtro por Miembro)
  const displayedTasks = computed(() => {
    if (viewMode.value === 'my_day') {
      return tasks.value.filter(t => t.assignedToMemberId === activeMemberId.value)
    }
    if (selectedFilterMemberId.value !== 'all') {
      return tasks.value.filter(t => t.assignedToMemberId === selectedFilterMemberId.value)
    }
    return tasks.value
  })

  // Tareas pendientes
  const pendingTasksCount = computed(() => {
    return displayedTasks.value.filter(t => !t.completed).length
  })

  // Gastos totales de la familia
  const totalFamilyExpenses = computed(() => {
    return expenses.value.reduce((acc: number, curr: ExpenseItem) => acc + curr.amount, 0)
  })

  // Acciones
  async function loadData() {
    tasks.value = await familyService.getTasks()
    events.value = await familyService.getEvents()
    expenses.value = await familyService.getExpenses()
    history.value = await familyService.getHistory()
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function setActiveMember(id: string) {
    authStore.setActiveMember(id)
  }

  function setFilterMember(id: string) {
    selectedFilterMemberId.value = id
  }

  function toggleTaskCompletion(taskId: string) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) {
      task.completed = !task.completed
    }
  }

  return {
    members,
    tasks,
    events,
    expenses,
    history,
    activeMemberId,
    selectedFilterMemberId,
    viewMode,
    activeMember,
    displayedTasks,
    pendingTasksCount,
    totalFamilyExpenses,
    loadData,
    setViewMode,
    setActiveMember,
    setFilterMember,
    toggleTaskCompletion
  }
})

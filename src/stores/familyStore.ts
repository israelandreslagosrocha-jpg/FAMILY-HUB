import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FamilyMember, TaskItem, CalendarEvent, ExpenseItem, HistoryLog, ViewMode } from '../types'
import { familyService } from '../services/familyService'

export const useFamilyStore = defineStore('family', () => {
  // Estado de la Aplicación
  const members = ref<FamilyMember[]>([])
  const tasks = ref<TaskItem[]>([])
  const events = ref<CalendarEvent[]>([])
  const expenses = ref<ExpenseItem[]>([])
  const history = ref<HistoryLog[]>([])

  // Estado de UI y Selección (Reglas 20, 21, 22, 23)
  const activeMemberId = ref<string>('m-1') // Por defecto: Israel (m-1)
  const selectedFilterMemberId = ref<string>('all') // 'all' o ID de miembro
  const viewMode = ref<ViewMode>('my_day') // 'my_day' o 'family'

  // Getters Computados
  const activeMember = computed(() => {
    return members.value.find(m => m.id === activeMemberId.value) || members.value[0] || null
  })

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
    return expenses.value.reduce((acc, curr) => acc + curr.amount, 0)
  })

  // Acciones
  async function loadData() {
    members.value = await familyService.getMembers()
    tasks.value = await familyService.getTasks()
    events.value = await familyService.getEvents()
    expenses.value = await familyService.getExpenses()
    history.value = await familyService.getHistory()
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function setActiveMember(id: string) {
    activeMemberId.value = id
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

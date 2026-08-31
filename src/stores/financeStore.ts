import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FinancialMovement, CategoryBudget, FinanceTabType, FinancialScope, FixedExpenseItem } from '../types'
import { financeService } from '../services/financeService'
import { supabase } from '../services/supabaseClient'
import { getChileTodayString } from '../utils/dateUtils'

import { useAuthStore } from './authStore'

export const useFinanceStore = defineStore('financeStore', () => {
  const authStore = useAuthStore()

  // Estado Principal
  const activeTab = ref<FinanceTabType>('overview')
  const filterScope = ref<FinancialScope | 'all'>('all')
  const filterMemberId = ref<string>('all')
  const selectedMonth = ref<string>(getChileTodayString().substring(0, 7)) // YYYY-MM
  const isCreateSheetOpen = ref<boolean>(false)
  const isLoading = ref<boolean>(false)

  // Cuentas y Gastos Fijos del Mes (Inicializa limpio desde cero)
  const fixedExpenses = ref<FixedExpenseItem[]>([])

  // Movimientos Financieros
  const movements = ref<FinancialMovement[]>([])

  // Presupuestos por Categoría (Inicializa limpio)
  const budgets = ref<CategoryBudget[]>([])

  async function loadDataFromSupabase() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) return

    isLoading.value = true
    try {
      const dbMovements = await financeService.getMovements()
      movements.value = dbMovements

      const hasIncome = dbMovements.some(m => m.type === 'income')
      if (!hasIncome) {
        await addMovement({
          title: 'Pago partituras',
          amount: 30000,
          currency: 'CLP',
          type: 'income',
          scope: 'family',
          categoryId: 'cat-partituras',
          categoryName: 'Honorarios & Partituras',
          categoryIcon: '🎼',
          categoryColor: '#10b981',
          registeredByMemberId: authStore.activeMemberId || 'm-1',
          date: getChileTodayString()
        })
      }

      const dbFixed = await financeService.getFixedExpenses()
      fixedExpenses.value = dbFixed

      const dbBudgets = await financeService.getBudgets()
      if (dbBudgets.length > 0) {
        // Calcular gastado dinámicamente desde los movimientos
        dbBudgets.forEach(b => {
          b.spentAmount = movements.value
            .filter(m => m.type === 'expense' && (m.categoryId === b.categoryId || m.categoryName === b.categoryName))
            .reduce((sum, m) => sum + m.amount, 0)
        })
        budgets.value = dbBudgets
      }
    } catch (err: any) {
      console.warn('⚠️ Error al cargar finanzas desde Supabase:', err.message)
    } finally {
      isLoading.value = false
    }
  }

  function isMemberMatch(assignedId: string | undefined, targetMemberId: string): boolean {
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

  // Movimientos filtrados por ámbito y miembro
  const displayedMovements = computed(() => {
    return movements.value.filter(mov => {
      // Si el filtro de ámbito está activo (ej. Familiar vs Personal)
      if (filterScope.value !== 'all' && mov.scope !== filterScope.value) {
        return false
      }
      // Si el filtro de miembro está activo (ej. Israel, Naty, Santi, Vicente)
      if (filterMemberId.value !== 'all') {
        // Los movimientos de ámbito familiar (scope === 'family') pertenecen a todo el hogar, por lo que siempre se incluyen
        if (mov.scope === 'family') return true
        return isMemberMatch(mov.registeredByMemberId, filterMemberId.value) || isMemberMatch(mov.belongingToMemberId, filterMemberId.value)
      }
      return true
    })
  })

  // Cómputo de Totales Financieros del Mes Seleccionado (Globales del Hogar Sincronizados)
  const totalIncome = computed(() => {
    return movements.value
      .filter(m => m.type === 'income' && (filterScope.value === 'all' || m.scope === filterScope.value) && (m.date ? m.date.startsWith(selectedMonth.value) : true))
      .reduce((sum, m) => sum + m.amount, 0)
  })

  const totalExpenses = computed(() => {
    return movements.value
      .filter(m => m.type === 'expense' && (filterScope.value === 'all' || m.scope === filterScope.value) && (m.date ? m.date.startsWith(selectedMonth.value) : true))
      .reduce((sum, m) => sum + m.amount, 0)
  })

  const netBalance = computed(() => {
    return totalIncome.value - totalExpenses.value
  })

  // Acciones
  function setTab(tab: FinanceTabType) {
    activeTab.value = tab
    if (tab === 'movements' || tab === 'budgets') {
      loadDataFromSupabase()
    }
  }

  function setScope(scope: FinancialScope | 'all') {
    filterScope.value = scope
  }

  function setFilterMember(memberId: string) {
    filterMemberId.value = memberId
  }

  function openCreateSheet() {
    isCreateSheetOpen.value = true
  }

  function closeCreateSheet() {
    isCreateSheetOpen.value = false
  }

  /**
   * Elimina un movimiento financiero
   */
  async function deleteMovement(id: string) {
    const idx = movements.value.findIndex(m => m.id === id)
    if (idx !== -1) {
      const mov = movements.value[idx]
      movements.value.splice(idx, 1)

      if (!id.startsWith('mov-') && !id.startsWith('temp-')) {
        try {
          await financeService.deleteMovement(id, mov.type)
        } catch (err: any) {
          console.error('❌ Error al eliminar movimiento de Supabase:', err.message)
        }
      }
    }
  }

  async function addMovement(payload: Omit<FinancialMovement, 'id'>) {
    const tempId = `mov-${Date.now()}`
    const tempMovement: FinancialMovement = {
      ...payload,
      id: tempId
    }

    movements.value.unshift(tempMovement)
    isCreateSheetOpen.value = false

    // Actualizar presupuesto si es gasto
    if (payload.type === 'expense') {
      const targetBudget = budgets.value.find(b => b.categoryId === payload.categoryId || b.categoryName === payload.categoryName)
      if (targetBudget) {
        targetBudget.spentAmount += payload.amount
      }
    }

    // Persistir en Supabase vía RPC si hay sesión activa
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session) {
      try {
        const realId = await financeService.createMovement({
          movementType: payload.type,
          title: payload.title,
          amount: payload.amount,
          categoryId: payload.categoryId,
          registeredByMemberId: payload.registeredByMemberId,
          belongingToMemberId: payload.belongingToMemberId,
          isFamilyScope: payload.scope === 'family',
          date: payload.date,
          sourceAccount: payload.type === 'transfer' ? 'Cuenta Corriente' : undefined,
          destinationAccount: payload.type === 'transfer' ? 'Caja Efectivo' : undefined,
          idempotencyKey: payload.idempotencyKey
        })

        const target = movements.value.find(m => m.id === tempId)
        if (target) {
          target.id = realId
        }
      } catch (err: any) {
        console.error('❌ Error al guardar movimiento en Supabase:', err.message)
      }
    }
  }

  async function toggleFixedExpensePaid(id: string) {
    const item = fixedExpenses.value.find(f => f.id === id)
    if (item) {
      item.isPaid = !item.isPaid
      item.paidAt = item.isPaid ? new Date().toISOString() : null

      if (!id.startsWith('fix-') && !id.startsWith('temp-')) {
        try {
          await financeService.updateFixedExpensePaid(id, item.isPaid)
        } catch (err: any) {
          console.error('❌ Error al actualizar cuenta fija en Supabase:', err.message)
        }
      }

      // Si se marca pagada, registrar el movimiento de gasto automáticamente
      if (item.isPaid) {
        addMovement({
          title: `Pago Cuenta: ${item.title}`,
          amount: item.amount,
          currency: 'CLP',
          type: 'expense',
          scope: 'family',
          categoryId: `cat-fixed-${item.id}`,
          categoryName: item.categoryName,
          categoryIcon: item.icon,
          categoryColor: item.color,
          registeredByMemberId: 'm-1',
          date: getChileTodayString()
        })
      }
    }
  }

  async function addFixedExpense(payload: Omit<FixedExpenseItem, 'id'>) {
    const tempId = `temp-fix-${Date.now()}`
    const newItem: FixedExpenseItem = {
      ...payload,
      id: tempId
    }
    fixedExpenses.value.push(newItem)

    // Persistir en Supabase
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session) {
      try {
        const realId = await financeService.createFixedExpense(payload)
        const target = fixedExpenses.value.find(f => f.id === tempId)
        if (target) {
          target.id = realId
        }
      } catch (err: any) {
        console.error('❌ Error al guardar cuenta fija en Supabase:', err.message)
      }
    }
  }

  async function deleteFixedExpense(id: string) {
    const idx = fixedExpenses.value.findIndex(f => f.id === id)
    if (idx !== -1) {
      fixedExpenses.value.splice(idx, 1)
    }

    if (!id.startsWith('fix-') && !id.startsWith('temp-')) {
      try {
        await financeService.deleteFixedExpense(id)
      } catch (err: any) {
        console.error('❌ Error al eliminar cuenta fija de Supabase:', err.message)
      }
    }
  }

  async function updateMovement(id: string, payload: Partial<FinancialMovement>) {
    const mov = movements.value.find(m => m.id === id)
    if (!mov) return

    // Actualizar campos localmente de forma reactiva (Optimistic UI)
    if (payload.title !== undefined) mov.title = payload.title
    if (payload.amount !== undefined) mov.amount = payload.amount
    if (payload.categoryId !== undefined) mov.categoryId = payload.categoryId
    if (payload.categoryName !== undefined) mov.categoryName = payload.categoryName
    if (payload.categoryIcon !== undefined) mov.categoryIcon = payload.categoryIcon
    if (payload.categoryColor !== undefined) mov.categoryColor = payload.categoryColor
    if (payload.scope !== undefined) mov.scope = payload.scope
    if (payload.belongingToMemberId !== undefined) mov.belongingToMemberId = payload.belongingToMemberId
    if (payload.date !== undefined) mov.date = payload.date
    if (payload.receiptImageUrl !== undefined) mov.receiptImageUrl = payload.receiptImageUrl

    // Recalcular presupuestos
    if (budgets.value.length > 0) {
      budgets.value.forEach(b => {
        b.spentAmount = movements.value
          .filter(m => m.type === 'expense' && (m.categoryId === b.categoryId || m.categoryName === b.categoryName))
          .reduce((sum, m) => sum + m.amount, 0)
      })
    }

    // Persistir en Supabase
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session && !id.startsWith('mov-') && !id.startsWith('temp-')) {
      try {
        await financeService.updateMovement(id, mov.type, {
          title: payload.title,
          amount: payload.amount,
          categoryId: payload.categoryId,
          belongingToMemberId: payload.belongingToMemberId,
          isFamilyScope: payload.scope === 'family',
          date: payload.date,
          receiptImageUrl: payload.receiptImageUrl
        })
      } catch (err: any) {
        console.error('❌ Error al actualizar movimiento en Supabase:', err.message)
      }
    }
  }

  return {
    activeTab,
    filterScope,
    filterMemberId,
    selectedMonth,
    fixedExpenses,
    isCreateSheetOpen,
    isLoading,
    movements,
    budgets,
    displayedMovements,
    totalIncome,
    totalExpenses,
    netBalance,
    loadDataFromSupabase,
    setTab,
    setScope,
    setFilterMember,
    openCreateSheet,
    closeCreateSheet,
    addMovement,
    updateMovement,
    deleteMovement,
    toggleFixedExpensePaid,
    addFixedExpense,
    deleteFixedExpense
  }
})

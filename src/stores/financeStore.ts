import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FinancialMovement, CategoryBudget, FinanceTabType, FinancialScope } from '../types'
import { financeService } from '../services/financeService'
import { supabase } from '../services/supabaseClient'

export const useFinanceStore = defineStore('financeStore', () => {
  // Estado Principal
  const activeTab = ref<FinanceTabType>('overview')
  const filterScope = ref<FinancialScope | 'all'>('all')
  const filterMemberId = ref<string>('all')
  const isCreateSheetOpen = ref<boolean>(false)
  const isLoading = ref<boolean>(false)

  // Movimientos Financieros
  const movements = ref<FinancialMovement[]>([
    {
      id: 'mov-101',
      title: 'Supermercado Mensual Lider',
      amount: 145000,
      currency: 'CLP',
      type: 'expense',
      scope: 'family',
      categoryId: 'cat-super',
      categoryName: 'Supermercado',
      categoryIcon: '🛒',
      categoryColor: '#ec4899',
      registeredByMemberId: 'm-1',
      date: '2026-08-18'
    },
    {
      id: 'mov-102',
      title: 'Sueldo Mensual Israel',
      amount: 1850000,
      currency: 'CLP',
      type: 'income',
      scope: 'family',
      categoryId: 'cat-ingreso',
      categoryName: 'Sueldos & Trabajo',
      categoryIcon: '💼',
      categoryColor: '#10b981',
      registeredByMemberId: 'm-1',
      date: '2026-08-01'
    },
    {
      id: 'mov-103',
      title: 'Cuenta de Luz Enel',
      amount: 38500,
      currency: 'CLP',
      type: 'expense',
      scope: 'family',
      categoryId: 'cat-servicios',
      categoryName: 'Servicios del Hogar',
      categoryIcon: '💡',
      categoryColor: '#3b82f6',
      registeredByMemberId: 'm-2',
      date: '2026-08-15'
    },
    {
      id: 'mov-104',
      title: 'Transferencia Banco -> Efectivo Caja',
      amount: 50000,
      currency: 'CLP',
      type: 'transfer',
      scope: 'family',
      categoryId: 'cat-transfer',
      categoryName: 'Transferencia Cuentas',
      categoryIcon: '🔄',
      categoryColor: '#8b5cf6',
      registeredByMemberId: 'm-1',
      date: '2026-08-16'
    },
    {
      id: 'mov-105',
      title: 'Zapatillas Escolares',
      amount: 32990,
      currency: 'CLP',
      type: 'expense',
      scope: 'personal',
      categoryId: 'cat-ropa',
      categoryName: 'Ropa & Personal',
      categoryIcon: '👟',
      categoryColor: '#f59e0b',
      registeredByMemberId: 'm-1',
      belongingToMemberId: 'm-3',
      date: '2026-08-14'
    }
  ])

  // Presupuestos por Categoría
  const budgets = ref<CategoryBudget[]>([
    {
      id: 'b-1',
      categoryId: 'cat-super',
      categoryName: 'Supermercado & Alimentos',
      monthlyLimit: 350000,
      spentAmount: 245000,
      color: '#ec4899',
      icon: '🛒'
    },
    {
      id: 'b-2',
      categoryId: 'cat-servicios',
      categoryName: 'Servicios (Luz, Agua, Internet)',
      monthlyLimit: 120000,
      spentAmount: 88500,
      color: '#3b82f6',
      icon: '💡'
    },
    {
      id: 'b-3',
      categoryId: 'cat-ropa',
      categoryName: 'Ropa & Artículos Personales',
      monthlyLimit: 60000,
      spentAmount: 32990,
      color: '#f59e0b',
      icon: '👟'
    },
    {
      id: 'b-4',
      categoryId: 'cat-entretencion',
      categoryName: 'Entretención & Salidas',
      monthlyLimit: 100000,
      spentAmount: 98000,
      color: '#a855f7',
      icon: '🍕'
    }
  ])

  async function loadDataFromSupabase() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) return

    isLoading.value = true
    try {
      const dbMovements = await financeService.getMovements()
      if (dbMovements.length > 0) {
        movements.value = dbMovements
      }

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

  // Movimientos filtrados por ámbito y miembro
  const displayedMovements = computed(() => {
    return movements.value.filter(mov => {
      if (filterScope.value !== 'all' && mov.scope !== filterScope.value) {
        return false
      }
      if (filterMemberId.value !== 'all') {
        return mov.registeredByMemberId === filterMemberId.value || mov.belongingToMemberId === filterMemberId.value
      }
      return true
    })
  })

  // Cómputo de Totales Financieros
  const totalIncome = computed(() => {
    return displayedMovements.value
      .filter(m => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0)
  })

  const totalExpenses = computed(() => {
    return displayedMovements.value
      .filter(m => m.type === 'expense')
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
          categoryId: payload.categoryId.startsWith('cat-') ? undefined : payload.categoryId,
          registeredByMemberId: payload.registeredByMemberId,
          belongingToMemberId: payload.belongingToMemberId,
          isFamilyScope: payload.scope === 'family',
          date: payload.date,
          sourceAccount: payload.type === 'transfer' ? 'Cuenta Corriente' : undefined,
          destinationAccount: payload.type === 'transfer' ? 'Caja Efectivo' : undefined
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

  return {
    activeTab,
    filterScope,
    filterMemberId,
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
    addMovement
  }
})

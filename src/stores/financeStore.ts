import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FinancialMovement, CategoryBudget, FinanceTabType, FinancialScope } from '../types'

export const useFinanceStore = defineStore('financeStore', () => {
  // Estado Principal
  const activeTab = ref<FinanceTabType>('overview') // 'overview' | 'movements' | 'budgets'
  const filterScope = ref<FinancialScope | 'all'>('all')
  const filterMemberId = ref<string>('all')
  const isCreateSheetOpen = ref<boolean>(false)

  // Datos Mock de Movimientos Financieros
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
      registeredByMemberId: 'm-1', // Israel (Papá) pagó
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
      registeredByMemberId: 'm-2', // Esposa pagó
      date: '2026-08-15'
    },
    {
      id: 'mov-104',
      title: 'Transferencia Banco -> Efectivo Caja',
      amount: 50000,
      currency: 'CLP',
      type: 'transfer', // MOVIMIENTO NEUTRO (No altera balance neto)
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
      registeredByMemberId: 'm-1', // Israel pagó
      belongingToMemberId: 'm-3',  // Pertenece a Hijo
      date: '2026-08-14'
    }
  ])

  // Datos Mock de Presupuestos por Categoría
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
      spentAmount: 98000, // Cerca del límite (Amarillo)
      color: '#a855f7',
      icon: '🍕'
    }
  ])

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

  // Cómputo de Totales Financieros (Las transferencias neutras son excluidas de gastos e ingresos)
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

  function addMovement(payload: Omit<FinancialMovement, 'id'>) {
    const newMovement: FinancialMovement = {
      ...payload,
      id: `mov-${Date.now()}`
    }

    movements.value.unshift(newMovement)
    isCreateSheetOpen.value = false

    // Actualizar presupuestos si es un gasto de categoría existente
    if (payload.type === 'expense') {
      const targetBudget = budgets.value.find(b => b.categoryId === payload.categoryId || b.categoryName === payload.categoryName)
      if (targetBudget) {
        targetBudget.spentAmount += payload.amount
      }
    }
  }

  return {
    activeTab,
    filterScope,
    filterMemberId,
    isCreateSheetOpen,
    movements,
    budgets,
    displayedMovements,
    totalIncome,
    totalExpenses,
    netBalance,
    setTab,
    setScope,
    setFilterMember,
    openCreateSheet,
    closeCreateSheet,
    addMovement
  }
})

import { supabase } from './supabaseClient'
import type { FinancialMovement, CategoryBudget, MovementType } from '../types'

export interface CreateMovementParams {
  movementType: MovementType
  title: string
  amount: number
  categoryId?: string
  registeredByMemberId?: string
  belongingToMemberId?: string
  isFamilyScope: boolean
  date?: string
  sourceAccount?: string
  destinationAccount?: string
  receiptImageUrl?: string
  idempotencyKey?: string
}

export const financeService = {
  /**
   * Obtiene todos los movimientos financieros (gastos, ingresos y transferencias) de la familia autenticada
   */
  async getMovements(): Promise<FinancialMovement[]> {
    const movements: FinancialMovement[] = []

    // 1. Obtener Gastos (expenses)
    const { data: expData, error: expErr } = await supabase
      .from('expenses')
      .select('*, categories(name, icon, color)')
      .order('date', { ascending: false })

    if (expErr) console.error('❌ Error al obtener gastos:', expErr.message)

    if (expData) {
      expData.forEach((item: any) => {
        movements.push({
          id: item.id,
          title: item.title,
          amount: Number(item.amount),
          currency: 'CLP',
          type: 'expense',
          scope: item.is_family_expense ? 'family' : 'personal',
          categoryId: item.category_id,
          categoryName: item.categories?.name || 'Gasto General',
          categoryIcon: item.categories?.icon || '💸',
          categoryColor: item.categories?.color || '#f43f5e',
          registeredByMemberId: item.registered_by_member_id,
          belongingToMemberId: item.belonging_to_member_id || undefined,
          date: item.date,
          receiptImageUrl: item.receipt_image_url || undefined
        })
      })
    }

    // 2. Obtener Ingresos (incomes)
    const { data: incData, error: incErr } = await supabase
      .from('incomes')
      .select('*, categories(name, icon, color)')
      .order('date', { ascending: false })

    if (incErr) console.error('❌ Error al obtener ingresos:', incErr.message)

    if (incData) {
      incData.forEach((item: any) => {
        movements.push({
          id: item.id,
          title: item.title,
          amount: Number(item.amount),
          currency: 'CLP',
          type: 'income',
          scope: item.is_family_income ? 'family' : 'personal',
          categoryId: item.category_id,
          categoryName: item.categories?.name || 'Ingresos',
          categoryIcon: item.categories?.icon || '💼',
          categoryColor: item.categories?.color || '#10b981',
          registeredByMemberId: item.registered_by_member_id,
          belongingToMemberId: item.belonging_to_member_id || undefined,
          date: item.date
        })
      })
    }

    // 3. Obtener Transferencias Neutras (transfers)
    const { data: trfData, error: trfErr } = await supabase
      .from('transfers')
      .select('*')
      .order('date', { ascending: false })

    if (trfErr) console.error('❌ Error al obtener transferencias:', trfErr.message)

    if (trfData) {
      trfData.forEach((item: any) => {
        movements.push({
          id: item.id,
          title: item.description || `Transferencia: ${item.source_account} → ${item.destination_account}`,
          amount: Number(item.amount),
          currency: 'CLP',
          type: 'transfer',
          scope: 'family',
          categoryId: 'cat-transfer',
          categoryName: 'Transferencia Cuentas',
          categoryIcon: '🔄',
          categoryColor: '#8b5cf6',
          registeredByMemberId: item.registered_by_member_id,
          date: item.date
        })
      })
    }

    // Ordenar cronológicamente descendente
    return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  /**
   * Obtiene los presupuestos mensuales por categoría de la familia
   */
  async getBudgets(): Promise<CategoryBudget[]> {
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(name, icon, color)')

    if (error) {
      console.error('❌ Error al obtener presupuestos:', error.message)
      throw error
    }

    if (!data) return []

    return data.map((item: any) => ({
      id: item.id,
      categoryId: item.category_id,
      categoryName: item.categories?.name || 'Presupuesto Categoría',
      monthlyLimit: Number(item.limit_amount),
      spentAmount: 0, // Cómputo dinámico desde movimientos
      color: item.categories?.color || '#3b82f6',
      icon: item.categories?.icon || '🎯'
    }))
  },

  /**
   * Crea un nuevo movimiento financiero llamando a la RPC transaccional segura
   */
  async createMovement(params: CreateMovementParams): Promise<string> {
    const { data, error } = await supabase.rpc('create_financial_movement', {
      p_movement_type: params.movementType,
      p_title: params.title,
      p_amount: params.amount,
      p_category_id: params.categoryId || null,
      p_registered_by_member_id: params.registeredByMemberId || null,
      p_belonging_to_member_id: params.belongingToMemberId || null,
      p_is_family_scope: params.isFamilyScope,
      p_date: params.date || new Date().toISOString().split('T')[0],
      p_source_account: params.sourceAccount || null,
      p_destination_account: params.destinationAccount || null,
      p_receipt_image_url: params.receiptImageUrl || null,
      p_idempotency_key: params.idempotencyKey || null
    })

    if (error) {
      console.error('❌ Error al ejecutar RPC create_financial_movement:', error.message)
      throw error
    }

    return data.id
  },

  /**
   * Elimina un movimiento financiero (gasto, ingreso o transferencia) de Supabase
   */
  async deleteMovement(id: string, type: MovementType): Promise<void> {
    const table = type === 'expense' ? 'expenses' : type === 'income' ? 'incomes' : 'transfers'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      console.error(`❌ Error al eliminar movimiento de ${table}:`, error.message)
      throw error
    }
  }
}

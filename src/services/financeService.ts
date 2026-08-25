import { supabase } from './supabaseClient'
import type { FinancialMovement, CategoryBudget, MovementType, FixedExpenseItem } from '../types'

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
   * Obtiene las cuentas fijas del hogar en Supabase
   */
  async getFixedExpenses(): Promise<FixedExpenseItem[]> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .order('due_day', { ascending: true })

    if (error) {
      console.warn('⚠️ Warning al obtener cuentas fijas de Supabase:', error.message)
      return []
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      amount: Number(item.amount),
      categoryName: item.category_name,
      dueDay: item.due_day,
      isPaid: item.is_paid,
      paidAt: item.paid_at,
      icon: item.icon || '💡',
      color: item.color || '#3b82f6'
    }))
  },

  /**
   * Crea una nueva cuenta fija en Supabase
   */
  async createFixedExpense(item: Omit<FixedExpenseItem, 'id'>): Promise<string> {
    const { data: mData } = await supabase.from('family_members').select('family_id').limit(1)
    const familyId = (mData && mData.length > 0) ? mData[0].family_id : undefined

    const payload: any = {
      title: item.title,
      amount: item.amount,
      category_name: item.categoryName,
      due_day: item.dueDay,
      is_paid: item.isPaid,
      paid_at: item.paidAt || null,
      icon: item.icon,
      color: item.color
    }

    if (familyId) {
      payload.family_id = familyId
    }

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('❌ Error al crear cuenta fija en Supabase:', error.message)
      throw error
    }
    return data.id
  },

  /**
   * Actualiza el estado pagado/pendiente de una cuenta fija
   */
  async updateFixedExpensePaid(id: string, isPaid: boolean): Promise<void> {
    await supabase
      .from('fixed_expenses')
      .update({
        is_paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null
      })
      .eq('id', id)
  },

  /**
   * Elimina una cuenta fija de Supabase
   */
  async deleteFixedExpense(id: string): Promise<void> {
    await supabase.from('fixed_expenses').delete().eq('id', id)
  },

  /**
   * Obtiene todos los movimientos financieros (gastos, ingresos y transferencias) de la familia autenticada
   */
  async getMovements(): Promise<FinancialMovement[]> {
    const movements: FinancialMovement[] = []

    // 1. Obtener Gastos (expenses)
    const { data: expData, error: expErr } = await supabase
      .from('expenses')
      .select('*')
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
          categoryId: item.category_id || 'cat-general',
          categoryName: item.category_name || 'Gasto General',
          categoryIcon: item.category_icon || '💸',
          categoryColor: item.category_color || '#f43f5e',
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
      .select('*')
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
          categoryId: item.category_id || 'cat-income',
          categoryName: item.category_name || item.title || 'Honorarios & Partituras',
          categoryIcon: item.category_icon || '🎼',
          categoryColor: item.category_color || '#10b981',
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
        const desc = item.description || ''
        if (desc.includes('6C.3') || desc.includes('6D') || desc.toLowerCase().includes('prueba')) {
          return // Omitir transferencias de prueba antiguas
        }
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
      .select('*')

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
    let validCategoryId = params.categoryId
    if (!validCategoryId || validCategoryId.startsWith('cat-')) {
      try {
        const { data: catData } = await supabase.from('categories').select('id').limit(1)
        if (catData && catData.length > 0) {
          validCategoryId = catData[0].id
        }
      } catch (err: any) {
        console.warn('⚠️ No se pudo obtener categoría por defecto de Supabase:', err.message)
      }
    }

    const { data, error } = await supabase.rpc('create_financial_movement', {
      p_movement_type: params.movementType,
      p_title: params.title,
      p_amount: params.amount,
      p_category_id: validCategoryId || null,
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

    return typeof data === 'object' && data?.id ? data.id : String(data)
  },

  /**
   * Elimina un movimiento financiero (gasto, ingreso o transferencia) de Supabase
   */
  async deleteMovement(id: string, type?: MovementType): Promise<void> {
    if (type === 'expense') {
      await supabase.from('expenses').delete().eq('id', id)
    } else if (type === 'income') {
      await supabase.from('incomes').delete().eq('id', id)
    } else if (type === 'transfer') {
      await supabase.from('transfers').delete().eq('id', id)
    } else {
      // Intentar borrado seguro en todas las tablas si el tipo es ambiguo
      await supabase.from('expenses').delete().eq('id', id)
      await supabase.from('incomes').delete().eq('id', id)
      await supabase.from('transfers').delete().eq('id', id)
    }
  }
}

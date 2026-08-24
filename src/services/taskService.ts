import { supabase } from './supabaseClient'
import type { TaskItem, TaskStatusEnum, PriorityLevel, ResponsibilityItem } from '../types'

export interface CreateTaskPayload {
  title: string
  description?: string
  assignedMemberId: string
  priority: PriorityLevel
  dueDate: string // YYYY-MM-DD
  categoryId?: string
  responsibilityId?: string
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurrenceDaysOfWeek?: number[]
  recurrenceDayOfMonth?: number
  recurrenceMonthlyPattern?: 'FIRST_MONDAY' | 'LAST_DAY'
  recurrenceEndDate?: string
}

export const taskService = {
  /**
   * Obtiene todas las tareas físicas de la familia en 1 sola consulta relacional
   */
  async getTasks(): Promise<TaskItem[]> {
    const { data, error } = await supabase
      .from('task_instances')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error al obtener tareas de Supabase:', error.message)
      throw error
    }

    if (!data) return []

    return data.map((item: any) => {
      const dueDateStr = item.due_date ? String(item.due_date).split('T')[0] : new Date().toISOString().split('T')[0]

      return {
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        assignedToMemberId: item.assigned_member_id,
        createdByMemberId: item.created_by_member_id,
        priority: item.priority as PriorityLevel,
        dueDate: dueDateStr,
        status: item.status as TaskStatusEnum,
        completed: item.status === 'completed',
        completedAt: item.completed_at || null,
        category: item.categories?.name || 'Hogar',
        responsibilityId: item.responsibility_id || undefined
      }
    })
  },

  /**
   * Obtiene todas las responsabilidades permanentes de la familia
   */
  async getResponsibilities(): Promise<ResponsibilityItem[]> {
    const { data, error } = await supabase
      .from('responsibilities')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error al obtener responsabilidades de Supabase:', error.message)
      throw error
    }

    if (!data) return []

    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      defaultAssignedMemberId: item.default_assigned_member_id,
      icon: item.icon || '🛠️',
      color: item.color || '#3b82f6'
    }))
  },

  /**
   * Crea una tarea concreta de forma atómica e inquebrantable llamando a la RPC transaccional
   */
  async createTask(payload: CreateTaskPayload): Promise<string> {
    const { data: taskId, error } = await supabase.rpc('create_family_task', {
      p_title: payload.title,
      p_description: payload.description || null,
      p_assigned_member_id: payload.assignedMemberId,
      p_priority: payload.priority,
      p_due_date: payload.dueDate,
      p_category_id: payload.categoryId || null,
      p_responsibility_id: payload.responsibilityId || null,
      p_recurrence_frequency: payload.recurrenceFrequency || null,
      p_recurrence_days_of_week: payload.recurrenceDaysOfWeek || null,
      p_recurrence_day_of_month: payload.recurrenceDayOfMonth || null,
      p_recurrence_monthly_pattern: payload.recurrenceMonthlyPattern || null,
      p_recurrence_end_date: payload.recurrenceEndDate || null
    })

    if (error) {
      console.error('❌ Error en RPC create_family_task:', error.message)
      throw error
    }

    return taskId
  },

  /**
   * Actualiza el estado de una tarea (pending, completed, skipped)
   * El trigger de PostgreSQL asigna/resetea completed_at y registra en history_logs automáticamente
   */
  async updateTaskStatus(taskId: string, status: TaskStatusEnum): Promise<void> {
    const { error } = await supabase
      .from('task_instances')
      .update({ status })
      .eq('id', taskId)

    if (error) {
      console.error('❌ Error al actualizar estado de tarea:', error.message)
      throw error
    }
  },

  /**
   * Reasigna el encargado de una tarea
   * El trigger de PostgreSQL registra el evento 'reassigned' en history_logs automáticamente
   */
  async reassignTask(taskId: string, newMemberId: string): Promise<void> {
    const { error } = await supabase
      .from('task_instances')
      .update({ assigned_member_id: newMemberId })
      .eq('id', taskId)

    if (error) {
      console.error('❌ Error al reasignar encargado de tarea:', error.message)
      throw error
    }
  },

  /**
   * Elimina una tarea de Supabase
   */
  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('task_instances')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('❌ Error al eliminar tarea en Supabase:', error.message)
      throw error
    }
  },

  /**
   * Crea una nueva responsabilidad permanente en Supabase
   */
  async createResponsibility(payload: { title: string; description?: string; defaultAssignedMemberId: string; icon?: string; color?: string }): Promise<string> {
    const { data: mData } = await supabase.from('family_members').select('family_id').limit(1)
    const familyId = mData && mData.length > 0 ? mData[0].family_id : undefined

    const row: any = {
      title: payload.title,
      description: payload.description || null,
      default_assigned_member_id: payload.defaultAssignedMemberId,
      icon: payload.icon || '🛠️',
      color: payload.color || '#3b82f6',
      is_active: true
    }

    if (familyId) {
      row.family_id = familyId
    }

    const { data, error } = await supabase
      .from('responsibilities')
      .insert(row)
      .select('id')
      .single()

    if (error) {
      console.error('❌ Error al crear responsabilidad en Supabase:', error.message)
      throw error
    }

    return data.id
  }
}

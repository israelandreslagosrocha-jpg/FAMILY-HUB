import { supabase } from './supabaseClient'
import type { AutomationRule, AutomationLog, ActionKindEnum, TriggerCategory } from '../types'

export interface CreateRulePayload {
  name: string
  description?: string
  category: TriggerCategory
  triggerText: string
  conditionText?: string
  actionText: string
  actionKind: ActionKindEnum
}

export const automationService = {
  /**
   * Obtiene todas las reglas de automatización activas de la familia
   */
  async getRules(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error al obtener reglas de automatización:', error.message)
      throw error
    }

    if (!data) return []

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      category: item.trigger_type as TriggerCategory,
      triggerText: item.trigger_event,
      conditionText: item.condition_config?.conditionText || undefined,
      actionText: item.action_config?.task_title || item.action_config?.message || item.action_type,
      actionKind: item.action_type as ActionKindEnum,
      isActive: item.is_active,
      executionCount: 0
    }))
  },

  /**
   * Obtiene la bitácora de ejecuciones de automatizaciones
   */
  async getExecutions(): Promise<AutomationLog[]> {
    const { data, error } = await supabase
      .from('automation_executions')
      .select('*, automation_rules(name)')
      .order('executed_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ Error al obtener bitácora de ejecuciones:', error.message)
      throw error
    }

    if (!data) return []

    return data.map((item: any) => ({
      id: item.id,
      ruleId: item.rule_id,
      ruleName: item.automation_rules?.name || 'Regla de Automatización',
      triggeredAt: item.executed_at ? new Date(item.executed_at).toLocaleString('es-CL') : 'Hace un momento',
      status: item.status === 'success' ? 'success' : 'failed',
      details: item.error_message ? `Fallo: ${item.error_message}` : `Ejecución exitosa sobre la entidad ${item.target_entity_type}`,
      isIdempotentVerified: true
    }))
  },

  /**
   * Crea una nueva regla de automatización en Supabase
   */
  async createRule(payload: CreateRulePayload): Promise<string> {
    const { data: members } = await supabase.from('family_members').select('id, family_id').limit(1)
    if (!members || members.length === 0) throw new Error('No se encontró miembro activo')

    const familyId = members[0].family_id
    const memberId = members[0].id

    // Mapear disparadores conocidos
    let triggerEvent = 'task.completed'
    if (payload.category === 'scheduled_time') {
      triggerEvent = 'cron.weekly_sunday_1900'
    }

    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        family_id: familyId,
        created_by_member_id: memberId,
        name: payload.name,
        description: payload.description || null,
        trigger_type: payload.category,
        trigger_event: triggerEvent,
        condition_config: payload.conditionText ? { conditionText: payload.conditionText } : {},
        action_type: payload.actionKind,
        action_config: { task_title: payload.actionText, message: payload.actionText },
        is_active: true
      })
      .select('id')
      .single()

    if (error) {
      console.error('❌ Error al crear regla en Supabase:', error.message)
      throw error
    }

    return data.id
  },

  /**
   * Activa o pausa una regla en Supabase
   */
  async toggleRuleActive(ruleId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('automation_rules')
      .update({ is_active: isActive })
      .eq('id', ruleId)

    if (error) {
      console.error('❌ Error al cambiar estado de regla en Supabase:', error.message)
      throw error
    }
  },

  /**
   * Dispara el scheduler de la propia familia
   */
  async executeMyScheduledAutomations(): Promise<any> {
    const { data, error } = await supabase.rpc('execute_my_scheduled_automations')
    if (error) {
      console.error('❌ Error en RPC execute_my_scheduled_automations:', error.message)
      throw error
    }
    return data
  }
}

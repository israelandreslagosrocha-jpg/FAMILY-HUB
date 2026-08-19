import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AutomationRule, AutomationRecipe, AutomationLog, AutomationTabType } from '../types'

export const useAutomationStore = defineStore('automationStore', () => {
  // Estado Principal
  const activeTab = ref<AutomationTabType>('recipes') // 'recipes' | 'active_rules' | 'execution_logs'
  const isCreateSheetOpen = ref<boolean>(false)

  // Catálogo de Recetas Prediseñadas del Hogar
  const recipes = ref<AutomationRecipe[]>([
    {
      id: 'rec-1',
      title: 'Rotador de Basura entre Hijos',
      description: 'Asigna automáticamente la tarea de sacar la basura al siguiente hijo cada Domingo.',
      icon: '🧹',
      category: 'Rutinas Fijas',
      triggerText: 'Todos los Domingos a las 19:00',
      conditionText: 'Solo si la tarea de la semana está completada',
      actionText: 'Rotar encargado entre Hijos',
      actionKind: 'ROTATE_MEMBER'
    },
    {
      id: 'rec-2',
      title: 'Guardar Mercadería tras Comprar',
      description: 'Crea la tarea de guardar la mercadería al momento de marcar como compras hechas.',
      icon: '🛒',
      category: 'Encadenamiento',
      triggerText: 'Al completar la tarea "Comprar alimentos"',
      conditionText: 'Categoría es Supermercado',
      actionText: 'Crear tarea "Guardar Mercadería en Despensa"',
      actionKind: 'CREATE_TASK'
    },
    {
      id: 'rec-3',
      title: 'Alerta de Presupuesto Consumido',
      description: 'Envía una notificación al responsable cuando un gasto consuma más del 80% del presupuesto.',
      icon: '💸',
      category: 'Finanzas',
      triggerText: 'Al registrar un nuevo gasto',
      conditionText: 'Monto del gasto supera el 80% del presupuesto límite',
      actionText: 'Notificar al Administrador del Hogar',
      actionKind: 'SEND_NOTIFICATION'
    },
    {
      id: 'rec-4',
      title: 'Revisión de Tareas Escolares',
      description: 'Crea una tarea los Viernes para revisar cuadernos y materiales antes del fin de semana.',
      icon: '📚',
      category: 'Escuela',
      triggerText: 'Cada Viernes a las 17:00',
      conditionText: 'Si hay clases en el período',
      actionText: 'Crear tarea "Revisar Mochilas y Cuadernos"',
      actionKind: 'CREATE_TASK'
    }
  ])

  // Reglas Activas de la Familia
  const activeRules = ref<AutomationRule[]>([
    {
      id: 'rule-101',
      name: 'Guardar Mercadería en Despensa',
      description: 'Crea automáticamente la tarea de ordenar al terminar las compras.',
      category: 'data_event',
      triggerText: 'Al completar la tarea "Comprar Alimentos y Verduras"',
      conditionText: 'Categoría es Supermercado y Alimentación',
      actionText: 'Crear tarea "Guardar Mercadería en Despensa"',
      actionKind: 'CREATE_TASK',
      isActive: true,
      executionCount: 14
    },
    {
      id: 'rule-102',
      name: 'Rotación Semanal de Basura y Reciclaje',
      description: 'Rota la asignación entre los integrantes del hogar.',
      category: 'scheduled_time',
      triggerText: 'Todos los Domingos a las 19:00',
      conditionText: 'Miembros activos con rol Familiar',
      actionText: 'Rotar asignación al siguiente miembro',
      actionKind: 'ROTATE_MEMBER',
      isActive: true,
      executionCount: 8
    }
  ])

  // Bitácora de Ejecuciones Idempotentes (Historico)
  const executionLogs = ref<AutomationLog[]>([
    {
      id: 'exec-1',
      ruleId: 'rule-101',
      ruleName: 'Guardar Mercadería en Despensa',
      triggeredAt: 'Hace 2 horas (18:30)',
      status: 'success',
      details: 'Tarea "Guardar Mercadería en Despensa" creada exitosamente para Papá.',
      isIdempotentVerified: true
    },
    {
      id: 'exec-2',
      ruleId: 'rule-102',
      ruleName: 'Rotación Semanal de Basura y Reciclaje',
      triggeredAt: 'Domingo 17 de Agosto, 19:00',
      status: 'success',
      details: 'Encargado rotado a Hijo. Verificado sin ejecuciones duplicadas.',
      isIdempotentVerified: true
    }
  ])

  // Acciones
  function setTab(tab: AutomationTabType) {
    activeTab.value = tab
  }

  function openCreateSheet() {
    isCreateSheetOpen.value = true
  }

  function closeCreateSheet() {
    isCreateSheetOpen.value = false
  }

  function toggleRuleActive(ruleId: string) {
    const rule = activeRules.value.find(r => r.id === ruleId)
    if (rule) {
      rule.isActive = !rule.isActive
    }
  }

  /**
   * Activa una receta prediseñada en 1 toque
   */
  function activateRecipe(recipeId: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: recipe.title,
      description: recipe.description,
      category: recipe.triggerText.includes('Cada') || recipe.triggerText.includes('Todos') ? 'scheduled_time' : 'data_event',
      triggerText: recipe.triggerText,
      conditionText: recipe.conditionText,
      actionText: recipe.actionText,
      actionKind: recipe.actionKind,
      isActive: true,
      executionCount: 0
    }

    activeRules.value.unshift(newRule)
    activeTab.value = 'active_rules'
  }

  /**
   * Crea una nueva regla desde el constructor de 3 bloques
   */
  function createRule(payload: Omit<AutomationRule, 'id' | 'isActive' | 'executionCount'>) {
    const newRule: AutomationRule = {
      ...payload,
      id: `rule-${Date.now()}`,
      isActive: true,
      executionCount: 0
    }

    activeRules.value.unshift(newRule)
    isCreateSheetOpen.value = false
    activeTab.value = 'active_rules'
  }

  return {
    activeTab,
    isCreateSheetOpen,
    recipes,
    activeRules,
    executionLogs,
    setTab,
    openCreateSheet,
    closeCreateSheet,
    toggleRuleActive,
    activateRecipe,
    createRule
  }
})

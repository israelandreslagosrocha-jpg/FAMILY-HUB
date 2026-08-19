// Interfaces TypeScript para el modelo de datos de FAMILY-HUB

export interface FamilyMember {
  id: string
  name: string
  avatarId: string // Referencia al SVG local
  color: string    // Color identificador del miembro (Regla 17)
  role: string
  isActive: boolean
}

export type PriorityLevel = 'alta' | 'media' | 'baja'
export type StatusSemantic = 'completed' | 'pending' | 'urgent' | 'info' | 'archived'
export type TaskStatusEnum = 'pending' | 'completed' | 'skipped'

export interface TaskItem {
  id: string
  title: string
  description?: string
  assignedToMemberId: string
  createdByMemberId?: string
  priority: PriorityLevel
  dueDate: string // YYYY-MM-DD o formato amigable
  status: TaskStatusEnum
  completed: boolean // Mantener retrocompatibilidad UI
  completedAt?: string | null
  category: string
  responsibilityId?: string
}

export interface ResponsibilityItem {
  id: string
  title: string
  description: string
  defaultAssignedMemberId: string
  icon: string
  color: string
}

export type CalendarRecurrence = 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  eventDate: string // YYYY-MM-DD
  startTime: string // "10:30"
  endTime?: string  // "11:30"
  isAllDay: boolean
  category: string
  color?: string
  memberIds: string[] // IDs de los participantes
  isFamilyEvent: boolean
  recurrence?: CalendarRecurrence
  statusUI?: 'idle' | 'saving' | 'saved' | 'error'
}

// TIPOS PARA AUTOMATIZACIONES (ETAPA 5)
export type TriggerCategory = 'data_event' | 'scheduled_time'
export type ActionKindEnum = 'CREATE_TASK' | 'ROTATE_MEMBER' | 'SEND_NOTIFICATION' | 'REASSIGN_TASK' | 'SKIP_TASK'

export interface AutomationRule {
  id: string
  name: string
  description: string
  category: TriggerCategory
  triggerText: string
  conditionText?: string
  actionText: string
  actionKind: ActionKindEnum
  isActive: boolean
  executionCount: number
}

export interface AutomationRecipe {
  id: string
  title: string
  description: string
  icon: string
  category: string
  triggerText: string
  conditionText?: string
  actionText: string
  actionKind: ActionKindEnum
}

export interface AutomationLog {
  id: string
  ruleId: string
  ruleName: string
  triggeredAt: string
  status: 'success' | 'failed'
  details: string
  isIdempotentVerified: boolean
}

// TIPOS PARA FINANZAS (ETAPA 6)
export type MovementType = 'expense' | 'income' | 'transfer'
export type FinancialScope = 'family' | 'personal'
export type FinanceTabType = 'overview' | 'movements' | 'budgets'

export interface FinancialMovement {
  id: string
  title: string
  amount: number
  currency: 'CLP'
  type: MovementType
  scope: FinancialScope
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  registeredByMemberId: string  // Quién pagó/registró
  belongingToMemberId?: string  // A quién pertenece si es personal
  date: string                  // YYYY-MM-DD
  receiptImageUrl?: string
}

export interface CategoryBudget {
  id: string
  categoryId: string
  categoryName: string
  monthlyLimit: number
  spentAmount: number
  color: string
  icon: string
}

export interface ExpenseItem {
  id: string
  title: string
  amount: number
  category: string
  date: string
  paidByMemberId: string
}

export interface HistoryLog {
  id: string
  memberName: string
  memberAvatarId: string
  actionText: string
  itemTitle: string
  formattedTime: string
}

export type ViewMode = 'my_day' | 'family'
export type CalendarViewType = 'day' | 'week' | 'month'
export type TaskFocusType = 'my_tasks' | 'family_tasks' | 'responsibilities'
export type AutomationTabType = 'recipes' | 'active_rules' | 'execution_logs'

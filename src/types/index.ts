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

export interface TaskItem {
  id: string
  title: string
  description?: string
  assignedToMemberId: string
  priority: PriorityLevel
  dueDate: string // ISO string o formato amigable "2026-08-19"
  completed: boolean
  category: string
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

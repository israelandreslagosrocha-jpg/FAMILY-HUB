// Interfaces TypeScript para el modelo de datos de FAMILY-HUB

export interface FamilyMember {
  id: string
  name: string
  avatarId: string // Referencia al SVG en src/assets/avatars/
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
  dueDate: string
  completed: boolean
  category: string
}

export interface CalendarEvent {
  id: string
  title: string
  eventDate: string
  time: string
  category: string
  memberId: string
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

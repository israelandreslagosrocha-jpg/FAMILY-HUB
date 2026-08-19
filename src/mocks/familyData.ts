import type { FamilyMember, TaskItem, CalendarEvent, ExpenseItem, HistoryLog } from '../types'

export const mockMembers: FamilyMember[] = [
  {
    id: 'm-1',
    name: 'Israel',
    avatarId: 'avatar-01',
    color: '#3b82f6',
    role: 'Papá',
    isActive: true
  },
  {
    id: 'm-2',
    name: 'Esposa',
    avatarId: 'avatar-02',
    color: '#ec4899',
    role: 'Mamá',
    isActive: true
  },
  {
    id: 'm-3',
    name: 'Hijo',
    avatarId: 'avatar-03',
    color: '#10b981',
    role: 'Hijo',
    isActive: true
  },
  {
    id: 'm-4',
    name: 'Hija',
    avatarId: 'avatar-04',
    color: '#f59e0b',
    role: 'Hija',
    isActive: true
  }
]

export const mockTasks: TaskItem[] = [
  {
    id: 't-1',
    title: 'Comprar alimentos de la semana',
    description: 'Leche, verduras, pan y frutas frescas',
    assignedToMemberId: 'm-1',
    priority: 'alta',
    dueDate: 'Hoy, 18:00',
    completed: false,
    category: 'Supermercado'
  },
  {
    id: 't-2',
    title: 'Pagar cuenta de electricidad',
    description: 'Vence el 20 de agosto',
    assignedToMemberId: 'm-1',
    priority: 'alta',
    dueDate: 'Hoy, 20:00',
    completed: false,
    category: 'Servicios'
  },
  {
    id: 't-3',
    title: 'Revisar tarea de matemáticas',
    description: 'Guía de fracciones',
    assignedToMemberId: 'm-2',
    priority: 'media',
    dueDate: 'Mañana, 17:00',
    completed: false,
    category: 'Escuela'
  },
  {
    id: 't-4',
    title: 'Ordenar dormitorio y juguetes',
    description: 'Dejar limpia la zona de juegos',
    assignedToMemberId: 'm-3',
    priority: 'media',
    dueDate: 'Hoy, 19:30',
    completed: true,
    category: 'Hogar'
  }
]

export const mockEvents: CalendarEvent[] = [
  {
    id: 'e-1',
    title: 'Cita Médica Familiar',
    eventDate: '2026-08-19',
    time: '11:00',
    category: 'Salud',
    memberId: 'm-2'
  },
  {
    id: 'e-2',
    title: 'Cena de Cumpleaños Abuela',
    eventDate: '2026-08-21',
    time: '20:00',
    category: 'Celebración',
    memberId: 'm-1'
  },
  {
    id: 'e-3',
    title: 'Reunión de Apoderados',
    eventDate: '2026-08-22',
    time: '18:30',
    category: 'Escuela',
    memberId: 'm-2'
  }
]

export const mockExpenses: ExpenseItem[] = [
  {
    id: 'ex-1',
    title: 'Supermercado Mensual',
    amount: 84650,
    category: 'Alimentación',
    date: '18/08/2026',
    paidByMemberId: 'm-2'
  },
  {
    id: 'ex-2',
    title: 'Carga Bip / Combustible',
    amount: 25000,
    category: 'Transporte',
    date: '17/08/2026',
    paidByMemberId: 'm-1'
  }
]

export const mockHistory: HistoryLog[] = [
  {
    id: 'h-1',
    memberName: 'Israel',
    memberAvatarId: 'avatar-01',
    actionText: '✓ Completó la tarea',
    itemTitle: 'Reparar llave del baño',
    formattedTime: 'Hoy, 14:20'
  },
  {
    id: 'h-2',
    memberName: 'Esposa',
    memberAvatarId: 'avatar-02',
    actionText: '💰 Registró gasto de supermercado',
    itemTitle: '$84.650 — Jumbo',
    formattedTime: 'Hoy, 18:32'
  }
]

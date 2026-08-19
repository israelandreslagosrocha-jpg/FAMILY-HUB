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
    title: 'Comprar pan y verduras',
    description: 'Feria local o supermercado',
    assignedToMemberId: 'm-1',
    priority: 'alta',
    dueDate: '2026-08-19',
    completed: false,
    category: 'Supermercado'
  },
  {
    id: 't-2',
    title: 'Pagar cuenta de luz',
    description: 'Vence hoy en Enel',
    assignedToMemberId: 'm-1',
    priority: 'alta',
    dueDate: '2026-08-19',
    completed: false,
    category: 'Servicios'
  },
  {
    id: 't-3',
    title: 'Revisar tarea de matemáticas',
    description: 'Guía de fracciones del colegio',
    assignedToMemberId: 'm-2',
    priority: 'media',
    dueDate: '2026-08-19',
    completed: true,
    category: 'Escuela'
  },
  {
    id: 't-4',
    title: 'Lavar el auto familiar',
    description: 'Limpiar interior y exterior',
    assignedToMemberId: 'm-1',
    priority: 'baja',
    dueDate: '2026-08-20',
    completed: false,
    category: 'Hogar'
  },
  {
    id: 't-5',
    title: 'Ordenar habitación',
    description: 'Juguetes y mochila escolar',
    assignedToMemberId: 'm-3',
    priority: 'media',
    dueDate: '2026-08-19',
    completed: false,
    category: 'Hogar'
  }
]

export const mockEvents: CalendarEvent[] = [
  {
    id: 'e-1',
    title: 'Cita Médica Pediatra',
    description: 'Control de rutina en clínica San María',
    eventDate: '2026-08-19',
    startTime: '10:30',
    endTime: '11:30',
    isAllDay: false,
    category: 'Salud',
    color: '#ec4899',
    memberIds: ['m-1', 'm-2', 'm-3'],
    isFamilyEvent: true,
    recurrence: 'never'
  },
  {
    id: 'e-2',
    title: 'Reunión de Apoderados',
    description: 'Reunión de coordinación del 4to básico',
    eventDate: '2026-08-19',
    startTime: '18:30',
    endTime: '19:45',
    isAllDay: false,
    category: 'Escuela',
    color: '#3b82f6',
    memberIds: ['m-1', 'm-2'],
    isFamilyEvent: true,
    recurrence: 'monthly'
  },
  {
    id: 'e-3',
    title: 'Cumpleaños Abuela Ana',
    description: 'Cena familiar en la casa de la abuela',
    eventDate: '2026-08-21',
    startTime: '19:30',
    endTime: '22:30',
    isAllDay: false,
    category: 'Celebración',
    color: '#f59e0b',
    memberIds: ['m-1', 'm-2', 'm-3', 'm-4'],
    isFamilyEvent: true,
    recurrence: 'yearly'
  },
  {
    id: 'e-4',
    title: 'Día Libre / Feriado Familiar',
    description: 'Paseo al parque o descanso',
    eventDate: '2026-08-23',
    startTime: '09:00',
    endTime: '20:00',
    isAllDay: true,
    category: 'Paseo',
    color: '#10b981',
    memberIds: ['m-1', 'm-2', 'm-3', 'm-4'],
    isFamilyEvent: true,
    recurrence: 'never'
  },
  {
    id: 'e-5',
    title: 'Entrenamiento de Fútbol',
    description: 'Cancha municipal',
    eventDate: '2026-08-20',
    startTime: '16:00',
    endTime: '17:30',
    isAllDay: false,
    category: 'Deporte',
    color: '#10b981',
    memberIds: ['m-3'],
    isFamilyEvent: false,
    recurrence: 'weekly'
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

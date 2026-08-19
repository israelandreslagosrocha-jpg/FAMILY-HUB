import { mockMembers, mockTasks, mockEvents, mockExpenses, mockHistory } from '../mocks/familyData'
import type { FamilyMember, TaskItem, CalendarEvent, ExpenseItem, HistoryLog } from '../types'

// Capa de Servicio Mock (Regla 27 y 28)
// En la Etapa 2, estas funciones se conectarán a Supabase sin modificar los componentes de la interfaz.

export const familyService = {
  async getMembers(): Promise<FamilyMember[]> {
    return Promise.resolve([...mockMembers])
  },

  async getTasks(): Promise<TaskItem[]> {
    return Promise.resolve([...mockTasks])
  },

  async getEvents(): Promise<CalendarEvent[]> {
    return Promise.resolve([...mockEvents])
  },

  async getExpenses(): Promise<ExpenseItem[]> {
    return Promise.resolve([...mockExpenses])
  },

  async getHistory(): Promise<HistoryLog[]> {
    return Promise.resolve([...mockHistory])
  }
}

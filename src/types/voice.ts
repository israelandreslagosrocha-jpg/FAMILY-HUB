/**
 * Tipos TypeScript para la Captura Universal por Voz en FAMILY-HUB
 */

export type VoiceIntentType = 
  | 'task.create'
  | 'calendar.event.create'
  | 'finance.expense.create'
  | 'finance.income.create'
  | 'finance.transfer.create'
  | 'responsibility.create'
  | 'reminder.create'
  | 'ambiguous'
  | 'unknown'

export type VoiceCaptureState = 
  | 'idle'
  | 'listening'
  | 'processing'
  | 'review'
  | 'error'

export interface ParsedEntities {
  title?: string
  amount?: number
  currency?: 'CLP'
  date?: string                    // YYYY-MM-DD
  time?: string                    // HH:mm
  categoryName?: string
  categoryId?: string
  categoryIcon?: string
  categoryColor?: string
  scope?: 'family' | 'personal'
  memberId?: string
  memberName?: string
  sourceAccount?: string
  destinationAccount?: string
  recurrence?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurrenceDaysOfWeek?: number[]
  relativeOffsetMinutes?: number
  targetType?: 'task' | 'event' | 'responsibility' | 'expense' | 'income' | 'transfer' | 'standalone'
}

export interface VoiceParsedResult {
  intent: VoiceIntentType
  confidence: number               // 0 a 1
  rawTranscript: string
  normalizedTranscript: string
  entities: ParsedEntities
  requiresDisambiguation: boolean
  missingFields: string[]          // Lista de campos requeridos que faltan (ej. ['amount'])
  proposalTitle: string            // Título amigable para la UI (ej. "Nueva Tarea", "Propuesta de Gasto")
  proposalSummary: string          // Resumen textual de lo interpretado
}

export interface SpeechAdapterInterface {
  isSupported(): boolean
  isLocalAvailable(): Promise<boolean> | boolean
  startListening(options: {
    lang?: string
    continuous?: boolean
    interimResults?: boolean
    onResult: (transcript: string, isFinal: boolean) => void
    onError: (error: string) => void
    onEnd: () => void
  }): Promise<void>
  stopListening(): void
  cancelListening(): void
}

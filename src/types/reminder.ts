/**
 * Tipos TypeScript para el Sistema de Recordatorios y Alarmas de Dispositivo en FAMILY-HUB
 */

export type ReminderTargetType = 
  | 'task'
  | 'event'
  | 'responsibility'
  | 'expense'
  | 'income'
  | 'transfer'
  | 'standalone'

export type ReminderMode = 
  | 'notification'    // 🔔 Recordatorio Normal / Notificación Local Exacta
  | 'system_alarm'    // ⏰ Alarma Real del Sistema (solo si la plataforma lo soporta)

export type ReminderStatus = 
  | 'scheduled'
  | 'triggered'
  | 'cancelled'

export type ReminderPlatform = 
  | 'web'
  | 'android'
  | 'ios'

export type ReminderAdapterType = 
  | 'web_notification'
  | 'native_local'
  | 'native_system_alarm'

export interface ReminderItem {
  id: string                          // reminder.id único (UUID)
  familyId?: string
  targetType: ReminderTargetType
  targetId?: string                   // ID de la entidad vinculada (ej. taskId, eventId)
  title: string
  body?: string
  scheduledAt: string                 // ISO String en America/Santiago (ej. "2026-08-25T20:00:00-04:00")
  relativeOffsetMinutes?: number      // Ej. -30 (30 min antes)
  mode: ReminderMode
  status: ReminderStatus
  platform: ReminderPlatform
  adapter: ReminderAdapterType
  nativeNotificationId?: number       // ID numérico para cancelación en Local Notifications
  operationIdempotencyKey: string     // Clave única por pulsación/intento (previene doble clic)
  createdAt: string
  updatedAt: string
}

export interface ScheduleReminderParams {
  targetType: ReminderTargetType
  targetId?: string
  title: string
  body?: string
  scheduledAt: string                 // ISO string
  relativeOffsetMinutes?: number
  mode?: ReminderMode
  operationIdempotencyKey?: string
}

export interface ReminderAdapterInterface {
  isSupported(): boolean
  isSystemAlarmAvailable(): Promise<boolean> | boolean
  checkPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }>
  requestPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }>
  schedule(reminder: ReminderItem): Promise<{ success: boolean; nativeId?: number; error?: string }>
  cancel(reminder: ReminderItem): Promise<{ success: boolean; error?: string }>
}

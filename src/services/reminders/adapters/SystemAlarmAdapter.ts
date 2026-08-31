/**
 * Adaptador de Alarmas Reales del Sistema (Capawesome Capacitor Alarm)
 * 
 * MATRIZ DE COMPORTAMIENTO REAL:
 * - Web/PWA: No disponible.
 * - Android: Crea una alarma en la aplicación Reloj del sistema (AlarmClock).
 *   LIMITACIÓN ANDROID OS: La API de Android NO permite listar ni cancelar alarmas creadas por apps terceras.
 * - iOS < 26: No disponible (se usa Local Notification).
 * - iOS 26+: AlarmKit disponible con soporte de creación y cancelación.
 */

import type { ReminderAdapterInterface, ReminderItem } from '../../../types/reminder'

export class SystemAlarmAdapter implements ReminderAdapterInterface {
  isSupported(): boolean {
    return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.() && !!(window as any).Capacitor?.Plugins?.Alarm
  }

  async isSystemAlarmAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const plugin = (window as any).Capacitor?.Plugins?.Alarm
      if (plugin?.isAvailable) {
        const res = await plugin.isAvailable()
        return !!res.isAvailable
      }
      return false
    } catch {
      return false
    }
  }

  async checkPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (!this.isSupported()) return { notifications: false, exactAlarm: false }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.Alarm
      const res = await plugin.checkPermissions()
      return {
        notifications: true,
        exactAlarm: res.scheduleExactAlarm === 'granted'
      }
    } catch {
      return { notifications: false, exactAlarm: false }
    }
  }

  async requestPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (!this.isSupported()) return { notifications: false, exactAlarm: false }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.Alarm
      const res = await plugin.requestPermissions()
      return {
        notifications: true,
        exactAlarm: res.scheduleExactAlarm === 'granted'
      }
    } catch {
      return { notifications: false, exactAlarm: false }
    }
  }

  async schedule(reminder: ReminderItem): Promise<{ success: boolean; nativeId?: number; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Alarmas de sistema no soportadas en esta plataforma.' }
    }

    try {
      const plugin = (window as any).Capacitor?.Plugins?.Alarm
      const d = new Date(reminder.scheduledAt)
      const hours = d.getHours()
      const minutes = d.getMinutes()

      // Invocar plugin de alarma del sistema
      await plugin.setAlarm({
        hours,
        minutes,
        title: `FAMILY-HUB: ${reminder.title}`,
        skipUi: true
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al programar alarma del sistema.' }
    }
  }

  async cancel(reminder: ReminderItem): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) return { success: true }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.Alarm
      // En iOS 26+ AlarmKit permite cancelar si existe id. En Android, devuelve silenciosamente que se gestiona en Reloj.
      if (plugin?.cancelAlarm && reminder.nativeNotificationId) {
        await plugin.cancelAlarm({ id: String(reminder.nativeNotificationId) })
      }
      return { success: true }
    } catch {
      return { success: true }
    }
  }
}

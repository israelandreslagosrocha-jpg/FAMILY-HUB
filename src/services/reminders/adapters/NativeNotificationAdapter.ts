/**
 * Adaptador de Notificaciones Locales Nativas (Capacitor Local Notifications)
 * Permite programar notificaciones exactas en el dispositivo que despiertan la pantalla incluso con la app cerrada.
 */

import type { ReminderAdapterInterface, ReminderItem } from '../../../types/reminder'

export class NativeNotificationAdapter implements ReminderAdapterInterface {
  isSupported(): boolean {
    return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()
  }

  isSystemAlarmAvailable(): boolean {
    return false
  }

  async checkPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (!this.isSupported()) return { notifications: false, exactAlarm: false }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.LocalNotifications
      if (!plugin) return { notifications: false, exactAlarm: false }
      const res = await plugin.checkPermissions()
      const exactRes = await plugin.checkExactNotificationSetting?.()
      return {
        notifications: res.display === 'granted',
        exactAlarm: exactRes ? exactRes.exact_alarm === 'granted' : true
      }
    } catch {
      return { notifications: false, exactAlarm: false }
    }
  }

  async requestPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (!this.isSupported()) return { notifications: false, exactAlarm: false }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.LocalNotifications
      if (!plugin) return { notifications: false, exactAlarm: false }
      const res = await plugin.requestPermissions()
      return {
        notifications: res.display === 'granted',
        exactAlarm: true
      }
    } catch {
      return { notifications: false, exactAlarm: false }
    }
  }

  async schedule(reminder: ReminderItem): Promise<{ success: boolean; nativeId?: number; error?: string }> {
    if (!this.isSupported()) return { success: false, error: 'Plataforma nativa no disponible.' }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.LocalNotifications
      if (!plugin) return { success: false, error: 'Plugin no instalado.' }

      const nativeId = reminder.nativeNotificationId || Math.floor(Math.random() * 1000000)
      const scheduledDate = new Date(reminder.scheduledAt)

      await plugin.schedule({
        notifications: [
          {
            title: `🔔 FAMILY-HUB: ${reminder.title}`,
            body: reminder.body || 'Recordatorio del hogar',
            id: nativeId,
            schedule: { at: scheduledDate, allowWhileIdle: true },
            sound: 'chime.wav',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              reminderId: reminder.id,
              targetType: reminder.targetType,
              targetId: reminder.targetId
            }
          }
        ]
      })

      return { success: true, nativeId }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async cancel(reminder: ReminderItem): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported() || !reminder.nativeNotificationId) return { success: true }
    try {
      const plugin = (window as any).Capacitor?.Plugins?.LocalNotifications
      if (plugin) {
        await plugin.cancel({
          notifications: [{ id: reminder.nativeNotificationId }]
        })
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

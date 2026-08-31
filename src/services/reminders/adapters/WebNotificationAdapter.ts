/**
 * Adaptador de Notificaciones Web para FAMILY-HUB
 * Gestiona permisos de Notification API, Web Notifications y avisos sonoros sintetizados.
 */

import type { ReminderAdapterInterface, ReminderItem } from '../../../types/reminder'

export class WebNotificationAdapter implements ReminderAdapterInterface {
  private activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  isSystemAlarmAvailable(): boolean {
    // En Web/PWA no existe una API estándar para alarmas reales de reloj de sistema
    return false
  }

  async checkPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (!this.isSupported()) return { notifications: false, exactAlarm: false }
    return {
      notifications: Notification.permission === 'granted',
      exactAlarm: false
    }
  }

  async requestPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (!this.isSupported()) return { notifications: false, exactAlarm: false }
    try {
      const res = await Notification.requestPermission()
      return {
        notifications: res === 'granted',
        exactAlarm: false
      }
    } catch {
      return { notifications: false, exactAlarm: false }
    }
  }

  async schedule(reminder: ReminderItem): Promise<{ success: boolean; nativeId?: number; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Notificaciones no soportadas en este navegador.' }
    }

    const scheduledTime = new Date(reminder.scheduledAt).getTime()
    const now = Date.now()
    const diffMs = scheduledTime - now

    if (diffMs <= 0) {
      // Si la fecha ya llegó o pasó inmediatamente, disparar alerta
      this.triggerNotification(reminder)
      return { success: true }
    }

    // Programar temporizador activo en memoria
    if (this.activeTimers.has(reminder.id)) {
      clearTimeout(this.activeTimers.get(reminder.id)!)
    }

    // Nota: setTimeout maneja hasta ~24.8 días (2^31-1 ms)
    if (diffMs < 2147483647) {
      const timer = setTimeout(() => {
        this.triggerNotification(reminder)
        this.activeTimers.delete(reminder.id)
      }, diffMs)
      this.activeTimers.set(reminder.id, timer)
    }

    return { success: true }
  }

  async cancel(reminder: ReminderItem): Promise<{ success: boolean; error?: string }> {
    if (this.activeTimers.has(reminder.id)) {
      clearTimeout(this.activeTimers.get(reminder.id)!)
      this.activeTimers.delete(reminder.id)
    }
    return { success: true }
  }

  /**
   * Dispara una notificación visual y un sonido sutil de campana
   */
  private triggerNotification(reminder: ReminderItem) {
    this.playChime()

    if (Notification.permission === 'granted') {
      try {
        new Notification(`🔔 FAMILY-HUB: ${reminder.title}`, {
          body: reminder.body || `Recordatorio programado para tu hogar.`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: reminder.id
        })
      } catch (err) {
        console.warn('⚠️ No se pudo disparar notificación de navegador:', err)
      }
    }
  }

  /**
   * Genera un tono sonoro sutil tipo Apple con Web Audio API (0 dependencias externas)
   */
  private playChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15) // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.65)
    } catch {}
  }
}

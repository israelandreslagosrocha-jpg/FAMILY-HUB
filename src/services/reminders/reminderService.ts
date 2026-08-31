/**
 * Servicio Central de Recordatorios y Alarmas para FAMILY-HUB
 * 
 * Responsabilidades:
 * - Persistencia y reconciliación en IndexedDB (almacenamiento local seguro)
 * - Delegación de la programación real a adaptadores de plataforma (WebNotificationAdapter, NativeNotificationAdapter, SystemAlarmAdapter)
 * - Idempotencia por operación para evitar doble pulsación
 * - Gestión del ciclo de vida: creación, consulta, edición y cancelación
 */

import { WebNotificationAdapter } from './adapters/WebNotificationAdapter'
import { NativeNotificationAdapter } from './adapters/NativeNotificationAdapter'
import { SystemAlarmAdapter } from './adapters/SystemAlarmAdapter'
import type { 
  ReminderItem, 
  ScheduleReminderParams, 
  ReminderAdapterInterface,
  ReminderPlatform 
} from '../../types/reminder'

const DB_NAME = 'family_hub_reminders_db'
const DB_VERSION = 1
const STORE_NAME = 'idb_reminders'

export class ReminderService {
  private webAdapter: WebNotificationAdapter
  private nativeAdapter: NativeNotificationAdapter
  private systemAlarmAdapter: SystemAlarmAdapter
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor() {
    this.webAdapter = new WebNotificationAdapter()
    this.nativeAdapter = new NativeNotificationAdapter()
    this.systemAlarmAdapter = new SystemAlarmAdapter()
  }

  /**
   * Determina la plataforma activa en runtime
   */
  getPlatform(): ReminderPlatform {
    if (typeof window === 'undefined') return 'web'
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
    if (!isNative) return 'web'
    const platform = (window as any).Capacitor?.getPlatform?.()
    if (platform === 'android') return 'android'
    if (platform === 'ios') return 'ios'
    return 'web'
  }

  /**
   * Retorna el adaptador de programación adecuado según el modo y plataforma
   */
  private getAdapter(mode: 'notification' | 'system_alarm'): ReminderAdapterInterface {
    if (mode === 'system_alarm' && this.systemAlarmAdapter.isSupported()) {
      return this.systemAlarmAdapter
    }
    if (this.nativeAdapter.isSupported()) {
      return this.nativeAdapter
    }
    return this.webAdapter
  }

  /**
   * Inicializa o conecta con la base de datos IndexedDB local
   */
  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no está disponible en este entorno.'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('by_target', ['targetType', 'targetId'], { unique: false })
          store.createIndex('by_status', 'status', { unique: false })
          store.createIndex('by_idempotency', 'operationIdempotencyKey', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  /**
   * Programa un nuevo recordatorio o alarma con persistencia en IndexedDB y delegación a adapter
   */
  async scheduleReminder(params: ScheduleReminderParams): Promise<ReminderItem> {
    const platform = this.getPlatform()
    const mode = params.mode || 'notification'
    const idempotencyKey = params.operationIdempotencyKey || `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // 1. Comprobar si ya existe una operación con la misma idempotencyKey (evitar doble clic)
    const existing = await this.getByIdempotencyKey(idempotencyKey)
    if (existing) {
      return existing
    }

    const adapter = this.getAdapter(mode)
    const adapterType = mode === 'system_alarm' && this.systemAlarmAdapter.isSupported()
      ? 'native_system_alarm'
      : (this.nativeAdapter.isSupported() ? 'native_local' : 'web_notification')

    const reminderId = `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const nowIso = new Date().toISOString()

    const reminderItem: ReminderItem = {
      id: reminderId,
      targetType: params.targetType,
      targetId: params.targetId,
      title: params.title,
      body: params.body,
      scheduledAt: params.scheduledAt,
      relativeOffsetMinutes: params.relativeOffsetMinutes,
      mode,
      status: 'scheduled',
      platform,
      adapter: adapterType,
      operationIdempotencyKey: idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso
    }

    // 2. Programar en el adaptador de plataforma
    const scheduleResult = await adapter.schedule(reminderItem)
    if (scheduleResult.nativeId) {
      reminderItem.nativeNotificationId = scheduleResult.nativeId
    }

    // 3. Persistir en IndexedDB local
    await this.persistToIDB(reminderItem)

    return reminderItem
  }

  /**
   * Obtiene todos los recordatorios guardados localmente
   */
  async getAllReminders(): Promise<ReminderItem[]> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
    } catch {
      return []
    }
  }

  /**
   * Obtiene el recordatorio activo para una entidad específica (ej. tarea, evento o gasto)
   */
  async getReminderForTarget(targetType: string, targetId: string): Promise<ReminderItem | undefined> {
    const all = await this.getAllReminders()
    return all.find(r => r.targetType === targetType && r.targetId === targetId && r.status === 'scheduled')
  }

  /**
   * Cancela un recordatorio tanto en el adaptador de plataforma como en IndexedDB
   */
  async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      const all = await this.getAllReminders()
      const item = all.find(r => r.id === reminderId)
      if (!item) return false

      // 1. Cancelar en el adaptador correspondiente
      const adapter = this.getAdapter(item.mode)
      await adapter.cancel(item)

      // 2. Actualizar estado a 'cancelled' en IndexedDB
      item.status = 'cancelled'
      item.updatedAt = new Date().toISOString()
      await this.persistToIDB(item)

      return true
    } catch (err) {
      console.error('❌ Error al cancelar recordatorio:', err)
      return false
    }
  }

  /**
   * Reconcilia y re-programa recordatorios futuros al abrir la aplicación
   */
  async reconcilePendingReminders(): Promise<void> {
    try {
      const all = await this.getAllReminders()
      const now = Date.now()

      for (const item of all) {
        if (item.status === 'scheduled') {
          const scheduledTime = new Date(item.scheduledAt).getTime()
          if (scheduledTime > now) {
            const adapter = this.getAdapter(item.mode)
            await adapter.schedule(item)
          } else {
            // Ya venció mientras la app no estaba activa
            item.status = 'triggered'
            item.updatedAt = new Date().toISOString()
            await this.persistToIDB(item)
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudieron reconciliar recordatorios locales:', e)
    }
  }

  private async getByIdempotencyKey(key: string): Promise<ReminderItem | undefined> {
    try {
      const all = await this.getAllReminders()
      return all.find(r => r.operationIdempotencyKey === key)
    } catch {
      return undefined
    }
  }

  private async persistToIDB(item: ReminderItem): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(item)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Comprueba permisos de notificaciones y alarmas
   */
  async checkPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean; systemAlarmAvailable: boolean }> {
    const webRes = await this.webAdapter.checkPermissions()
    const nativeRes = await this.nativeAdapter.checkPermissions()
    const isSysAlarm = await this.systemAlarmAdapter.isSystemAlarmAvailable()

    return {
      notifications: this.nativeAdapter.isSupported() ? nativeRes.notifications : webRes.notifications,
      exactAlarm: nativeRes.exactAlarm,
      systemAlarmAvailable: isSysAlarm
    }
  }

  /**
   * Solicita permisos contextualmente
   */
  async requestPermissions(): Promise<{ notifications: boolean; exactAlarm?: boolean }> {
    if (this.nativeAdapter.isSupported()) {
      return await this.nativeAdapter.requestPermissions()
    }
    return await this.webAdapter.requestPermissions()
  }
}

export const reminderService = new ReminderService()

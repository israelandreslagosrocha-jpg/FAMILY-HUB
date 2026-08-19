import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OfflineQueueItem, SyncStateEnum, MutationEntityEnum, RiskLevelEnum } from '../types'

export const usePWAStore = defineStore('pwaStore', () => {
  // Estado de Conectividad Efectiva y PWA
  const isOnline = ref<boolean>(true)
  const isInstallPromptVisible = ref<boolean>(true)
  const lastStaleTime = ref<string | null>(null)

  // Cola Offline Simulada
  const offlineQueue = ref<OfflineQueueItem[]>([
    {
      id: 'q-101',
      operation: 'CREATE',
      entity: 'expense',
      riskLevel: 'high',
      payload: { title: 'Compra Supermercado Offline', amount: 32500, date: '2026-08-19' },
      createdAt: '2026-08-19 12:30',
      attempts: 0,
      status: 'pending',
      idempotencyKey: 'idemp-exp-32500-178715'
    },
    {
      id: 'q-102',
      operation: 'UPDATE',
      entity: 'task',
      riskLevel: 'low',
      payload: { taskId: 't-1', completed: true },
      createdAt: '2026-08-19 12:45',
      attempts: 0,
      status: 'pending',
      idempotencyKey: 'idemp-tsk-complete-t1'
    }
  ])

  // Cómputo del Estado General de Sincronización
  const syncState = computed<SyncStateEnum>(() => {
    if (!isOnline.value) {
      const hasFailed = offlineQueue.value.some(q => q.status === 'failed')
      return hasFailed ? 'sync_error' : 'pending_sync'
    }
    const isSyncing = offlineQueue.value.some(q => q.status === 'syncing')
    if (isSyncing) return 'syncing'
    const hasPending = offlineQueue.value.some(q => q.status === 'pending')
    return hasPending ? 'pending_sync' : 'synced'
  })

  const pendingCount = computed(() => offlineQueue.value.filter(q => q.status !== 'synced').length)

  // Acciones
  function toggleOnlineState() {
    isOnline.value = !isOnline.value
    if (!isOnline.value) {
      lastStaleTime.value = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    } else {
      drainOfflineQueue()
    }
  }

  function addOfflineMutation(
    entity: MutationEntityEnum,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    payload: any,
    riskLevel: RiskLevelEnum = 'medium'
  ) {
    const item: OfflineQueueItem = {
      id: `q-${Date.now()}`,
      operation,
      entity,
      riskLevel,
      payload,
      createdAt: new Date().toLocaleString('es-CL'),
      attempts: 0,
      status: 'pending',
      idempotencyKey: `idemp-${entity}-${Date.now()}`
    }
    offlineQueue.value.push(item)

    if (isOnline.value) {
      drainOfflineQueue()
    }
  }

  async function drainOfflineQueue() {
    if (offlineQueue.value.length === 0) return

    for (const item of offlineQueue.value) {
      if (item.status === 'synced') continue

      item.status = 'syncing'
      item.attempts += 1
      await new Promise(r => setTimeout(r, 600)) // Simulación de latencia de red

      // Simular fallo voluntario en el primer intento para elementos de alto riesgo si corresponde
      if (item.riskLevel === 'high' && item.attempts === 1 && Math.random() < 0.2) {
        item.status = 'failed'
        item.lastError = 'Conexión intermitente. Reintento manual requerido para validar registro financiero.'
      } else {
        item.status = 'synced'
        item.syncedAt = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      }
    }
  }

  function dismissInstallPrompt() {
    isInstallPromptVisible.value = false
  }

  return {
    isOnline,
    isInstallPromptVisible,
    lastStaleTime,
    offlineQueue,
    syncState,
    pendingCount,
    toggleOnlineState,
    addOfflineMutation,
    drainOfflineQueue,
    dismissInstallPrompt
  }
})

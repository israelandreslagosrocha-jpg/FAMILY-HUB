<script setup lang="ts">
import { usePWAStore } from '../../stores/pwaStore'

const pwaStore = usePWAStore()

function handleToggleStatus() {
  pwaStore.toggleOnlineState()
}
</script>

<template>
  <button 
    class="network-status-badge"
    :class="{
      'state-online': pwaStore.syncState === 'synced',
      'state-offline': pwaStore.syncState === 'pending_sync',
      'state-syncing': pwaStore.syncState === 'syncing',
      'state-error': pwaStore.syncState === 'sync_error'
    }"
    title="Haz clic para alternar la simulación de conectividad en línea / offline"
    @click="handleToggleStatus"
  >
    <!-- Estado 1: Online y Sincronizado -->
    <template v-if="pwaStore.syncState === 'synced'">
      <span class="status-dot dot-online"></span>
      <span class="status-text">🟢 En línea</span>
    </template>

    <!-- Estado 2: Modo Offline con pendientes -->
    <template v-else-if="pwaStore.syncState === 'pending_sync'">
      <span class="status-dot dot-offline"></span>
      <span class="status-text">
        🟠 Modo Offline
        <span v-if="pwaStore.pendingCount > 0" class="pending-count">({{ pwaStore.pendingCount }} pend.)</span>
      </span>
    </template>

    <!-- Estado 3: Sincronizando -->
    <template v-else-if="pwaStore.syncState === 'syncing'">
      <span class="status-spinner">🔄</span>
      <span class="status-text">Sincronizando...</span>
    </template>

    <!-- Estado 4: Error de sincronización -->
    <template v-else-if="pwaStore.syncState === 'sync_error'">
      <span class="status-dot dot-error"></span>
      <span class="status-text">🔴 Error Sync</span>
    </template>
  </button>
</template>

<style scoped>
.network-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

@media (prefers-color-scheme: dark) {
  .network-status-badge {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.network-status-badge:hover {
  transform: scale(1.03);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-online { background: #10b981; box-shadow: 0 0 8px #10b981; }
.dot-offline { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.dot-error { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

.status-spinner {
  font-size: 0.85rem;
  animation: spin 1s linear infinite;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.state-online { color: #065f46; border-color: rgba(16, 185, 129, 0.3); }
.state-offline { color: #92400e; border-color: rgba(245, 158, 11, 0.4); background: #fef3c7; }
.state-syncing { color: #1e40af; border-color: rgba(59, 130, 246, 0.3); }
.state-error { color: #991b1b; border-color: rgba(239, 68, 68, 0.4); background: #fee2e2; }

@media (prefers-color-scheme: dark) {
  .state-online { color: #34d399; }
  .state-offline { color: #fbbf24; background: rgba(180, 83, 9, 0.2); }
  .state-syncing { color: #60a5fa; }
  .state-error { color: #f87171; background: rgba(185, 28, 28, 0.2); }
}

.pending-count {
  font-weight: 800;
  opacity: 0.9;
}
</style>

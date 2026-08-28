<script setup lang="ts">
import { usePWAStore } from '../stores/pwaStore'

const pwaStore = usePWAStore()

function handleForceDrain() {
  pwaStore.drainOfflineQueue()
}

function handleToggleOnline() {
  pwaStore.toggleOnlineState()
}
</script>

<template>
  <div class="offline-center-page">
    <header class="offline-header glass-card">
      <div class="header-left">
        <span class="header-icon">⚡</span>
        <div class="header-texts">
          <h2 class="header-title">Centro de Sincronización & Offline</h2>
          <p class="header-subtitle">Gestión de mutaciones locales e idempotencia del hogar</p>
        </div>
      </div>

      <button class="toggle-net-btn" @click="handleToggleOnline">
        {{ pwaStore.isOnline ? '🌐 Modo Online (Simular Cortar Red)' : '📶 Modo Offline (Simular Reconectar)' }}
      </button>
    </header>

    <main class="offline-main">
      <div class="status-summary-card glass-card">
        <div class="summary-col">
          <span class="summary-label">Estado de Conectividad</span>
          <span class="summary-val" :class="{ online: pwaStore.isOnline, offline: !pwaStore.isOnline }">
            {{ pwaStore.isOnline ? '🟢 Conectado con Supabase Backend' : '🟠 Sin Conexión (Modo Local Offline)' }}
          </span>
        </div>

        <div class="summary-col">
          <span class="summary-label">Mutaciones Pendientes</span>
          <span class="summary-val">{{ pwaStore.pendingCount }} cambios</span>
        </div>

        <button 
          class="drain-btn" 
          :disabled="!pwaStore.isOnline || pwaStore.pendingCount === 0"
          @click="handleForceDrain"
        >
          🔄 Forzar Sincronización
        </button>
      </div>

      <div class="queue-section">
        <h3 class="section-title">📦 Cola de Mutaciones en IndexedDB ({{ pwaStore.offlineQueue.length }})</h3>

        <div class="queue-list">
          <div 
            v-for="item in pwaStore.offlineQueue" 
            :key="item.id"
            class="queue-card glass-card"
            :class="{ [item.status]: true }"
          >
            <div class="queue-header">
              <div class="entity-info">
                <span class="op-badge" :class="item.operation">{{ item.operation }}</span>
                <span class="entity-name">{{ item.entity.toUpperCase() }}</span>
                <span 
                  class="risk-badge" 
                  :class="item.riskLevel"
                  :title="item.riskLevel === 'high' ? 'Nivel C (Alto Riesgo Financiero): Tratamiento estricto' : 'Nivel A/B'"
                >
                  Riesgo: {{ item.riskLevel.toUpperCase() }}
                </span>
              </div>

              <span class="item-status-chip" :class="item.status">
                {{ item.status === 'synced' ? '✅ Sincronizado' : item.status === 'syncing' ? '🔄 Enviando...' : item.status === 'failed' ? '🔴 Error' : '⏳ Pendiente' }}
              </span>
            </div>

            <div class="queue-body">
              <code class="payload-text">{{ JSON.stringify(item.payload) }}</code>
              <span class="idemp-key">Idempotency Key: {{ item.idempotencyKey }}</span>
            </div>

            <div v-if="item.lastError" class="error-msg">
              ⚠️ {{ item.lastError }}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.offline-center-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: 5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.offline-header {
  display: flex;
  flex-direction: column;
  padding: 1.15rem 1.25rem;
  border-radius: 20px;
  gap: 0.85rem;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .offline-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.header-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header-title {
  font-size: clamp(1.05rem, 4vw, 1.25rem);
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.header-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0;
  line-height: 1.35;
}

.toggle-net-btn {
  padding: 0.65rem 1rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(0, 0, 0, 0.04);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .toggle-net-btn {
    width: auto;
  }
}

:root[data-theme="dark"] .toggle-net-btn {
  background: rgba(255, 255, 255, 0.06);
}

.status-summary-card {
  display: flex;
  flex-direction: column;
  padding: 1.15rem 1.25rem;
  border-radius: 20px;
  gap: 0.85rem;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .status-summary-card {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
}

.summary-col {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.summary-val {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-primary);
}

.summary-val.online { color: #10b981; }
.summary-val.offline { color: #f59e0b; }

.drain-btn {
  padding: 0.75rem 1.25rem;
  min-height: 48px;
  border-radius: 14px;
  background: #3b82f6;
  color: #fff;
  border: none;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  transition: transform 0.15s, background 0.15s;
  width: 100%;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 640px) {
  .drain-btn {
    width: auto;
  }
}

.drain-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.drain-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.queue-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.section-title {
  font-size: clamp(1rem, 3.5vw, 1.15rem);
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
}

.queue-card {
  padding: 1rem 1.15rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border-left: 4px solid #f59e0b;
  width: 100%;
  box-sizing: border-box;
}

.queue-card.synced { border-left-color: #10b981; }
.queue-card.failed { border-left-color: #ef4444; }

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.entity-info {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.op-badge {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-primary);
}

.op-badge.CREATE { background: #dcfce7; color: #15803d; }
.op-badge.UPDATE { background: #dbeafe; color: #1e40af; }
.op-badge.DELETE { background: #ffe4e6; color: #be123c; }

.entity-name {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-primary);
}

.risk-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
}

.risk-badge.high { background: #fee2e2; color: #991b1b; }
.risk-badge.medium { background: #fef3c7; color: #92400e; }
.risk-badge.low { background: #e0e7ff; color: #3730a3; }

.item-status-chip {
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
}

.queue-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: rgba(0, 0, 0, 0.03);
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  box-sizing: border-box;
}

:root[data-theme="dark"] .queue-body {
  background: rgba(255, 255, 255, 0.04);
}

.payload-text {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-primary);
  word-break: break-all;
  overflow-wrap: anywhere;
  line-height: 1.35;
}

.idemp-key {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 700;
  word-break: break-all;
}

.error-msg {
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 700;
  line-height: 1.35;
}
</style>

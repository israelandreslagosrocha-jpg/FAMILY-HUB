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
  gap: 1.25rem;
  padding-bottom: 5rem;
}

.offline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-radius: 20px;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left { display: flex; align-items: center; gap: 0.85rem; }
.header-icon { font-size: 2rem; }
.header-texts { display: flex; flex-direction: column; }
.header-title { font-size: 1.2rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.header-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin: 0.15rem 0 0; }

.toggle-net-btn {
  padding: 0.55rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.12);
  background: rgba(0,0,0,0.04);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-primary);
}

.status-summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  border-radius: 20px;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary-col { display: flex; flex-direction: column; gap: 0.2rem; }
.summary-label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
.summary-val { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
.summary-val.online { color: #10b981; }
.summary-val.offline { color: #f59e0b; }

.drain-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 12px;
  background: #3b82f6;
  color: #fff;
  border: none;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
.drain-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.section-title { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.85rem; color: var(--text-primary); }

.queue-list { display: flex; flex-direction: column; gap: 0.85rem; }

.queue-card {
  padding: 1rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border-left: 4px solid #f59e0b;
}

.queue-card.synced { border-left-color: #10b981; }
.queue-card.failed { border-left-color: #ef4444; }

.queue-header { display: flex; justify-content: space-between; align-items: center; }
.entity-info { display: flex; align-items: center; gap: 0.5rem; }

.op-badge { font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: rgba(0,0,0,0.06); color: var(--text-primary); }
.op-badge.CREATE { background: #dcfce7; color: #15803d; }
.op-badge.UPDATE { background: #dbeafe; color: #1e40af; }
.op-badge.DELETE { background: #ffe4e6; color: #be123c; }

.entity-name { font-size: 0.82rem; font-weight: 800; color: var(--text-primary); }
.risk-badge { font-size: 0.68rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
.risk-badge.high { background: #fee2e2; color: #991b1b; }
.risk-badge.medium { background: #fef3c7; color: #92400e; }
.risk-badge.low { background: #e0e7ff; color: #3730a3; }

.item-status-chip { font-size: 0.75rem; font-weight: 700; }

.queue-body { display: flex; flex-direction: column; gap: 0.2rem; background: rgba(0,0,0,0.03); padding: 0.5rem 0.75rem; border-radius: 8px; }
.payload-text { font-size: 0.75rem; font-family: monospace; color: var(--text-primary); word-break: break-all; }
.idemp-key { font-size: 0.68rem; color: var(--text-secondary); }
.error-msg { font-size: 0.75rem; color: #ef4444; font-weight: 600; }
</style>

<script setup lang="ts">
import { useAutomationStore } from '../../stores/automationStore'

const automationStore = useAutomationStore()
</script>

<template>
  <div class="execution-logs-container">
    <div class="section-intro-card glass-card">
      <span class="intro-icon">📜</span>
      <div class="intro-text">
        <h3 class="intro-title">Bitácora de Ejecuciones & Idempotencia</h3>
        <p class="intro-desc">Histórico inalterable de ejecuciones automáticas con verificación contra disparos duplicados.</p>
      </div>
    </div>

    <div class="logs-list">
      <div 
        v-for="log in automationStore.executionLogs" 
        :key="log.id"
        class="log-card glass-card"
      >
        <div class="log-header">
          <div class="log-title-row">
            <span class="status-icon">✅</span>
            <h4 class="rule-name">{{ log.ruleName }}</h4>
          </div>
          <span class="triggered-time">{{ log.triggeredAt }}</span>
        </div>

        <p class="log-details">{{ log.details }}</p>

        <div class="log-footer">
          <span class="idempotent-tag" v-if="log.isIdempotentVerified">
            ✓ Verificada Idempotencia (Ejecución Única)
          </span>
          <span class="status-tag success">Éxito</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.execution-logs-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-intro-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
}

.intro-icon { font-size: 1.8rem; }
.intro-title { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.intro-desc { font-size: 0.83rem; color: var(--text-secondary); margin: 0.15rem 0 0; }

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.log-card {
  padding: 1rem 1.25rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon { font-size: 1rem; }

.rule-name {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.triggered-time {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.log-details {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.log-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.2rem;
  padding-top: 0.4rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
}

.idempotent-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.status-tag.success {
  font-size: 0.72rem;
  font-weight: 700;
  color: #2563eb;
}
</style>

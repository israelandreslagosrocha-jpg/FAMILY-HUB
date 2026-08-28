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
  gap: var(--space-4);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.section-intro-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.15rem;
  border-radius: 16px;
  box-sizing: border-box;
}

.intro-icon { font-size: 1.6rem; flex-shrink: 0; }
.intro-title { font-size: 0.95rem; font-weight: 800; margin: 0; color: var(--text-primary); }
.intro-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0.15rem 0 0; line-height: 1.35; }

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
}

.log-card {
  padding: 1rem 1.15rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  box-sizing: border-box;
  width: 100%;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.log-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon { font-size: 1rem; flex-shrink: 0; }

.rule-name {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.triggered-time {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-weight: 700;
}

.log-details {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.35;
  margin: 0;
}

.log-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.2rem;
  padding-top: 0.4rem;
  border-top: 1px dashed var(--border-subtle);
  flex-wrap: wrap;
  gap: 0.4rem;
}

.idempotent-tag {
  font-size: 0.72rem;
  font-weight: 800;
  color: #059669;
  background: rgba(16, 185, 129, 0.12);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.status-tag.success {
  font-size: 0.72rem;
  font-weight: 800;
  color: #2563eb;
}
</style>

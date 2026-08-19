<script setup lang="ts">
import { useAutomationStore } from '../../stores/automationStore'
import type { AutomationTabType } from '../../types'

const automationStore = useAutomationStore()

function handleTab(tab: AutomationTabType) {
  automationStore.setTab(tab)
}
</script>

<template>
  <header class="automation-header glass-card">
    <div class="header-main-row">
      <div class="title-col">
        <h2 class="header-title">⚡ Automatizaciones del Hogar</h2>
        <p class="header-subtitle">Recetas automáticas para reducir la carga operativa de la familia</p>
      </div>
    </div>

    <!-- Selector de Pestañas -->
    <div class="tab-selector-bar">
      <button 
        class="tab-btn"
        :class="{ active: automationStore.activeTab === 'recipes' }"
        @click="handleTab('recipes')"
      >
        <span>⚡ Recetas del Hogar</span>
      </button>

      <button 
        class="tab-btn"
        :class="{ active: automationStore.activeTab === 'active_rules' }"
        @click="handleTab('active_rules')"
      >
        <span>🛠️ Reglas Activas</span>
        <span class="count-badge">{{ automationStore.activeRules.filter(r => r.isActive).length }}</span>
      </button>

      <button 
        class="tab-btn"
        :class="{ active: automationStore.activeTab === 'execution_logs' }"
        @click="handleTab('execution_logs')"
      >
        <span>📜 Histórico</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.automation-header {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
  border-radius: 20px;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.header-subtitle {
  font-size: 0.83rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0;
}

.tab-selector-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
  overflow-x: auto;
}

@media (prefers-color-scheme: dark) {
  .tab-selector-bar {
    background: rgba(255, 255, 255, 0.1);
  }
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 9px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .tab-btn.active {
    background: #1e293b;
    color: #f8fafc;
  }
}

.count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
}
</style>

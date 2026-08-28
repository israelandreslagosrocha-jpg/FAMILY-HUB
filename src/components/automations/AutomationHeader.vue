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
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: 1rem;
  border-radius: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: clamp(1.1rem, 4vw, 1.3rem);
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.header-subtitle {
  font-size: 0.83rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0;
  line-height: 1.35;
}

.tab-selector-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  width: 100%;
  box-sizing: border-box;
}

.tab-selector-bar::-webkit-scrollbar {
  display: none;
}

:root[data-theme="dark"] .tab-selector-bar {
  background: rgba(255, 255, 255, 0.08);
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.55rem 0.85rem;
  min-height: var(--touch-target-min);
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .tab-btn.active {
  background: #1e293b;
  color: #f8fafc;
}

.count-badge {
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
  padding: 0.15rem 0.45rem;
  border-radius: 10px;
}

:root[data-theme="dark"] .count-badge {
  color: #60a5fa;
}
</style>

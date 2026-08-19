<script setup lang="ts">
import { useAutomationStore } from '../../stores/automationStore'

const automationStore = useAutomationStore()

function handleToggle(ruleId: string) {
  automationStore.toggleRuleActive(ruleId)
}
</script>

<template>
  <div class="active-rules-container">
    <div v-if="automationStore.activeRules.length === 0" class="glass-card empty-card">
      <span class="empty-icon">⚡</span>
      <h3 class="empty-title">Sin automatizaciones activas</h3>
      <p class="empty-desc">Activa una receta del catálogo o crea una nueva regla para comenzar.</p>
    </div>

    <div v-else class="rules-list">
      <div 
        v-for="rule in automationStore.activeRules" 
        :key="rule.id"
        class="rule-card glass-card"
        :class="{ 'is-disabled': !rule.isActive }"
      >
        <!-- Encabezado de la Regla -->
        <div class="rule-card-header">
          <div class="rule-title-col">
            <div class="name-row">
              <h3 class="rule-name">{{ rule.name }}</h3>
              <span class="category-type-pill" :class="rule.category">
                {{ rule.category === 'data_event' ? 'En tiempo real' : 'Programada' }}
              </span>
            </div>
            <p class="rule-desc">{{ rule.description }}</p>
          </div>

          <!-- Switcher Activa / Inactiva -->
          <div class="rule-toggle-col">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="rule.isActive"
                @change="handleToggle(rule.id)"
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- Bloque Visual de Lógica de 3 Bloques (Cuando -> Si -> Entonces) -->
        <div class="logic-blocks-grid">
          <!-- Bloque 1: CUANDO -->
          <div class="block-card block-when">
            <span class="block-icon">⚡</span>
            <div class="block-content">
              <span class="block-title">CUANDO</span>
              <span class="block-text">{{ rule.triggerText }}</span>
            </div>
          </div>

          <!-- Bloque 2: SI -->
          <div v-if="rule.conditionText" class="block-card block-if">
            <span class="block-icon">🔍</span>
            <div class="block-content">
              <span class="block-title">SI</span>
              <span class="block-text">{{ rule.conditionText }}</span>
            </div>
          </div>

          <!-- Bloque 3: ENTONCES -->
          <div class="block-card block-then">
            <span class="block-icon">🚀</span>
            <div class="block-content">
              <span class="block-title">ENTONCES</span>
              <span class="block-text">{{ rule.actionText }}</span>
            </div>
          </div>
        </div>

        <!-- Footer con Estadísticas de Ejecución -->
        <div class="rule-card-footer">
          <span class="exec-count">
            🔄 Ejecutada {{ rule.executionCount }} veces
          </span>
          <span class="status-indicator" :class="{ active: rule.isActive }">
            {{ rule.isActive ? '● En ejecución' : '○ En pausa' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-rules-container {
  display: flex;
  flex-direction: column;
}

.empty-card {
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 20px;
}

.empty-icon { font-size: 2.5rem; }
.empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0.5rem 0 0.25rem; }
.empty-desc { font-size: 0.9rem; color: var(--text-secondary); }

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.rule-card {
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: opacity 0.2s ease;
}

.rule-card.is-disabled {
  opacity: 0.55;
}

.rule-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.rule-title-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.rule-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.category-type-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
}

.category-type-pill.data_event {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.category-type-pill.scheduled_time {
  background: rgba(168, 85, 247, 0.15);
  color: #9333ea;
}

.rule-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #ccc;
  transition: 0.2s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider { background-color: #10b981; }
input:checked + .slider:before { transform: translateX(20px); }

.logic-blocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.block-card {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.6);
}

@media (prefers-color-scheme: dark) {
  .block-card {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.block-icon { font-size: 1.1rem; margin-top: 1px; }

.block-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.block-title {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.block-when .block-title { color: #d97706; }
.block-if .block-title { color: #2563eb; }
.block-then .block-title { color: #059669; }

.block-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.rule-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.6rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.exec-count { font-weight: 600; }
.status-indicator { font-weight: 700; color: #64748b; }
.status-indicator.active { color: #10b981; }
</style>

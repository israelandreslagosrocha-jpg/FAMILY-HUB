<script setup lang="ts">
import { useAutomationStore } from '../stores/automationStore'
import AutomationHeader from '../components/automations/AutomationHeader.vue'
import RecipesCatalogView from '../components/automations/RecipesCatalogView.vue'
import ActiveRulesView from '../components/automations/ActiveRulesView.vue'
import ExecutionLogsView from '../components/automations/ExecutionLogsView.vue'
import CreateAutomationSheet from '../components/automations/CreateAutomationSheet.vue'

const automationStore = useAutomationStore()

function handleOpenCreateSheet() {
  automationStore.openCreateSheet()
}
</script>

<template>
  <div class="automations-page-view">
    <!-- Header del Módulo -->
    <AutomationHeader />

    <!-- Área Principal de Contenido dinámico según Pestaña -->
    <main class="automations-main-content">
      <!-- Pestaña 1: Recetas Prediseñadas del Hogar -->
      <RecipesCatalogView v-if="automationStore.activeTab === 'recipes'" />

      <!-- Pestaña 2: Mis Reglas Activas -->
      <ActiveRulesView v-else-if="automationStore.activeTab === 'active_rules'" />

      <!-- Pestaña 3: Histórico de Ejecución e Idempotencia -->
      <ExecutionLogsView v-else-if="automationStore.activeTab === 'execution_logs'" />
    </main>

    <!-- Botón Flotante Universal (+) -->
    <button 
      class="fab-add-button" 
      title="Crear nueva automatización"
      @click="handleOpenCreateSheet"
    >
      <span class="fab-icon">+</span>
    </button>

    <!-- Modal Sheet Constructor Visual de 3 Bloques -->
    <CreateAutomationSheet />
  </div>
</template>

<style scoped>
.automations-page-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 5rem;
  position: relative;
  min-height: 80vh;
}

.automations-main-content {
  flex: 1;
}

.fab-add-button {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + max(1rem, var(--sab)));
  right: max(1.25rem, var(--sar));
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  touch-action: manipulation;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
}

.fab-add-button:hover {
  transform: scale(1.08);
  background: #2563eb;
}

.fab-add-button:active {
  transform: scale(0.95);
}

.fab-icon {
  font-size: 2rem;
  font-weight: 400;
  line-height: 1;
}

@media (min-width: 768px) {
  .fab-add-button {
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
  }
}
</style>

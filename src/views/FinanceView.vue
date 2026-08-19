<script setup lang="ts">
import { useFinanceStore } from '../stores/financeStore'
import FinanceHeader from '../components/finance/FinanceHeader.vue'
import OverviewSummaryView from '../components/finance/OverviewSummaryView.vue'
import MovementsListView from '../components/finance/MovementsListView.vue'
import BudgetsProgressView from '../components/finance/BudgetsProgressView.vue'
import CreateMovementSheet from '../components/finance/CreateMovementSheet.vue'

const financeStore = useFinanceStore()

function handleOpenCreateSheet() {
  financeStore.openCreateSheet()
}
</script>

<template>
  <div class="finance-page-view">
    <!-- Header del Módulo de Finanzas -->
    <FinanceHeader />

    <!-- Área Principal de Contenido dinámico según Pestaña -->
    <main class="finance-main-content">
      <!-- Pestaña 1: Resumen & Gráficos -->
      <OverviewSummaryView v-if="financeStore.activeTab === 'overview'" />

      <!-- Pestaña 2: Movimientos Cronológicos -->
      <MovementsListView v-else-if="financeStore.activeTab === 'movements'" />

      <!-- Pestaña 3: Presupuestos por Categoría -->
      <BudgetsProgressView v-else-if="financeStore.activeTab === 'budgets'" />
    </main>

    <!-- Botón Flotante Universal (+) para registrar Movimientos rápidamente -->
    <button 
      class="fab-add-button" 
      title="Registrar movimiento financiero"
      @click="handleOpenCreateSheet"
    >
      <span class="fab-icon">+</span>
    </button>

    <!-- Modal Sheet Táctil de Registro Financiero -->
    <CreateMovementSheet />
  </div>
</template>

<style scoped>
.finance-page-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 5rem;
  position: relative;
  min-height: 80vh;
}

.finance-main-content {
  flex: 1;
}

.fab-add-button {
  position: fixed;
  bottom: 5rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
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
</style>

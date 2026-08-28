<script setup lang="ts">
import { useFinanceStore } from '../../stores/financeStore'
import ReceiptScannerBtn from '../receipts/ReceiptScannerBtn.vue'
import type { FinanceTabType, FinancialScope } from '../../types'

const financeStore = useFinanceStore()

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}

function handleTab(tab: FinanceTabType) {
  financeStore.setTab(tab)
}

function handleScope(scope: FinancialScope | 'all') {
  financeStore.setScope(scope)
}
</script>

<template>
  <header class="finance-header bento-card">
    <!-- Tarjetas de Impacto Financiero estilo Apple Bento Grid -->
    <div class="financial-summary-cards">
      <!-- Card Balance Neto (Bento Cyan) -->
      <div class="summary-card bento-card-cyan">
        <span class="card-label">Balance del Mes</span>
        <span class="card-value bento-metric-large">
          {{ formatCurrency(financeStore.netBalance) }}
        </span>
        <span class="card-sub">
          {{ financeStore.netBalance >= 0 ? '✓ Superávit a favor del hogar' : '⚠️ Déficit del período' }}
        </span>
      </div>

      <!-- Card Ingresos (Bento Green) -->
      <div class="summary-card bento-card-green">
        <span class="card-label">Total Ingresos</span>
        <span class="card-value bento-metric-large">+ {{ formatCurrency(financeStore.totalIncome) }}</span>
        <span class="card-sub">Entradas registradas en el mes</span>
      </div>

      <!-- Card Gastos (Bento Dark) -->
      <div class="summary-card bento-card-dark">
        <span class="card-label">Total Gastos</span>
        <span class="card-value bento-metric-large">- {{ formatCurrency(financeStore.totalExpenses) }}</span>
        <span class="card-sub">Egresos y compras consolidadas</span>
      </div>
    </div>

    <!-- Controles de Navegación: Ámbito + Pestañas + Acciones -->
    <div class="header-controls-row">
      <!-- Selector de Pestañas con scroll horizontal suave -->
      <div class="tab-selector-bar">
        <button 
          class="tab-btn" 
          :class="{ active: financeStore.activeTab === 'overview' }"
          @click="handleTab('overview')"
        >
          📊 Resumen
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: financeStore.activeTab === 'fixed_expenses' }"
          @click="handleTab('fixed_expenses')"
        >
          📌 Cuentas Fijas
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: financeStore.activeTab === 'movements' }"
          @click="handleTab('movements')"
        >
          📋 Movimientos
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: financeStore.activeTab === 'budgets' }"
          @click="handleTab('budgets')"
        >
          🎯 Presupuestos
        </button>
      </div>

      <!-- Pill Filter por Ámbito (Todos | Familiar | Personal) -->
      <div class="scope-selector">
        <button 
          class="scope-btn" 
          :class="{ active: financeStore.filterScope === 'all' }"
          @click="handleScope('all')"
        >
          Todos
        </button>
        <button 
          class="scope-btn" 
          :class="{ active: financeStore.filterScope === 'family' }"
          @click="handleScope('family')"
        >
          🏡 Familiar
        </button>
        <button 
          class="scope-btn" 
          :class="{ active: financeStore.filterScope === 'personal' }"
          @click="handleScope('personal')"
        >
          👤 Personal
        </button>
      </div>

      <!-- Grupo de Botones de Acción Prominentes -->
      <div class="action-buttons-group">
        <button class="add-movement-btn" @click="financeStore.openCreateSheet()">
          <span>➕ Registrar Movimiento</span>
        </button>
        <!-- Escáner OCR de Boletas -->
        <ReceiptScannerBtn />
      </div>
    </div>
  </header>
</template>

<style scoped>
.finance-header {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: 1rem;
  border-radius: 24px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.financial-summary-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

@media (min-width: 640px) {
  .financial-summary-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }
}

.summary-card {
  padding: 1.15rem 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.35rem;
  box-shadow: var(--shadow-card);
}

.card-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.bento-metric-large {
  font-size: clamp(1.5rem, 5vw, 2rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  margin: 0.1rem 0;
}

.card-sub {
  font-size: 0.76rem;
  opacity: 0.85;
}

.header-controls-row {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 1024px) {
  .header-controls-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
  }
}

.tab-selector-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 16px;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 1024px) {
  .tab-selector-bar {
    width: auto;
  }
}

.tab-selector-bar::-webkit-scrollbar {
  display: none;
}

:root[data-theme="dark"] .tab-selector-bar {
  background: rgba(255, 255, 255, 0.06);
}

.scope-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 16px;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 1024px) {
  .scope-selector {
    width: auto;
  }
}

:root[data-theme="dark"] .scope-selector {
  background: rgba(255, 255, 255, 0.06);
}

.tab-btn, .scope-btn {
  border: none;
  background: transparent;
  padding: 0.55rem 0.85rem;
  min-height: var(--touch-target-min);
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.scope-btn {
  flex: 1;
}

.tab-btn.active, .scope-btn.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

@media (min-width: 640px) {
  .action-buttons-group {
    flex-direction: row;
    align-items: center;
  }
}

@media (min-width: 1024px) {
  .action-buttons-group {
    width: auto;
  }
}

.add-movement-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.75rem 1.15rem;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.92rem;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
  transition: transform 0.15s, background 0.15s;
  width: 100%;
}

@media (min-width: 640px) {
  .add-movement-btn {
    width: auto;
  }
}

.add-movement-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}
</style>

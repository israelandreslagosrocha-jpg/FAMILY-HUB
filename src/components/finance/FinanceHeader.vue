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
      </div>

      <!-- Card Ingresos (Bento Green) -->
      <div class="summary-card bento-card-green">
        <span class="card-label">Total Ingresos</span>
        <span class="card-value bento-metric-large">+ {{ formatCurrency(financeStore.totalIncome) }}</span>
      </div>

      <!-- Card Gastos (Bento Dark) -->
      <div class="summary-card bento-card-dark">
        <span class="card-label">Total Gastos</span>
        <span class="card-value bento-metric-large">- {{ formatCurrency(financeStore.totalExpenses) }}</span>
      </div>
    </div>

    <!-- Controles de Navegación: Ámbito + Pestañas -->
    <div class="header-controls-row">
      <!-- Selector de Pestañas -->
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

      <!-- Escáner OCR de Boletas -->
      <ReceiptScannerBtn />
    </div>
  </header>
</template>

<style scoped>
.finance-header {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
  border-radius: 28px;
}

.financial-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1.2rem 1.4rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5rem;
  box-shadow: var(--shadow-card);
}

.card-label {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.9;
}

.bento-metric-large {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  margin-top: 0.2rem;
}

.header-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
}

.tab-selector-bar, .scope-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 16px;
  gap: 4px;
}

.tab-btn, .scope-btn {
  border: none;
  background: transparent;
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-btn.active, .scope-btn.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
</style>

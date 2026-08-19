<script setup lang="ts">
import { useFinanceStore } from '../../stores/financeStore'
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
  <header class="finance-header glass-card">
    <!-- Tarjetas de Impacto Financiero -->
    <div class="financial-summary-cards">
      <!-- Card Balance Neto -->
      <div class="summary-card card-balance">
        <span class="card-label">Balance del Mes</span>
        <span class="card-value" :class="{ positive: financeStore.netBalance >= 0, negative: financeStore.netBalance < 0 }">
          {{ formatCurrency(financeStore.netBalance) }}
        </span>
      </div>

      <!-- Card Ingresos -->
      <div class="summary-card card-income">
        <span class="card-label">Total Ingresos</span>
        <span class="card-value income-color">+ {{ formatCurrency(financeStore.totalIncome) }}</span>
      </div>

      <!-- Card Gastos -->
      <div class="summary-card card-expenses">
        <span class="card-label">Total Gastos</span>
        <span class="card-value expense-color">- {{ formatCurrency(financeStore.totalExpenses) }}</span>
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
    </div>
  </header>
</template>

<style scoped>
.finance-header {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
  border-radius: 20px;
}

.financial-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.85rem;
}

.summary-card {
  padding: 0.85rem 1rem;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .summary-card {
    background: rgba(30, 41, 59, 0.7);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.card-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.card-value {
  font-size: 1.15rem;
  font-weight: 800;
}

.card-value.positive { color: #10b981; }
.card-value.negative { color: #ef4444; }
.income-color { color: #10b981; }
.expense-color { color: #f43f5e; }

.header-controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.tab-selector-bar, .scope-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
}

@media (prefers-color-scheme: dark) {
  .tab-selector-bar, .scope-selector {
    background: rgba(255, 255, 255, 0.1);
  }
}

.tab-btn, .scope-btn {
  border: none;
  background: transparent;
  padding: 0.45rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 9px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.tab-btn.active, .scope-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .tab-btn.active, .scope-btn.active {
    background: #1e293b;
    color: #f8fafc;
  }
}
</style>

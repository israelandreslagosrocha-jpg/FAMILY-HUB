<script setup lang="ts">
import { useFinanceStore } from '../../stores/financeStore'

const financeStore = useFinanceStore()

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}

function getPercent(spent: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(Math.round((spent / limit) * 100), 100)
}

function getStatusClass(percent: number): string {
  if (percent >= 95) return 'status-danger'   // Rojo
  if (percent >= 75) return 'status-warning'  // Amarillo
  return 'status-success'                     // Verde
}

function getStatusLabel(percent: number): string {
  if (percent >= 100) return '🔴 Excedido'
  if (percent >= 95) return '🔴 Al Límite'
  if (percent >= 75) return '🟡 Precaución'
  return '🟢 Saludable'
}
</script>

<template>
  <div class="budgets-progress-container">
    <div class="section-intro-card glass-card">
      <span class="intro-icon">🎯</span>
      <div class="intro-text">
        <h3 class="intro-title">Presupuestos Mensuales por Categoría</h3>
        <p class="intro-desc">Control preventivo del gasto familiar para mantener la estabilidad económica del hogar.</p>
      </div>
    </div>

    <div class="budgets-grid">
      <div 
        v-for="b in financeStore.budgets" 
        :key="b.id"
        class="budget-card glass-card"
      >
        <!-- Encabezado de la Categoría -->
        <div class="budget-card-header">
          <div class="b-cat-info">
            <span class="b-cat-icon">{{ b.icon }}</span>
            <div class="b-cat-text">
              <h4 class="b-cat-name">{{ b.categoryName }}</h4>
              <span class="b-limit-label">Límite mensual: {{ formatCurrency(b.monthlyLimit) }}</span>
            </div>
          </div>

          <span class="status-badge" :class="getStatusClass(getPercent(b.spentAmount, b.monthlyLimit))">
            {{ getStatusLabel(getPercent(b.spentAmount, b.monthlyLimit)) }}
          </span>
        </div>

        <!-- Barra Semántica de Progreso -->
        <div class="progress-col">
          <div class="progress-numbers">
            <span class="spent-text">Gastado: <strong>{{ formatCurrency(b.spentAmount) }}</strong></span>
            <span class="percent-text">{{ getPercent(b.spentAmount, b.monthlyLimit) }}%</span>
          </div>

          <div class="progress-bar-track">
            <div 
              class="progress-bar-bar"
              :class="getStatusClass(getPercent(b.spentAmount, b.monthlyLimit))"
              :style="{ width: getPercent(b.spentAmount, b.monthlyLimit) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Footer Disponible -->
        <div class="budget-footer">
          <span class="remaining-text">
            Disponible: <strong>{{ formatCurrency(Math.max(b.monthlyLimit - b.spentAmount, 0)) }}</strong>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.budgets-progress-container {
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

.budgets-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  box-sizing: border-box;
}

.budget-card {
  padding: 1.15rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-sizing: border-box;
  width: 100%;
}

.budget-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
}

.b-cat-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.b-cat-icon { font-size: 1.6rem; flex-shrink: 0; }

.b-cat-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.b-cat-name {
  font-size: 0.98rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.b-limit-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-success { background: rgba(16, 185, 129, 0.15); color: #059669; }
.status-warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.status-danger { background: rgba(244, 63, 94, 0.15); color: #e11d48; }

.progress-col {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.progress-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.progress-bar-track {
  height: 10px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

:root[data-theme="dark"] .progress-bar-track { 
  background: rgba(255, 255, 255, 0.1); 
}

.progress-bar-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-bar-bar.status-success { background-color: #10b981; }
.progress-bar-bar.status-warning { background-color: #f59e0b; }
.progress-bar-bar.status-danger { background-color: #f43f5e; }

.budget-footer {
  display: flex;
  justify-content: flex-end;
  font-size: 0.82rem;
  color: var(--text-secondary);
  padding-top: 0.4rem;
  border-top: 1px dashed var(--border-subtle);
}
</style>

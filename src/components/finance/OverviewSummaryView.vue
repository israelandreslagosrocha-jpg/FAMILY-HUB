<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '../../stores/financeStore'

const financeStore = useFinanceStore()

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}

function handleDeleteMovement(movId: string) {
  if (confirm('¿Deseas eliminar este movimiento financiero?')) {
    financeStore.deleteMovement(movId)
  }
}

// Cómputo de gastos por categoría para gráficos de distribución
const categoryBreakdown = computed(() => {
  const map = new Map<string, { name: string; icon: string; color: string; total: number }>()

  financeStore.displayedMovements
    .filter(m => m.type === 'expense')
    .forEach(m => {
      const existing = map.get(m.categoryName) || { name: m.categoryName, icon: m.categoryIcon, color: m.categoryColor, total: 0 }
      existing.total += m.amount
      map.set(m.categoryName, existing)
    })

  const list = Array.from(map.values())
  const grandTotal = list.reduce((sum, item) => sum + item.total, 0) || 1

  return list.map(item => ({
    ...item,
    percentage: Math.round((item.total / grandTotal) * 100)
  })).sort((a, b) => b.total - a.total)
})
</script>

<template>
  <div class="overview-summary-container">
    <!-- Distribución de Gastos por Categoría -->
    <div class="section-card glass-card">
      <div class="card-header-row">
        <h3 class="section-title">📊 Distribución de Gastos por Categoría</h3>
        <span class="total-badge">Total: {{ formatCurrency(financeStore.totalExpenses) }}</span>
      </div>

      <div v-if="categoryBreakdown.length === 0" class="empty-state">
        <p>No hay gastos registrados en este período.</p>
      </div>

      <div v-else class="categories-list">
        <div 
          v-for="cat in categoryBreakdown" 
          :key="cat.name"
          class="category-item-row"
        >
          <div class="cat-info-col">
            <span class="cat-icon">{{ cat.icon }}</span>
            <div class="cat-text">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-amount">{{ formatCurrency(cat.total) }} ({{ cat.percentage }}%)</span>
            </div>
          </div>

          <!-- Barra Visual de Progreso Semántica -->
          <div class="progress-bar-bg">
            <div 
              class="progress-bar-fill"
              :style="{ width: cat.percentage + '%', backgroundColor: cat.color }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actividad Financiera Reciente -->
    <div class="section-card glass-card">
      <div class="card-header-row">
        <h3 class="section-title">⚡ Últimos Movimientos</h3>
        <button class="view-all-btn" @click="financeStore.setTab('movements')">Ver todos →</button>
      </div>

      <div class="recent-movements-list">
        <div 
          v-for="mov in financeStore.displayedMovements.slice(0, 4)" 
          :key="mov.id"
          class="recent-mov-item"
        >
          <div class="mov-left">
            <span class="mov-icon">{{ mov.categoryIcon }}</span>
            <div class="mov-text">
              <span class="mov-title">{{ mov.title }}</span>
              <span class="mov-subtitle">{{ mov.date }} • {{ mov.scope === 'family' ? '🏡 Familiar' : '👤 Personal' }}</span>
            </div>
          </div>

          <div class="mov-right">
            <span 
              class="mov-amount"
              :class="{ 
                'income-val': mov.type === 'income', 
                'expense-val': mov.type === 'expense',
                'transfer-val': mov.type === 'transfer' 
              }"
            >
              {{ mov.type === 'income' ? '+' : (mov.type === 'expense' ? '-' : '🔄') }} {{ formatCurrency(mov.amount) }}
            </span>
            <button class="delete-mov-btn" @click="handleDeleteMovement(mov.id)" title="Eliminar Movimiento">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-summary-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-card {
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.total-badge {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
}

.view-all-btn {
  background: transparent;
  border: none;
  font-size: 0.82rem;
  font-weight: 600;
  color: #3b82f6;
  cursor: pointer;
}

.categories.mov-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.delete-mov-btn {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s, transform 0.15s;
  padding: 2px;
}

.delete-mov-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.category-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cat-info-col {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.cat-icon { font-size: 1.2rem; }

.cat-text {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 0.88rem;
}

.cat-name { font-weight: 600; color: var(--text-primary); }
.cat-amount { font-weight: 700; color: var(--text-secondary); }

.progress-bar-bg {
  height: 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  .progress-bar-bg { background: rgba(255, 255, 255, 0.1); }
}

.progress-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.recent-movements-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recent-mov-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
}

@media (prefers-color-scheme: dark) {
  .recent-mov-item { background: rgba(255, 255, 255, 0.04); }
}

.mov-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.mov-icon { font-size: 1.3rem; }

.mov-text {
  display: flex;
  flex-direction: column;
}

.mov-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.mov-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.mov-amount {
  font-size: 0.95rem;
  font-weight: 800;
}

.income-val { color: #10b981; }
.expense-val { color: #f43f5e; }
.transfer-val { color: #8b5cf6; }

.empty-state {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-secondary);
}
</style>

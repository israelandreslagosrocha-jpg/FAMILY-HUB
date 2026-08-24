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

// Cómputo de comparativa de histórico mensual (últimos 4 meses real)
const monthlyComparisonData = computed(() => {
  const months = [
    { code: '2026-05', name: 'Mayo' },
    { code: '2026-06', name: 'Junio' },
    { code: '2026-07', name: 'Julio' },
    { code: '2026-08', name: 'Agosto' }
  ]

  let maxVal = 1
  months.forEach(m => {
    const monthMovements = financeStore.movements.filter(mov => mov.date.startsWith(m.code))
    const inc = monthMovements.filter(mov => mov.type === 'income').reduce((sum, mov) => sum + mov.amount, 0)
    const exp = monthMovements.filter(mov => mov.type === 'expense').reduce((sum, mov) => sum + mov.amount, 0)
    if (inc > maxVal) maxVal = inc
    if (exp > maxVal) maxVal = exp
  })

  return months.map(m => {
    const monthMovements = financeStore.movements.filter(mov => mov.date.startsWith(m.code))
    const income = monthMovements.filter(mov => mov.type === 'income').reduce((sum, mov) => sum + mov.amount, 0)
    const expense = monthMovements.filter(mov => mov.type === 'expense').reduce((sum, mov) => sum + mov.amount, 0)

    return {
      monthCode: m.code,
      monthName: m.name,
      income,
      expense,
      incomeHeight: maxVal > 1 ? Math.min(100, Math.round((income / maxVal) * 100)) : 0,
      expenseHeight: maxVal > 1 ? Math.min(100, Math.round((expense / maxVal) * 100)) : 0
    }
  })
})
</script>

<template>
  <div class="overview-summary-container">
    <!-- 📈 HISTÓRICO Y COMPARATIVA ENTRE MESES (GRÁFICO BENTO GRID) -->
    <div class="section-card bento-card chart-card">
      <div class="card-header-row">
        <div>
          <h3 class="section-title">📈 Comparativa Histórica de Meses</h3>
          <span class="section-sub">Evolución de Ingresos vs Gastos del Hogar</span>
        </div>

        <select v-model="financeStore.selectedMonth" class="month-select-pill">
          <option value="2026-08">Agosto 2026 (Actual)</option>
          <option value="2026-07">Julio 2026</option>
          <option value="2026-06">Junio 2026</option>
          <option value="2026-05">Mayo 2026</option>
        </select>
      </div>

      <!-- BAR CHART CONTAINER -->
      <div class="bento-chart-container">
        <div class="chart-bars-row">
          <div v-for="m in monthlyComparisonData" :key="m.monthName" class="chart-month-col">
            <div class="bars-pair">
              <div 
                class="bar bar-income" 
                :style="{ height: m.incomeHeight + '%' }"
                :title="`Ingresos ${m.monthName}: ${formatCurrency(m.income)}`"
              ></div>
              <div 
                class="bar bar-expense" 
                :style="{ height: m.expenseHeight + '%' }"
                :title="`Gastos ${m.monthName}: ${formatCurrency(m.expense)}`"
              ></div>
            </div>
            <span class="month-label" :class="{ 'is-selected': m.monthCode === financeStore.selectedMonth }">{{ m.monthName }}</span>
          </div>
        </div>

        <div class="chart-legend">
          <span class="legend-item"><span class="dot green-dot"></span> Ingresos (+{{ formatCurrency(financeStore.totalIncome) }})</span>
          <span class="legend-item"><span class="dot red-dot"></span> Gastos (-{{ formatCurrency(financeStore.totalExpenses) }})</span>
        </div>
      </div>
    </div>
    <!-- Distribución de Gastos por Categoría -->
    <div class="section-card bento-card">
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
    <div class="section-card bento-card">
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

/* CHART CARD & BAR CHART STYLES */
.month-select-pill {
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.section-sub {
  font-size: 0.78rem;
  color: var(--text-secondary);
  display: block;
}

.bento-chart-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.chart-bars-row {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 160px;
  padding-top: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.chart-month-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
  justify-content: flex-end;
}

.bars-pair {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 120px;
}

.bar {
  width: 14px;
  border-radius: 6px 6px 0 0;
  transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 4px;
}

.bar-income {
  background: linear-gradient(180deg, #10b981, #059669);
}

.bar-expense {
  background: linear-gradient(180deg, #f43f5e, #e11d48);
}

.month-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.month-label.is-selected {
  color: #3b82f6;
  font-weight: 900;
  text-decoration: underline;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.green-dot { background: #10b981; }
.red-dot { background: #f43f5e; }
</style>

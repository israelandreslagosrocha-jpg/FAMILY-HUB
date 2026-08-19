<script setup lang="ts">
import { useFinanceStore } from '../../stores/financeStore'
import { mockMembers } from '../../mocks/familyData'

const financeStore = useFinanceStore()

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}

function handleFilterMember(memberId: string) {
  financeStore.setFilterMember(memberId)
}
</script>

<template>
  <div class="movements-list-container">
    <!-- Barra de Filtro por Miembro Familiar (Con avatars y colores de miembros) -->
    <div class="member-filter-scroll glass-card">
      <button 
        class="member-chip"
        :class="{ active: financeStore.filterMemberId === 'all' }"
        @click="handleFilterMember('all')"
      >
        <span>Todos los integrantes</span>
      </button>

      <button 
        v-for="member in mockMembers" 
        :key="member.id"
        class="member-chip"
        :class="{ active: financeStore.filterMemberId === member.id }"
        @click="handleFilterMember(member.id)"
      >
        <span class="member-dot" :style="{ backgroundColor: member.color }"></span>
        <span>{{ member.name }}</span>
      </button>
    </div>

    <!-- Lista de Movimientos -->
    <div v-if="financeStore.displayedMovements.length === 0" class="glass-card empty-card">
      <span class="empty-icon">💳</span>
      <h3 class="empty-title">Sin movimientos registrados</h3>
      <p class="empty-desc">Registra un nuevo gasto, ingreso o transferencia desde el botón (+).</p>
    </div>

    <div v-else class="movements-card-list">
      <div 
        v-for="mov in financeStore.displayedMovements" 
        :key="mov.id"
        class="movement-card glass-card"
      >
        <div class="mov-card-left">
          <span class="category-icon-bg" :style="{ backgroundColor: mov.categoryColor + '20', color: mov.categoryColor }">
            {{ mov.categoryIcon }}
          </span>
          <div class="mov-details">
            <div class="mov-title-row">
              <h4 class="mov-title">{{ mov.title }}</h4>
              <span class="type-pill" :class="mov.type">
                {{ mov.type === 'income' ? 'Ingreso' : (mov.type === 'expense' ? 'Gasto' : 'Transferencia') }}
              </span>
            </div>
            <span class="mov-meta">
              {{ mov.date }} • {{ mov.categoryName }} • {{ mov.scope === 'family' ? '🏡 Familiar' : '👤 Personal' }}
            </span>
          </div>
        </div>

        <div class="mov-card-right">
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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.movements-list-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.member-filter-scroll {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 16px;
  overflow-x: auto;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

@media (prefers-color-scheme: dark) {
  .member-chip {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.member-chip.active {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.member-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.empty-card {
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 20px;
}

.empty-icon { font-size: 2.5rem; }
.empty-title { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0.5rem 0 0.25rem; }
.empty-desc { font-size: 0.9rem; color: var(--text-secondary); }

.movements-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.movement-card {
  padding: 1rem 1.25rem;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.mov-card-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.category-icon-bg {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.mov-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.mov-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mov-title {
  font-size: 0.98rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.type-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
}

.type-pill.income { background: rgba(16, 185, 129, 0.15); color: #059669; }
.type-pill.expense { background: rgba(244, 63, 94, 0.15); color: #e11d48; }
.type-pill.transfer { background: rgba(139, 92, 246, 0.15); color: #7c3aed; }

.mov-meta {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.mov-card-right {
  text-align: right;
}

.mov-amount {
  font-size: 1.05rem;
  font-weight: 800;
}

.income-val { color: #10b981; }
.expense-val { color: #f43f5e; }
.transfer-val { color: #8b5cf6; }
</style>

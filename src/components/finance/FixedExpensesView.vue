<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores/financeStore'
import { Plus, Check, Clock } from 'lucide-vue-next'

const financeStore = useFinanceStore()

const isAddModalOpen = ref(false)
const title = ref('')
const amount = ref<number | null>(null)
const categoryName = ref('Servicios del Hogar')
const dueDay = ref<number>(10)
const icon = ref('💡')
const color = ref('#3b82f6')

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}

const totalCommitted = computed(() => {
  return financeStore.fixedExpenses.reduce((sum, item) => sum + item.amount, 0)
})

const totalPaid = computed(() => {
  return financeStore.fixedExpenses.filter(item => item.isPaid).reduce((sum, item) => sum + item.amount, 0)
})

const totalPending = computed(() => {
  return financeStore.fixedExpenses.filter(item => !item.isPaid).reduce((sum, item) => sum + item.amount, 0)
})

function togglePaid(id: string) {
  financeStore.toggleFixedExpensePaid(id)
}

function handleDelete(id: string) {
  if (confirm('¿Deseas eliminar esta cuenta fija?')) {
    if (typeof financeStore.deleteFixedExpense === 'function') {
      financeStore.deleteFixedExpense(id)
    } else {
      const idx = financeStore.fixedExpenses.findIndex(f => f.id === id)
      if (idx !== -1) {
        financeStore.fixedExpenses.splice(idx, 1)
      }
    }
  }
}

function handleAddFixedExpense() {
  if (!title.value.trim() || !amount.value || amount.value <= 0) return

  financeStore.addFixedExpense({
    title: title.value.trim(),
    amount: amount.value,
    categoryName: categoryName.value,
    dueDay: dueDay.value,
    isPaid: false,
    icon: icon.value,
    color: color.value
  })

  title.value = ''
  amount.value = null
  isAddModalOpen.value = false
}
</script>

<template>
  <div class="fixed-expenses-view">
    <!-- BARRA BENTO DE IMPACTO DE CUENTAS FIJAS -->
    <div class="summary-bento-grid">
      <div class="bento-card summary-card bento-card-cyan">
        <span class="card-label">Total Cuentas Fijas</span>
        <span class="card-value">{{ formatCurrency(totalCommitted) }}</span>
        <span class="card-sub">Compromiso mensual presupuestado</span>
      </div>

      <div class="bento-card summary-card bento-card-green">
        <span class="card-label">Pagado en el Mes</span>
        <span class="card-value">✓ {{ formatCurrency(totalPaid) }}</span>
        <span class="card-sub">{{ financeStore.fixedExpenses.filter(i => i.isPaid).length }} Cuentas al día</span>
      </div>

      <div class="bento-card summary-card bento-card-amber">
        <span class="card-label">Pendiente por Pagar</span>
        <span class="card-value">⌛ {{ formatCurrency(totalPending) }}</span>
        <span class="card-sub">{{ financeStore.fixedExpenses.filter(i => !i.isPaid).length }} Cuentas pendientes</span>
      </div>
    </div>

    <!-- CABECERA Y BOTÓN AGREGAR -->
    <div class="section-title-row">
      <div class="title-left">
        <h2 class="section-title">📌 Cuentas y Gastos Fijos del Mes</h2>
        <p class="section-sub">Control transparente de compromisos recurrentes (Luz, Agua, Gas, Dividendo, Colegio, etc.).</p>
      </div>

      <button class="add-fixed-btn" @click="isAddModalOpen = true">
        <Plus :size="16" />
        <span>+ Nueva Cuenta Fija</span>
      </button>
    </div>

    <!-- ESTADO VACÍO CUANDO NO HAY CUENTAS -->
    <div v-if="financeStore.fixedExpenses.length === 0" class="empty-fixed-card bento-card">
      <span class="empty-icon">📌</span>
      <h3 class="empty-title">Sin cuentas fijas registradas</h3>
      <p class="empty-sub">Comienza agregando las cuentas fijas de tu hogar (ej: Luz, Agua, Gas, Arriendo/Dividendo, Colegio) haciendo clic en "+ Nueva Cuenta Fija".</p>
      <button class="add-first-btn" @click="isAddModalOpen = true">
        + Agregar Primera Cuenta Fija
      </button>
    </div>

    <!-- LISTA DE CUENTAS FIJAS EN BENTO GRID -->
    <div v-else class="fixed-items-grid">
      <div 
        v-for="item in financeStore.fixedExpenses" 
        :key="item.id"
        class="fixed-item-card glass-card"
        :class="{ 'is-paid': item.isPaid }"
        :style="{ borderLeftColor: item.color }"
      >
        <div class="item-left">
          <span class="item-icon" :style="{ backgroundColor: `${item.color}20` }">{{ item.icon }}</span>
          <div class="item-details">
            <h3 class="item-title">{{ item.title }}</h3>
            <div class="item-tags">
              <span class="tag-chip">Vence el día {{ item.dueDay }}</span>
              <span class="tag-chip category-chip">{{ item.categoryName }}</span>
            </div>
          </div>
        </div>

        <div class="item-right">
          <span class="item-amount">{{ formatCurrency(item.amount) }}</span>

          <button 
            class="status-toggle-btn"
            :class="{ 'btn-paid': item.isPaid, 'btn-pending': !item.isPaid }"
            @click="togglePaid(item.id)"
          >
            <template v-if="item.isPaid">
              <Check :size="14" />
              <span>✓ Pagada</span>
            </template>
            <template v-else>
              <Clock :size="14" />
              <span>⌛ Marcar Pagada</span>
            </template>
          </button>

          <button class="delete-fixed-btn" @click="handleDelete(item.id)" title="Eliminar cuenta fija">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL REGISTRO NUEVA CUENTA FIJA -->
    <div v-if="isAddModalOpen" class="modal-backdrop" @click.self="isAddModalOpen = false">
      <div class="modal-card glass-card" @click.stop>
        <div class="modal-header">
          <h3>📌 Nueva Cuenta Fija Mensual</h3>
          <button class="close-btn" @click="isAddModalOpen = false">✕</button>
        </div>

        <form class="modal-form" @submit.prevent="handleAddFixedExpense">
          <div class="form-group">
            <label>Nombre de la Cuenta / Servicio</label>
            <input v-model="title" type="text" class="form-input" placeholder="Ej. Luz Enel, Agua, Arriendo..." required />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Monto Estimado ($ CLP)</label>
              <input v-model.number="amount" type="number" class="form-input" placeholder="Ej. 45000" min="1" required />
            </div>

            <div class="form-group flex-1">
              <label>Día de Vencimiento</label>
              <input v-model.number="dueDay" type="number" class="form-input" min="1" max="31" required />
            </div>
          </div>

          <div class="form-group">
            <label>Categoría</label>
            <select v-model="categoryName" class="form-input">
              <option value="Servicios del Hogar">💡 Servicios del Hogar</option>
              <option value="Vivienda">🏠 Vivienda / Arriendo</option>
              <option value="Educación">🎓 Educación / Colegio</option>
              <option value="Salud & Seguros">🏥 Salud & Seguros</option>
              <option value="Telecomunicaciones">📶 Telecomunicaciones / Wifi</option>
            </select>
          </div>

          <div class="modal-footer">
            <button type="submit" class="submit-btn" :disabled="!title.trim() || !amount">
              + Guardar Cuenta Fija
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fixed-expenses-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.summary-bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.summary-card {
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-label {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.card-value {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.card-sub {
  font-size: 0.78rem;
  opacity: 0.8;
}

.bento-card-amber {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15));
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 900;
  margin: 0;
  color: var(--text-primary);
}

.section-sub {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0 0;
}

.add-fixed-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.65rem 1.1rem;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.add-fixed-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.fixed-items-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fixed-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 18px;
  border-left: 5px solid #3b82f6;
  background: var(--bg-card);
  transition: all 0.2s ease;
}

.fixed-item-card.is-paid {
  opacity: 0.75;
  background: rgba(16, 185, 129, 0.05);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.item-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-title {
  font-size: 1rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.item-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.tag-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 8px;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.item-amount {
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--text-primary);
}

.status-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 0.9rem;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-paid {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.btn-pending {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.status-toggle-btn:hover {
  transform: scale(1.05);
}

/* MODAL */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-card);
  border-radius: 24px;
  padding: 1.5rem;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 1.2rem;
  width: 32px; height: 32px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.flex-1 { flex: 1; }

.form-group label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 0.95rem;
  box-sizing: border-box;
}

.modal-footer {
  margin-top: 0.5rem;
}

.submit-btn {
  width: 100%;
  padding: 0.85rem;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
}

.empty-fixed-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  gap: 0.75rem;
  border-radius: 24px;
}

.empty-icon {
  font-size: 2.8rem;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 0.88rem;
  color: var(--text-secondary);
  max-width: 440px;
  margin: 0;
  line-height: 1.4;
}

.add-first-btn {
  margin-top: 0.5rem;
  padding: 0.75rem 1.4rem;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s;
}

.add-first-btn:hover {
  transform: scale(1.04);
}

.delete-fixed-btn {
  background: transparent;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, transform 0.15s;
  padding: 4px;
}

.delete-fixed-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}
</style>

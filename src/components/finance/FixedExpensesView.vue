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
        <Plus :size="18" />
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

    <!-- LISTA DE CUENTAS FIJAS EN BENTO GRID (RESPONSIVE) -->
    <div v-else class="fixed-items-grid">
      <div 
        v-for="item in financeStore.fixedExpenses" 
        :key="item.id"
        class="fixed-item-card glass-card"
        :class="{ 'is-paid': item.isPaid }"
        :style="{ borderLeftColor: item.color }"
      >
        <div class="item-top-row">
          <div class="item-identity">
            <span class="item-icon" :style="{ backgroundColor: `${item.color}20` }">{{ item.icon }}</span>
            <div class="item-details">
              <h3 class="item-title">{{ item.title }}</h3>
              <div class="item-tags">
                <span class="tag-chip">Vence día {{ item.dueDay }}</span>
                <span class="tag-chip category-chip">{{ item.categoryName }}</span>
              </div>
            </div>
          </div>

          <!-- Monto visible en la cabecera del ítem en móvil -->
          <div class="item-amount-badge">
            {{ formatCurrency(item.amount) }}
          </div>
        </div>

        <div class="item-actions-row">
          <button 
            class="status-toggle-btn"
            :class="{ 'btn-paid': item.isPaid, 'btn-pending': !item.isPaid }"
            @click="togglePaid(item.id)"
          >
            <template v-if="item.isPaid">
              <Check :size="16" />
              <span>✓ Pagada</span>
            </template>
            <template v-else>
              <Clock :size="16" />
              <span>⌛ Marcar Pagada</span>
            </template>
          </button>

          <button class="delete-fixed-btn" @click="handleDelete(item.id)" title="Eliminar cuenta fija">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL REGISTRO NUEVA CUENTA FIJA (BOTTOM SHEET EN MÓVIL) -->
    <div v-if="isAddModalOpen" class="modal-backdrop" @click.self="isAddModalOpen = false">
      <div class="modal-card glass-card" @click.stop>
        <div class="sheet-grabber mobile-grabber"></div>

        <div class="modal-header">
          <h3 class="modal-title">📌 Nueva Cuenta Fija Mensual</h3>
          <button class="close-btn" @click="isAddModalOpen = false">✕</button>
        </div>

        <form class="modal-form" @submit.prevent="handleAddFixedExpense">
          <div class="form-group">
            <label class="form-label">Nombre de la Cuenta / Servicio</label>
            <input v-model="title" type="text" class="form-input" placeholder="Ej. Luz Enel, Agua, Arriendo..." required autofocus />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Monto Estimado ($ CLP)</label>
              <input v-model.number="amount" type="number" class="form-input" placeholder="Ej. 45000" min="1" required />
            </div>

            <div class="form-group flex-1">
              <label class="form-label">Día de Vencimiento</label>
              <input v-model.number="dueDay" type="number" class="form-input" min="1" max="31" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Categoría</label>
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
  gap: var(--space-4);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.summary-bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

@media (min-width: 640px) {
  .summary-bento-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }
}

.summary-card {
  padding: 1.15rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.card-value {
  font-size: clamp(1.4rem, 5vw, 1.8rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.card-sub {
  font-size: 0.76rem;
  opacity: 0.85;
}

.bento-card-amber {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15));
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.title-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section-title {
  font-size: clamp(1.15rem, 3.5vw, 1.3rem);
  font-weight: 900;
  margin: 0;
  color: var(--text-primary);
}

.section-sub {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0 0;
  line-height: 1.35;
}

.add-fixed-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.65rem 1.1rem;
  min-height: var(--touch-target-min);
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  touch-action: manipulation;
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
  width: 100%;
  box-sizing: border-box;
}

/* Tarjeta de Cuenta Fija: Mobile-First Layout */
.fixed-item-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.15rem;
  border-radius: 18px;
  border-left: 5px solid #3b82f6;
  background: var(--bg-card);
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
}

.fixed-item-card.is-paid {
  opacity: 0.85;
  background: rgba(16, 185, 129, 0.05);
}

.item-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
}

.item-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.item-title {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-tags {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.tag-chip {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 7px;
  border-radius: 8px;
}

.item-amount-badge {
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--text-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.item-actions-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}

.status-toggle-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.6rem 1rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
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
  transform: scale(1.02);
}

.delete-fixed-btn {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.delete-fixed-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ============================================================================
   PROGRESSIVE ENHANCEMENT: Tablet / Desktop (>= 640px)
   ============================================================================ */
@media (min-width: 640px) {
  .fixed-item-card {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
  }

  .item-top-row {
    width: auto;
  }

  .item-actions-row {
    width: auto;
    gap: 1rem;
  }

  .status-toggle-btn {
    flex: initial;
  }
}

/* MODAL / BOTTOM SHEET */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

.modal-card {
  width: 100%;
  max-width: 100%;
  max-height: calc(100dvh - 1.5rem);
  background: var(--bg-card);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid var(--border-subtle);
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.mobile-grabber {
  display: block;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
}

.close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 1.1rem;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}

:root[data-theme="dark"] .close-btn {
  background: rgba(255, 255, 255, 0.08);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.flex-1 { flex: 1; }

.form-label {
  font-size: 0.8rem;
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
  font-size: 16px;
  line-height: 1.4;
  min-height: var(--touch-target-min);
  box-sizing: border-box;
}

.modal-footer {
  margin-top: 0.5rem;
}

.submit-btn {
  width: 100%;
  padding: 0.85rem;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  touch-action: manipulation;
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
  min-height: var(--touch-target-min);
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s;
}

.add-first-btn:hover {
  transform: scale(1.04);
}

@media (min-width: 768px) {
  .modal-backdrop {
    align-items: center;
    padding: 1.5rem;
  }

  .modal-card {
    max-width: 480px;
    border-radius: 24px;
    border-bottom: 1px solid var(--border-subtle);
    padding: 1.5rem;
    animation: none;
  }

  .mobile-grabber {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFinanceStore } from '../../stores/financeStore'
import { useAuthStore } from '../../stores/authStore'
import type { MovementType, FinancialScope } from '../../types'
import { getChileTodayString } from '../../utils/dateUtils'

const financeStore = useFinanceStore()
const authStore = useAuthStore()

const title = ref('')
const amount = ref<number | null>(null)
const type = ref<MovementType>('expense')
const scope = ref<FinancialScope>('family')
const categoryName = ref('Supermercado')
const registeredByMemberId = ref(authStore.activeMemberId || 'm-1')
const belongingToMemberId = ref(authStore.activeMemberId || 'm-1')
const date = ref(getChileTodayString())

watch(() => financeStore.isCreateSheetOpen, (isOpen) => {
  if (isOpen) {
    title.value = ''
    amount.value = null
    type.value = 'expense'
    scope.value = 'family'
    categoryName.value = 'Supermercado'
    registeredByMemberId.value = authStore.activeMemberId || (authStore.familyMembers[0]?.id || 'm-1')
    belongingToMemberId.value = authStore.activeMemberId || (authStore.familyMembers[0]?.id || 'm-1')
    date.value = getChileTodayString()
  }
})

watch(type, (newType) => {
  if (newType === 'income') {
    categoryName.value = 'Honorarios & Partituras'
  } else if (newType === 'expense') {
    categoryName.value = 'Supermercado'
  } else if (newType === 'transfer') {
    categoryName.value = 'Transferencia Cuentas'
  }
})

const categoriesMap: Record<string, { icon: string; color: string }> = {
  // Gastos
  'Supermercado': { icon: '🛒', color: '#ec4899' },
  'Servicios del Hogar': { icon: '💡', color: '#3b82f6' },
  'Ropa & Personal': { icon: '👟', color: '#f59e0b' },
  'Entretención & Salidas': { icon: '🍕', color: '#a855f7' },
  'Gastos Generales': { icon: '💸', color: '#f43f5e' },
  // Ingresos
  'Honorarios & Partituras': { icon: '🎼', color: '#10b981' },
  'Sueldos & Trabajo': { icon: '💼', color: '#059669' },
  'Ventas & Negocios': { icon: '💰', color: '#3b82f6' },
  'Regalo / Reembolso': { icon: '🎁', color: '#a855f7' },
  'Otros Ingresos': { icon: '📈', color: '#10b981' },
  // Transferencias
  'Transferencia Cuentas': { icon: '🔄', color: '#8b5cf6' }
}

function handleClose() {
  financeStore.closeCreateSheet()
}

function handleSubmit() {
  if (!title.value.trim() || !amount.value || amount.value <= 0) return

  const catInfo = categoriesMap[categoryName.value] || { icon: type.value === 'income' ? '💼' : '💸', color: type.value === 'income' ? '#10b981' : '#3b82f6' }

  financeStore.addMovement({
    title: title.value.trim(),
    amount: amount.value,
    currency: 'CLP',
    type: type.value,
    scope: scope.value,
    categoryId: `cat-${Date.now()}`,
    categoryName: categoryName.value,
    categoryIcon: catInfo.icon,
    categoryColor: catInfo.color,
    registeredByMemberId: registeredByMemberId.value,
    belongingToMemberId: scope.value === 'personal' ? belongingToMemberId.value : undefined,
    date: date.value
  })
}
</script>

<template>
  <div v-if="financeStore.isCreateSheetOpen" class="sheet-backdrop" @click.self="handleClose">
    <div class="sheet-modal glass-card" @click.stop>
      <div class="sheet-grabber"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">💳 Registrar Movimiento Financiero</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form class="sheet-form" @submit.prevent="handleSubmit">
        <!-- Selector de Tipo: Gasto / Ingreso / Transferencia Neutra -->
        <div class="type-selector-bar">
          <button 
            type="button"
            class="type-btn expense-btn"
            :class="{ active: type === 'expense' }"
            @click="type = 'expense'"
          >
            🔴 Gasto
          </button>
          <button 
            type="button"
            class="type-btn income-btn"
            :class="{ active: type === 'income' }"
            @click="type = 'income'"
          >
            🟢 Ingreso
          </button>
          <button 
            type="button"
            class="type-btn transfer-btn"
            :class="{ active: type === 'transfer' }"
            @click="type = 'transfer'"
          >
            🔄 Transferencia
          </button>
        </div>

        <!-- Campo Monto prominente -->
        <div class="form-group amount-group">
          <label class="form-label">Monto (CLP)</label>
          <div class="amount-input-wrapper">
            <span class="currency-symbol">$</span>
            <input 
              v-model.number="amount" 
              type="number" 
              class="form-input amount-input" 
              placeholder="0" 
              min="1"
              autofocus 
              required 
            />
          </div>
        </div>

        <!-- Título del Movimiento -->
        <div class="form-group">
          <label class="form-label">Detalle o Descripción</label>
          <input 
            v-model="title" 
            type="text" 
            class="form-input" 
            :placeholder="type === 'income' ? 'Ej. Pago partituras, Trabajo mensual, Bono...' : 'Ej. Supermercado Lider, Cuenta de Luz, Bencina...'" 
            required 
          />
        </div>

        <!-- Categoría y Fecha -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Categoría</label>

            <!-- Categorías para Gastos -->
            <select v-if="type === 'expense'" v-model="categoryName" class="form-select">
              <option value="Supermercado">🛒 Supermercado</option>
              <option value="Servicios del Hogar">💡 Servicios del Hogar</option>
              <option value="Ropa & Personal">👟 Ropa & Personal</option>
              <option value="Entretención & Salidas">🍕 Entretención & Salidas</option>
              <option value="Gastos Generales">💸 Gastos Generales</option>
            </select>

            <!-- Categorías para Ingresos -->
            <select v-else-if="type === 'income'" v-model="categoryName" class="form-select">
              <option value="Honorarios & Partituras">🎼 Honorarios & Partituras</option>
              <option value="Sueldos & Trabajo">💼 Sueldos & Trabajo</option>
              <option value="Ventas & Negocios">💰 Ventas & Negocios</option>
              <option value="Regalo / Reembolso">🎁 Regalo / Reembolso</option>
              <option value="Otros Ingresos">📈 Otros Ingresos</option>
            </select>

            <!-- Categorías para Transferencias -->
            <select v-else v-model="categoryName" class="form-select">
              <option value="Transferencia Cuentas">🔄 Transferencia Cuentas</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input v-model="date" type="date" class="form-input" required />
          </div>
        </div>

        <!-- Ámbito: Familiar vs Personal -->
        <div class="form-group">
          <label class="form-label">Ámbito del Movimiento</label>
          <div class="scope-toggle-bar">
            <button 
              type="button" 
              class="scope-toggle-btn"
              :class="{ active: scope === 'family' }"
              @click="scope = 'family'"
            >
              🏡 {{ type === 'income' ? 'Ingreso Familiar (Del Hogar)' : 'Familiar (Del Hogar)' }}
            </button>
            <button 
              type="button" 
              class="scope-toggle-btn"
              :class="{ active: scope === 'personal' }"
              @click="scope = 'personal'"
            >
              👤 {{ type === 'income' ? 'Ingreso Personal' : 'Personal' }}
            </button>
          </div>
        </div>

        <!-- Quién Pagó / Recibió y A Quién Pertenece -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">{{ type === 'income' ? '¿Quién Recibió / Registró?' : '¿Quién Pagó / Registró?' }}</label>
            <select v-model="registeredByMemberId" class="form-select">
              <option v-for="m in authStore.familyMembers" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
          </div>

          <div v-if="scope === 'personal'" class="form-group">
            <label class="form-label">¿A Quién Pertenece?</label>
            <select v-model="belongingToMemberId" class="form-select">
              <option v-for="m in authStore.familyMembers" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Botón Submit -->
        <div class="sheet-actions">
          <button type="submit" class="submit-mov-btn" :disabled="!title.trim() || !amount">
            + Guardar {{ type === 'income' ? 'Ingreso' : (type === 'expense' ? 'Gasto' : 'Movimiento') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.sheet-modal {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1.6rem;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (prefers-color-scheme: dark) {
  .sheet-modal {
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }
}

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.sheet-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary, #ffffff);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  font-size: 1.4rem;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #ffffff);
  transition: background 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.type-selector-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.type-btn {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.65rem 0.5rem;
  font-size: 0.88rem;
  font-weight: 700;
  border-radius: 10px;
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

:root[data-theme="light"] .type-btn {
  background: rgba(0, 0, 0, 0.04);
  color: #475569;
  border-color: rgba(0, 0, 0, 0.08);
}

.expense-btn.active {
  background: #f43f5e !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  border-color: #e11d48 !important;
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35);
}

.income-btn.active {
  background: #10b981 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  border-color: #059669 !important;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.transfer-btn.active {
  background: #8b5cf6 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  border-color: #7c3aed !important;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 800;
  color: #e2e8f0;
  letter-spacing: 0.01em;
}

:root[data-theme="light"] .form-label {
  color: #1e293b;
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  background: #1e293b;
  border: 2px solid #3b82f6;
  border-radius: 16px;
  padding: 0.3rem 0.9rem;
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.2);
}

:root[data-theme="light"] .amount-input-wrapper {
  background: #ffffff;
}

.currency-symbol {
  font-size: 1.6rem;
  font-weight: 900;
  color: #3b82f6;
  margin-right: 0.5rem;
}

.amount-input {
  font-size: 1.6rem !important;
  font-weight: 900 !important;
  border: none !important;
  background: transparent !important;
  color: #f8fafc !important;
  width: 100%;
}

:root[data-theme="light"] .amount-input {
  color: #0f172a !important;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #1e293b;
  font-size: 0.92rem;
  font-weight: 600;
  color: #f8fafc;
  box-sizing: border-box;
}

:root[data-theme="light"] .form-input, 
:root[data-theme="light"] .form-select {
  background: #ffffff;
  color: #0f172a;
  border-color: rgba(0, 0, 0, 0.15);
}

.form-select option {
  background: #1e293b;
  color: #f8fafc;
  padding: 0.5rem;
}

:root[data-theme="light"] .form-select option {
  background: #ffffff;
  color: #0f172a;
}

.scope-toggle-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.scope-toggle-btn {
  flex: 1;
  border: none;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.6rem;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 10px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

:root[data-theme="light"] .scope-toggle-btn {
  color: #475569;
}

.scope-toggle-btn.active {
  background: #3b82f6 !important;
  color: #ffffff !important;
  font-weight: 800 !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.sheet-actions {
  margin-top: 0.6rem;
}

.submit-mov-btn {
  width: 100%;
  padding: 0.95rem;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}

.submit-mov-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.5);
}

.submit-mov-btn:disabled {
  background: rgba(59, 130, 246, 0.3);
  color: rgba(255, 255, 255, 0.5);
  box-shadow: none;
  cursor: not-allowed;
}
</style>

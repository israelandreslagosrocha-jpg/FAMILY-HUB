<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFinanceStore } from '../../stores/financeStore'
import { mockMembers } from '../../mocks/familyData'
import type { MovementType, FinancialScope } from '../../types'

const financeStore = useFinanceStore()

const title = ref('')
const amount = ref<number | null>(null)
const type = ref<MovementType>('expense')
const scope = ref<FinancialScope>('family')
const categoryName = ref('Supermercado')
const registeredByMemberId = ref(mockMembers[0].id)
const belongingToMemberId = ref(mockMembers[0].id)
const date = ref(new Date().toISOString().split('T')[0])

watch(() => financeStore.isCreateSheetOpen, (isOpen) => {
  if (isOpen) {
    title.value = ''
    amount.value = null
    type.value = 'expense'
    scope.value = 'family'
    categoryName.value = 'Supermercado'
    registeredByMemberId.value = mockMembers[0].id
    belongingToMemberId.value = mockMembers[0].id
    date.value = new Date().toISOString().split('T')[0]
  }
})

const categoriesMap: Record<string, { icon: string; color: string }> = {
  'Supermercado': { icon: '🛒', color: '#ec4899' },
  'Servicios del Hogar': { icon: '💡', color: '#3b82f6' },
  'Ropa & Personal': { icon: '👟', color: '#f59e0b' },
  'Entretención & Salidas': { icon: '🍕', color: '#a855f7' },
  'Sueldos & Trabajo': { icon: '💼', color: '#10b981' },
  'Transferencia Cuentas': { icon: '🔄', color: '#8b5cf6' }
}

function handleClose() {
  financeStore.closeCreateSheet()
}

function handleSubmit() {
  if (!title.value.trim() || !amount.value || amount.value <= 0) return

  const catInfo = categoriesMap[categoryName.value] || { icon: '💸', color: '#3b82f6' }

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
  <div v-if="financeStore.isCreateSheetOpen" class="sheet-backdrop" @click="handleClose">
    <div class="sheet-modal glass-card" @click.stopPropagation>
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
            placeholder="Ej. Supermercado Lider, Cuenta de Luz, Sueldo..." 
            required 
          />
        </div>

        <!-- Categoría y Fecha -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select v-model="categoryName" class="form-select">
              <option value="Supermercado">🛒 Supermercado</option>
              <option value="Servicios del Hogar">💡 Servicios del Hogar</option>
              <option value="Ropa & Personal">👟 Ropa & Personal</option>
              <option value="Entretención & Salidas">🍕 Entretención & Salidas</option>
              <option value="Sueldos & Trabajo">💼 Sueldos & Trabajo</option>
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
              🏡 Gasto Familiar (Del Hogar)
            </button>
            <button 
              type="button" 
              class="scope-toggle-btn"
              :class="{ active: scope === 'personal' }"
              @click="scope = 'personal'"
            >
              👤 Gasto Personal
            </button>
          </div>
        </div>

        <!-- Quién Pagó y A Quién Pertenece (Si es personal) -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">¿Quién Pagó / Registró?</label>
            <select v-model="registeredByMemberId" class="form-select">
              <option v-for="m in mockMembers" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
          </div>

          <div v-if="scope === 'personal'" class="form-group">
            <label class="form-label">¿A Quién Pertenece?</label>
            <select v-model="belongingToMemberId" class="form-select">
              <option v-for="m in mockMembers" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Botón Submit -->
        <div class="sheet-actions">
          <button type="submit" class="submit-mov-btn" :disabled="!title.trim() || !amount">
            + Guardar Movimiento
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.sheet-modal {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 90vh;
  overflow-y: auto;
}

@media (prefers-color-scheme: dark) {
  .sheet-modal { background: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.1); }
}

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.sheet-title { font-size: 1.2rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.close-btn { background: rgba(0, 0, 0, 0.05); border: none; font-size: 1.4rem; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }

.sheet-form { display: flex; flex-direction: column; gap: 1rem; }

.type-selector-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
}

.type-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.55rem;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 9px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.expense-btn.active { background: #f43f5e; color: #ffffff; }
.income-btn.active { background: #10b981; color: #ffffff; }
.transfer-btn.active { background: #8b5cf6; color: #ffffff; }

.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }

.form-label { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); }

.amount-input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.03);
  border: 1.5px solid #3b82f6;
  border-radius: 14px;
  padding: 0.2rem 0.8rem;
}

.currency-symbol { font-size: 1.4rem; font-weight: 800; color: #3b82f6; margin-right: 0.4rem; }

.amount-input {
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  border: none !important;
  background: transparent !important;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  color: var(--text-primary);
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .form-input, .form-select { background: rgba(30, 41, 59, 0.8); border-color: rgba(255, 255, 255, 0.12); }
}

.scope-toggle-bar {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
}

.scope-toggle-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 9px;
  color: var(--text-secondary);
  cursor: pointer;
}

.scope-toggle-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .scope-toggle-btn.active { background: #1e293b; color: #f8fafc; }
}

.sheet-actions { margin-top: 0.5rem; }

.submit-mov-btn {
  width: 100%;
  padding: 0.85rem;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.submit-mov-btn:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
.submit-mov-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

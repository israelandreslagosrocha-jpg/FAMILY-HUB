<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useVoiceStore } from '../../stores/voiceStore'
import { useAuthStore } from '../../stores/authStore'
import AvatarImage from '../common/AvatarImage.vue'

const voiceStore = useVoiceStore()
const authStore = useAuthStore()

const editableTitle = ref('')
const editableAmount = ref<number>(0)
const editableDate = ref('')
const editableTime = ref('')
const editableCategoryName = ref('Supermercado y Alimentación')
const editableScope = ref<'family' | 'personal'>('family')
const editableMemberId = ref('')
const editableSourceAccount = ref('BancoEstado')
const editableDestAccount = ref('Efectivo / Billetera')

const availableCategories = [
  { name: 'Supermercado y Alimentación', icon: '🛒', color: '#22c55e' },
  { name: 'Servicios y Cuentas', icon: '💡', color: '#ef4444' },
  { name: 'Transporte y Combustible', icon: '🚗', color: '#f59e0b' },
  { name: 'Salud y Medicina', icon: '💊', color: '#ec4899' },
  { name: 'Educación y Colegio', icon: '🎓', color: '#8b5cf6' },
  { name: 'Entretención & Salidas', icon: '🍕', color: '#3b82f6' },
  { name: 'Honorarios & Partituras', icon: '🎼', color: '#10b981' }
]

const proposal = computed(() => voiceStore.resolvedProposal)

watch(proposal, (prop) => {
  if (prop) {
    editableTitle.value = prop.entities.title || prop.rawTranscript
    editableAmount.value = prop.entities.amount || 0
    editableDate.value = prop.entities.date || new Date().toISOString().split('T')[0]
    editableTime.value = prop.entities.time || '10:00'
    editableCategoryName.value = prop.entities.categoryName || 'Supermercado y Alimentación'
    editableScope.value = prop.entities.scope || 'family'
    editableMemberId.value = prop.entities.memberId || (authStore.activeMemberId || (authStore.familyMembers[0]?.id || ''))
    editableSourceAccount.value = prop.entities.sourceAccount || 'BancoEstado'
    editableDestAccount.value = prop.entities.destinationAccount || 'Efectivo / Billetera'
  }
}, { immediate: true })

async function handleConfirm() {
  if (!proposal.value) return

  await voiceStore.confirmProposal({
    title: editableTitle.value.trim(),
    amount: Number(editableAmount.value),
    date: editableDate.value,
    time: editableTime.value,
    categoryName: editableCategoryName.value,
    scope: editableScope.value,
    memberId: editableMemberId.value,
    sourceAccount: editableSourceAccount.value,
    destinationAccount: editableDestAccount.value
  })
}

function handleCancel() {
  voiceStore.cancelCapture()
}
</script>

<template>
  <div v-if="voiceStore.isReviewOpen && proposal" class="review-backdrop" @click.self="handleCancel">
    <div class="review-sheet glass-card">
      <div class="sheet-grabber"></div>

      <!-- Header del Review Sheet -->
      <div class="review-header">
        <div class="header-titles">
          <span class="intent-badge" :class="proposal.intent">
            {{ 
              proposal.intent === 'task.create' ? '✅ NUEVA TAREA' :
              proposal.intent === 'calendar.event.create' ? '📅 NUEVO EVENTO' :
              proposal.intent === 'finance.expense.create' ? '💸 PROPUESTA DE GASTO' :
              proposal.intent === 'finance.income.create' ? '💰 PROPUESTA DE INGRESO' :
              proposal.intent === 'finance.transfer.create' ? '🔄 TRANSFERENCIA' :
              proposal.intent === 'responsibility.create' ? '📋 RESPONSABILIDAD' :
              proposal.intent === 'reminder.create' ? '🔔 RECORDATORIO' : '❓ REVISIÓN REQUERIDA'
            }}
          </span>
          <h3 class="sheet-title">¿Está correcto lo interpretado?</h3>
        </div>
        <button class="sheet-close-btn" @click="handleCancel" title="Cerrar">✕</button>
      </div>

      <!-- Transcripción Original -->
      <div class="transcript-quote-box">
        <span class="quote-icon">🎙️</span>
        <span class="quote-text">"{{ proposal.rawTranscript }}"</span>
      </div>

      <!-- Formulario de Edición & Confirmación Human-in-the-Loop -->
      <form class="review-form" @submit.prevent="handleConfirm">
        <!-- Campo Título / Concepto -->
        <div class="form-group">
          <label class="form-label">Título o Concepto</label>
          <input 
            v-model="editableTitle" 
            type="text" 
            class="form-input" 
            placeholder="Ej: Comprar pan" 
            required 
          />
        </div>

        <!-- Campos Financieros (Monto / Cuentas) -->
        <div v-if="proposal.intent.startsWith('finance.')" class="finance-fields-box">
          <div class="form-group">
            <label class="form-label">Monto Total (CLP)</label>
            <div class="amount-input-box">
              <span class="currency-sign">$</span>
              <input 
                v-model.number="editableAmount" 
                type="number" 
                min="1" 
                class="form-input amount-val" 
                placeholder="0" 
                required 
              />
            </div>
          </div>

          <!-- Selector de Categoría para Gastos -->
          <div v-if="proposal.intent === 'finance.expense.create'" class="form-group">
            <label class="form-label">Categoría del Gasto</label>
            <select v-model="editableCategoryName" class="form-select">
              <option v-for="cat in availableCategories" :key="cat.name" :value="cat.name">
                {{ cat.icon }} {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Cuentas para Transferencias -->
          <div v-if="proposal.intent === 'finance.transfer.create'" class="form-row-2">
            <div class="form-group">
              <label class="form-label">Desde Cuenta</label>
              <input v-model="editableSourceAccount" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Hacia Cuenta</label>
              <input v-model="editableDestAccount" type="text" class="form-input" required />
            </div>
          </div>
        </div>

        <!-- Fila de Fecha y Hora -->
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input v-model="editableDate" type="date" class="form-input" required />
          </div>

          <div v-if="proposal.intent === 'calendar.event.create' || proposal.intent === 'reminder.create'" class="form-group">
            <label class="form-label">Hora</label>
            <input v-model="editableTime" type="time" class="form-input" required />
          </div>
        </div>

        <!-- Asignación de Miembro para Tareas / Responsabilidades -->
        <div v-if="proposal.intent === 'task.create' || proposal.intent === 'responsibility.create'" class="form-group">
          <label class="form-label">Asignado a</label>
          <div class="members-picker">
            <button 
              v-for="m in authStore.familyMembers" 
              :key="m.id"
              type="button"
              class="member-pill-btn"
              :class="{ active: editableMemberId === m.id }"
              @click="editableMemberId = m.id"
            >
              <AvatarImage :avatarId="m.avatarId" :size="20" :borderColor="m.color" />
              <span>{{ m.name }}</span>
            </button>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="review-actions-row">
          <button type="button" class="btn-cancel" @click="handleCancel">
            Cancelar
          </button>
          <button 
            type="submit" 
            class="btn-confirm" 
            :disabled="voiceStore.isExecutingAction || (proposal.intent.startsWith('finance.') && editableAmount <= 0)"
          >
            <span v-if="voiceStore.isExecutingAction">Guardando...</span>
            <span v-else>✓ Confirmar y Guardar</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.review-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2100;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.review-sheet {
  width: 100%;
  max-width: 560px;
  max-height: calc(100dvh - 2rem);
  background: var(--bg-card, #0f172a);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border: 1px solid var(--border-subtle);
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-grabber {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  margin: -0.25rem auto 0.25rem auto;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.intent-badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #3b82f6;
}

.intent-badge.finance-expense-create { color: #f43f5e; }
.intent-badge.finance-income-create { color: #10b981; }
.intent-badge.calendar-event-create { color: #8b5cf6; }
.intent-badge.reminder-create { color: #f59e0b; }

.sheet-title {
  font-size: clamp(1.1rem, 3.5vw, 1.25rem);
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.sheet-close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  font-size: 1.1rem;
  min-width: 38px;
  min-height: 38px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.transcript-quote-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.6rem 0.85rem;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  font-size: 0.85rem;
  color: var(--text-primary);
}

.quote-icon { font-size: 1rem; }
.quote-text { font-style: italic; font-weight: 600; }

.review-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  font-size: 16px;
  color: var(--text-primary);
  box-sizing: border-box;
  min-height: var(--touch-target-min);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.amount-input-box {
  display: flex;
  align-items: center;
  background: rgba(59, 130, 246, 0.08);
  border: 1.5px solid #3b82f6;
  border-radius: 12px;
  padding: 0 0.65rem;
  min-height: var(--touch-target-min);
}

.currency-sign {
  font-size: 1.15rem;
  font-weight: 800;
  color: #3b82f6;
  margin-right: 0.25rem;
}

.amount-val {
  font-size: 1.15rem !important;
  font-weight: 800 !important;
  border: none !important;
  background: transparent !important;
  padding-left: 0 !important;
}

.members-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.member-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.member-pill-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #3b82f6;
  font-weight: 700;
}

.review-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-subtle);
}

.btn-cancel {
  padding: 0.65rem 1.1rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.btn-confirm {
  padding: 0.65rem 1.35rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: transform 0.15s, background 0.15s;
}

.btn-confirm:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}
</style>

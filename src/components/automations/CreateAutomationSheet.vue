<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAutomationStore } from '../../stores/automationStore'
import type { ActionKindEnum, TriggerCategory } from '../../types'

const automationStore = useAutomationStore()

const name = ref('')
const description = ref('')
const category = ref<TriggerCategory>('data_event')
const triggerText = ref('Al completar la tarea "Comprar Alimentos"')
const conditionText = ref('Si la categoría es Supermercado')
const actionText = ref('Crear tarea "Guardar Mercadería en Despensa"')
const actionKind = ref<ActionKindEnum>('CREATE_TASK')

watch(() => automationStore.isCreateSheetOpen, (isOpen) => {
  if (isOpen) {
    name.value = ''
    description.value = ''
    category.value = 'data_event'
    triggerText.value = 'Al completar una tarea de la categoría Supermercado'
    conditionText.value = 'Si la tarea pertenece a mi familia'
    actionText.value = 'Crear tarea "Guardar Mercadería en Despensa"'
    actionKind.value = 'CREATE_TASK'
  }
})

function handleClose() {
  automationStore.closeCreateSheet()
}

function handleSubmit() {
  if (!name.value.trim()) return

  automationStore.createRuleWithSupabase({
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    category: category.value,
    triggerText: triggerText.value.trim(),
    conditionText: conditionText.value.trim() || undefined,
    actionText: actionText.value.trim(),
    actionKind: actionKind.value
  })
}
</script>

<template>
  <div v-if="automationStore.isCreateSheetOpen" class="sheet-backdrop" @click.self="handleClose">
    <div class="sheet-modal glass-card" @click.stop @mousedown.stop>
      <div class="sheet-grabber"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">⚡ Nueva Automatización</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form class="sheet-form" @submit.prevent="handleSubmit">
        <!-- Nombre de la Regla -->
        <div class="form-group">
          <label class="form-label">Nombre de la automatización</label>
          <input 
            v-model="name" 
            type="text" 
            class="form-input main-title-input" 
            placeholder="Ej. Tarea derivada al comprar, Rotar basura..."
            autofocus 
            required 
          />
        </div>

        <!-- BLOQUE 1: ¿CUÁNDO? (Trigger) -->
        <div class="form-block block-when">
          <div class="block-header">
            <span class="b-icon">⚡</span>
            <span class="b-title">1. ¿CUÁNDO? (Disparador)</span>
          </div>
          <div class="form-group">
            <select v-model="category" class="form-select">
              <option value="data_event">Evento en tiempo real (Al completar/crear algo)</option>
              <option value="scheduled_time">Horario programado (Día/Hora fija)</option>
            </select>
          </div>
          <div class="form-group">
            <input 
              v-model="triggerText" 
              type="text" 
              class="form-input" 
              placeholder="Ej. Al completar la tarea 'Comprar Pan'..."
              required 
            />
          </div>
        </div>

        <!-- BLOQUE 2: ¿SI? (Condición / Filtro) -->
        <div class="form-block block-if">
          <div class="block-header">
            <span class="b-icon">🔍</span>
            <span class="b-title">2. ¿SI? (Condición opcional)</span>
          </div>
          <div class="form-group">
            <input 
              v-model="conditionText" 
              type="text" 
              class="form-input" 
              placeholder="Ej. Si la categoría es Supermercado o el encargado es Papá..."
            />
          </div>
        </div>

        <!-- BLOQUE 3: ¿ENTONCES? (Catálogo Cerrado de Acción) -->
        <div class="form-block block-then">
          <div class="block-header">
            <span class="b-icon">🚀</span>
            <span class="b-title">3. ¿ENTONCES? (Acción del catálogo)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Acción permitida</label>
            <select v-model="actionKind" class="form-select">
              <option value="CREATE_TASK">Crear nueva tarea derivada</option>
              <option value="ROTATE_MEMBER">Rotar asignación entre miembros</option>
              <option value="SEND_NOTIFICATION">Enviar notificación a la PWA</option>
              <option value="REASSIGN_TASK">Reasignar encargado</option>
              <option value="SKIP_TASK">Omitir tarea</option>
            </select>
          </div>
          <div class="form-group">
            <input 
              v-model="actionText" 
              type="text" 
              class="form-input" 
              placeholder="Ej. Crear tarea 'Guardar Mercadería en Despensa'..."
              required 
            />
          </div>
        </div>

        <!-- Botón Submit -->
        <div class="sheet-actions">
          <button type="submit" class="submit-auto-btn" :disabled="!name.trim()">
            + Guardar Automatización
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@media (min-width: 640px) {
  .sheet-backdrop {
    align-items: center;
    padding: 1.5rem;
  }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.sheet-modal {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1.25rem 1.25rem calc(1.25rem + var(--sab));
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: min(90dvh, 90vh);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .sheet-modal {
    border-radius: 24px;
    padding: 1.5rem;
    max-height: 85vh;
  }
}

:root[data-theme="dark"] .sheet-modal {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sheet-grabber {
  width: 36px;
  height: 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.18);
  margin: -0.25rem auto 0.75rem auto;
}

@media (min-width: 640px) {
  .sheet-grabber {
    display: none;
  }
}

:root[data-theme="dark"] .sheet-grabber {
  background: rgba(255, 255, 255, 0.2);
}

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.15rem;
}

.sheet-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 1.4rem;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border-radius: 50%;
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

:root[data-theme="dark"] .close-btn {
  background: rgba(255, 255, 255, 0.08);
}

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.8);
  font-size: 16px; /* Evita auto-zoom en iOS */
  color: var(--text-primary);
  box-sizing: border-box;
  touch-action: manipulation;
}

:root[data-theme="dark"] .form-input,
:root[data-theme="dark"] .form-select {
  background: rgba(30, 41, 59, 0.8);
}

.main-title-input {
  font-size: 1.05rem;
  font-weight: 700;
  border-color: #3b82f6;
}

.form-block {
  padding: 0.85rem 1rem;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid var(--border-subtle);
  box-sizing: border-box;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.block-when { background: rgba(245, 158, 11, 0.06); border-color: rgba(245, 158, 11, 0.25); }
.block-when .b-title { color: #d97706; }

.block-if { background: rgba(59, 130, 246, 0.06); border-color: rgba(59, 130, 246, 0.25); }
.block-if .b-title { color: #2563eb; }

.block-then { background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.25); }
.block-then .b-title { color: #059669; }

.sheet-actions {
  margin-top: 0.5rem;
}

.submit-auto-btn {
  width: 100%;
  padding: 0.85rem;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  transition: transform 0.15s, background 0.15s;
}

.submit-auto-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.submit-auto-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

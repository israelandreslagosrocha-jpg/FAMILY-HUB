<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTaskStore } from '../../stores/taskStore'
import { useAuthStore } from '../../stores/authStore'
import type { PriorityLevel } from '../../types'

const taskStore = useTaskStore()
const authStore = useAuthStore()

const title = ref('')
const description = ref('')
const assignedToMemberId = ref('m-1')
const priority = ref<PriorityLevel>('media')
const dueDate = ref('2026-08-19')
const category = ref('Hogar')
const responsibilityId = ref<string | undefined>(undefined)

watch(() => taskStore.isCreateTaskSheetOpen, (isOpen) => {
  if (isOpen) {
    title.value = ''
    description.value = ''
    if (taskStore.filterMemberId !== 'all') {
      assignedToMemberId.value = taskStore.filterMemberId
    } else {
      assignedToMemberId.value = authStore.activeMemberId || (authStore.familyMembers[0]?.id || 'm-1')
    }
    priority.value = 'media'
    dueDate.value = new Date().toISOString().split('T')[0]
    category.value = 'Hogar'
    responsibilityId.value = undefined
  }
})

function handleClose() {
  taskStore.closeCreateTaskSheet()
}

function handleSubmit() {
  if (!title.value.trim()) return

  taskStore.addTaskWithSupabase({
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    assignedMemberId: assignedToMemberId.value,
    priority: priority.value,
    dueDate: dueDate.value,
    responsibilityId: responsibilityId.value
  })
}
</script>

<template>
  <div v-if="taskStore.isCreateTaskSheetOpen" class="sheet-backdrop" @click.self="handleClose">
    <div class="sheet-modal glass-card" @click.stop>
      <div class="sheet-header">
        <h3 class="sheet-title">📋 Nueva Tarea</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form class="sheet-form" @submit.prevent="handleSubmit">
        <!-- 1. TÍTULO -->
        <div class="form-group">
          <label class="form-label">¿Qué hay que hacer?</label>
          <input 
            v-model="title" 
            type="text" 
            class="form-input main-title-input" 
            placeholder="Ej. Comprar leche, Pagar cuenta de luz..."
            autofocus 
            required 
          />
        </div>

        <!-- 2. ENCARGADO / ASIGNADO A -->
        <div class="form-group">
          <label class="form-label">Asignado a</label>
          <div class="members-chips-grid">
            <button 
              v-for="member in taskStore.members" 
              :key="member.id"
              type="button"
              class="member-select-chip"
              :class="{ selected: assignedToMemberId === member.id }"
              :style="{ '--m-color': member.color }"
              @click="assignedToMemberId = member.id"
            >
              <span class="badge-dot" :style="{ backgroundColor: member.color }"></span>
              <span class="chip-name">{{ member.name }}</span>
            </button>
          </div>
        </div>

        <!-- 3. PRIORIDAD Y FECHA -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Prioridad</label>
            <select v-model="priority" class="form-select">
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🔵 Baja</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Fecha límite</label>
            <input v-model="dueDate" type="date" class="form-input" required />
          </div>
        </div>

        <!-- 4. VINCULAR A RESPONSABILIDAD (OPCIONAL) -->
        <div class="form-group">
          <label class="form-label">Responsabilidad del hogar (opcional)</label>
          <select v-model="responsibilityId" class="form-select">
            <option :value="undefined">Ninguna (Tarea puntual)</option>
            <option 
              v-for="resp in taskStore.responsibilities" 
              :key="resp.id" 
              :value="resp.id"
            >
              {{ resp.icon }} {{ resp.title }}
            </option>
          </select>
        </div>

        <!-- BOTÓN SUBMIT -->
        <div class="sheet-actions">
          <button type="submit" class="submit-task-btn" :disabled="!title.trim()">
            + Crear Tarea
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

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
  .sheet-modal {
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.sheet-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 1.4rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
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

.form-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  color: var(--text-primary);
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .form-input, .form-select {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.main-title-input {
  font-size: 1.05rem;
  font-weight: 600;
  border-color: #3b82f6;
}

.members-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-select-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.member-select-chip.selected {
  border-color: var(--m-color, #3b82f6);
  background: rgba(59, 130, 246, 0.12);
  color: var(--text-primary);
}

.badge-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.sheet-actions {
  margin-top: 0.5rem;
}

.submit-task-btn {
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

.submit-task-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.submit-task-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

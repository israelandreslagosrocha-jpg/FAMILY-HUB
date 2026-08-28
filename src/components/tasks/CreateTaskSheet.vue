<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useTaskStore } from '../../stores/taskStore'
import { useAuthStore } from '../../stores/authStore'
import type { PriorityLevel } from '../../types'
import { getChileTodayString } from '../../utils/dateUtils'

const taskStore = useTaskStore()
const authStore = useAuthStore()

const title = ref('')
const description = ref('')
const assignedToMemberId = ref('m-1')
const priority = ref<PriorityLevel>('media')
const dueDate = ref(getChileTodayString())
const category = ref('Hogar')
const responsibilityId = ref<string | undefined>(undefined)
const fixedTime = ref('')

const isSuggestionForPapa = computed(() => {
  const selected = taskStore.members.find(m => m.id === assignedToMemberId.value)
  const isPapa = selected?.role === 'Papá' || selected?.role === 'Jefe de Hogar' || selected?.name.toLowerCase().includes('israel')
  const isSelf = authStore.activeMemberId === assignedToMemberId.value
  return isPapa && !isSelf
})

watch(() => taskStore.isCreateTaskSheetOpen, (isOpen) => {
  if (isOpen) {
    if (taskStore.editingTask) {
      title.value = taskStore.editingTask.title
      description.value = taskStore.editingTask.description || ''
      assignedToMemberId.value = taskStore.editingTask.assignedToMemberId
      priority.value = taskStore.editingTask.priority
      dueDate.value = taskStore.editingTask.dueDate
      category.value = taskStore.editingTask.category
      responsibilityId.value = taskStore.editingTask.responsibilityId
      fixedTime.value = ''
    } else if (taskStore.editingResponsibility) {
      title.value = taskStore.editingResponsibility.title
      description.value = taskStore.editingResponsibility.description || ''
      assignedToMemberId.value = taskStore.editingResponsibility.defaultAssignedMemberId
      fixedTime.value = taskStore.editingResponsibility.fixedTime || ''
    } else {
      title.value = ''
      description.value = ''
      fixedTime.value = ''
      if (taskStore.filterMemberId !== 'all') {
        assignedToMemberId.value = taskStore.filterMemberId
      } else {
        assignedToMemberId.value = authStore.activeMemberId || (authStore.familyMembers[0]?.id || 'm-1')
      }
      priority.value = 'media'
      dueDate.value = getChileTodayString()
      category.value = 'Hogar'
      responsibilityId.value = undefined
    }
  }
})

function handleClose() {
  taskStore.closeCreateTaskSheet()
}

function handleSubmit() {
  if (!title.value.trim()) return

  if (taskStore.editingTask) {
    taskStore.updateTaskDetails(taskStore.editingTask.id, title.value.trim(), description.value.trim() || undefined)
    taskStore.reassignTask(taskStore.editingTask.id, assignedToMemberId.value)
    taskStore.closeCreateTaskSheet()
  } else if (taskStore.editingResponsibility) {
    taskStore.updateResponsibilityWithSupabase(taskStore.editingResponsibility.id, {
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      defaultAssignedMemberId: assignedToMemberId.value,
      fixedTime: fixedTime.value || undefined
    })
  } else if (taskStore.createTaskSheetMode === 'responsibility') {
    taskStore.addResponsibilityWithSupabase({
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      defaultAssignedMemberId: assignedToMemberId.value,
      fixedTime: fixedTime.value || undefined
    })
  } else {
    taskStore.addTaskWithSupabase({
      title: title.value.trim(),
      description: description.value.trim() || undefined,
      assignedMemberId: assignedToMemberId.value,
      priority: priority.value,
      dueDate: dueDate.value,
      responsibilityId: responsibilityId.value
    })
  }
}
</script>

<template>
  <div v-if="taskStore.isCreateTaskSheetOpen" class="sheet-backdrop" @click.self="handleClose">
    <div class="sheet-modal glass-card" @click.stop>
      <div class="sheet-grabber"></div>
      <div class="sheet-header">
        <h3 class="sheet-title">
          <template v-if="taskStore.editingTask">✏️ Editar Tarea</template>
          <template v-else-if="taskStore.editingResponsibility">✏️ Editar Responsabilidad</template>
          <template v-else-if="taskStore.createTaskSheetMode === 'responsibility'">🛠️ Nueva Responsabilidad</template>
          <template v-else>📋 Nueva Tarea</template>
        </h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <!-- Selector Táctil Dual estilo Apple Pill (deshabilitado al editar) -->
      <div v-if="!taskStore.editingTask && !taskStore.editingResponsibility" class="sheet-mode-toggle">
        <button 
          type="button"
          class="mode-pill-btn" 
          :class="{ active: taskStore.createTaskSheetMode === 'task' }"
          @click="taskStore.createTaskSheetMode = 'task'"
        >
          📋 Tarea del Hogar
        </button>
        <button 
          type="button"
          class="mode-pill-btn" 
          :class="{ active: taskStore.createTaskSheetMode === 'responsibility' }"
          @click="taskStore.createTaskSheetMode = 'responsibility'"
        >
          🛠️ Responsabilidad
        </button>
      </div>

      <form class="sheet-form" @submit.prevent="handleSubmit">
        <!-- 1. TÍTULO -->
        <div class="form-group">
          <label class="form-label">
            {{ taskStore.createTaskSheetMode === 'responsibility' ? 'Nombre de la Responsabilidad' : '¿Qué hay que hacer?' }}
          </label>
          <input 
            v-model="title" 
            type="text" 
            class="form-input main-title-input" 
            :placeholder="taskStore.createTaskSheetMode === 'responsibility' ? 'Ej. Sacar la basura, Cocinar almuerzo, Lavar los platos...' : 'Ej. Comprar leche, Pagar cuenta de luz...'"
            autofocus 
            required 
          />
        </div>

        <!-- 2. ENCARGADO / ASIGNADO A -->
        <div class="form-group">
          <label class="form-label">
            {{ taskStore.createTaskSheetMode === 'responsibility' ? 'Miembro Responsable' : 'Asignado a' }}
          </label>
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

        <!-- AVISO DE SUGERENCIA PARA ISRAEL (SOLO EN MODO TAREA) -->
        <div v-if="taskStore.createTaskSheetMode === 'task' && isSuggestionForPapa" class="suggestion-notice-pill">
          💡 <strong>Sugerencia para Israel:</strong> Se enviará como una sugerencia a Israel para que la revise y acepte.
        </div>

        <!-- HORARIO FIJO (SOLO EN MODO RESPONSABILIDAD) -->
        <div v-if="taskStore.createTaskSheetMode === 'responsibility'" class="form-group">
          <label class="form-label">⏰ Horario Fijo Cotidiano (opcional)</label>
          <input v-model="fixedTime" type="time" class="form-input" placeholder="Ej. 08:30" />
        </div>

        <!-- 3. PRIORIDAD Y FECHA (SOLO MODO TAREA) -->
        <div v-if="taskStore.createTaskSheetMode === 'task'" class="form-row">
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

        <!-- 4. VINCULAR A RESPONSABILIDAD (OPCIONAL EN MODO TAREA) -->
        <div v-if="taskStore.createTaskSheetMode === 'task'" class="form-group">
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
            <template v-if="taskStore.editingTask || taskStore.editingResponsibility">💾 Guardar Cambios</template>
            <template v-else-if="taskStore.createTaskSheetMode === 'responsibility'">+ Crear Responsabilidad</template>
            <template v-else>+ Crear Tarea</template>
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

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.sheet-mode-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  margin-bottom: 1.15rem;
}

:root[data-theme="dark"] .sheet-mode-toggle {
  background: rgba(255, 255, 255, 0.08);
}

.mode-pill-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.55rem 0.85rem;
  min-height: var(--touch-target-min);
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.mode-pill-btn.active {
  background: #3b82f6;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
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

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 480px) {
  .form-row {
    flex-direction: row;
  }
}

.flex-1 { flex: 1; }

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

.members-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-select-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.85rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
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
  flex-shrink: 0;
}

.sheet-actions {
  margin-top: 0.5rem;
}

.submit-task-btn {
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

.submit-task-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.submit-task-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestion-notice-pill {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #d97706;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  font-size: 0.82rem;
  line-height: 1.35;
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCalendarStore } from '../../stores/calendarStore'
import { useAuthStore } from '../../stores/authStore'
import type { CalendarRecurrence } from '../../types'
import { buildChileISOString } from '../../utils/dateUtils'

const calendarStore = useCalendarStore()
const authStore = useAuthStore()

// Campos básicos de la creación ultrarrápida
const title = ref('')
const eventDate = ref('')
const startTime = ref('10:30')
const endTime = ref('11:30')
const isAllDay = ref(false)
const selectedMemberIds = ref<string[]>([])

// Campos de "Más opciones"
const showMoreOptions = ref(false)
const categoryId = ref<string | undefined>(undefined)
const recurrence = ref<CalendarRecurrence>('never')
const description = ref('')

// Sincronizar fecha contextual cuando se abre el modal
watch(() => calendarStore.isSheetOpen, (isOpen) => {
  if (isOpen) {
    title.value = ''
    eventDate.value = calendarStore.sheetContextDate
    startTime.value = '10:30'
    endTime.value = '11:30'
    isAllDay.value = false
    
    // Asigna por defecto el integrante seleccionado en el filtro si existe
    if (calendarStore.filterMemberId !== 'all') {
      selectedMemberIds.value = [calendarStore.filterMemberId]
    } else if (authStore.familyMembers.length > 0) {
      selectedMemberIds.value = [authStore.familyMembers[0].id]
    } else {
      selectedMemberIds.value = []
    }

    showMoreOptions.value = false
    recurrence.value = 'never'
    description.value = ''
  }
})

function toggleMember(memberId: string) {
  const index = selectedMemberIds.value.indexOf(memberId)
  if (index > -1) {
    if (selectedMemberIds.value.length > 1) {
      selectedMemberIds.value.splice(index, 1)
    }
  } else {
    selectedMemberIds.value.push(memberId)
  }
}

function handleClose() {
  calendarStore.closeCreateSheet()
}

function handleSubmit() {
  if (!title.value.trim() || selectedMemberIds.value.length === 0) return

  // Construir marcas de tiempo ISO exactas en huso horario local de Chile
  const startISO = buildChileISOString(eventDate.value, startTime.value)
  const endISO = buildChileISOString(eventDate.value, endTime.value)

  calendarStore.addEventWithSupabase({
    title: title.value.trim(),
    description: description.value.trim() || undefined,
    startTime: startISO,
    endTime: endISO,
    isAllDay: isAllDay.value,
    isFamilyEvent: selectedMemberIds.value.length > 1,
    categoryId: categoryId.value,
    memberIds: [...selectedMemberIds.value],
    recurrenceFrequency: recurrence.value !== 'never' ? recurrence.value : undefined
  })
}
</script>

<template>
  <div v-if="calendarStore.isSheetOpen" class="sheet-backdrop" @click.self="handleClose">
    <div class="sheet-modal glass-card" @click.stop>
      <div class="sheet-grabber"></div>
      <!-- Header de la Hoja Táctil -->
      <div class="sheet-header">
        <h3 class="sheet-title">📅 Nuevo Evento</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <form class="sheet-form" @submit.prevent="handleSubmit">
        <!-- 1. CAMPO PRINCIPAL: Título -->
        <div class="form-group">
          <label class="form-label">Título del evento</label>
          <input 
            v-model="title" 
            type="text" 
            class="form-input main-title-input" 
            placeholder="Ej. Cita al Dentista, Cumpleaños..."
            autofocus 
            required 
          />
        </div>

        <!-- 2. FECHA Y HORA -->
        <div class="form-group">
          <div class="date-time-row">
            <div class="field-col flex-1">
              <label class="form-label">Fecha</label>
              <input v-model="eventDate" type="date" class="form-input" required />
            </div>

            <div class="field-col flex-1" v-if="!isAllDay">
              <label class="form-label">Hora inicio</label>
              <input v-model="startTime" type="time" class="form-input" />
            </div>
          </div>

          <div class="all-day-toggle-row">
            <label class="toggle-switch">
              <input type="checkbox" v-model="isAllDay" />
              <span class="slider"></span>
            </label>
            <span class="toggle-label">Todo el día</span>
          </div>
        </div>

        <!-- 3. PARTICIPANTES (Chips Táctiles con Avatar + Color) -->
        <div class="form-group">
          <label class="form-label">¿Quiénes asisten / participan?</label>
          <div class="members-chips-grid">
            <button 
              v-for="member in authStore.familyMembers" 
              :key="member.id"
              type="button"
              class="member-select-chip"
              :class="{ selected: selectedMemberIds.includes(member.id) }"
              :style="{ '--m-color': member.color }"
              @click="toggleMember(member.id)"
            >
              <span class="badge-dot" :style="{ backgroundColor: member.color }"></span>
              <span class="chip-name">{{ member.name }}</span>
            </button>
          </div>
        </div>

        <!-- ACORDEÓN: MÁS OPCIONES (Categoría, Recurrencia, Notas) -->
        <div class="more-options-accordion">
          <button 
            type="button" 
            class="toggle-more-btn"
            @click="showMoreOptions = !showMoreOptions"
          >
            <span>{{ showMoreOptions ? '▲ Menos opciones' : '▼ Más opciones (Categoría, Repetir, Notas)' }}</span>
          </button>

          <div v-if="showMoreOptions" class="more-options-content">
            <!-- Recurrencia / Repetición -->
            <div class="form-group">
              <label class="form-label">Repetir (Recurrencia)</label>
              <select v-model="recurrence" class="form-select">
                <option value="never">Nunca</option>
                <option value="daily">Todos los días</option>
                <option value="weekly">Cada semana</option>
                <option value="monthly">Cada mes</option>
                <option value="yearly">Anual (ej. Cumpleaños)</option>
              </select>
            </div>

            <!-- Notas / Descripción -->
            <div class="form-group">
              <label class="form-label">Notas adicionales</label>
              <textarea 
                v-model="description" 
                class="form-textarea" 
                rows="2"
                placeholder="Ubicación, detalles o recordatorios..."
              ></textarea>
            </div>
          </div>
        </div>

        <!-- BOTÓN PRINCIPAL DE RESPUESTA INMEDIATA -->
        <div class="sheet-actions">
          <button type="submit" class="submit-event-btn" :disabled="!title.trim()">
            + Agregar evento
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

.form-input, .form-select, .form-textarea {
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
:root[data-theme="dark"] .form-select,
:root[data-theme="dark"] .form-textarea {
  background: rgba(30, 41, 59, 0.8);
}

.main-title-input {
  font-size: 1.05rem;
  font-weight: 700;
  border-color: #3b82f6;
}

.date-time-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 480px) {
  .date-time-row {
    flex-direction: row;
  }
}

.flex-1 {
  flex: 1;
}

.all-day-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.35rem;
  min-height: var(--touch-target-min);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #cbd5e1;
  transition: 0.2s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3b82f6;
}

input:checked + .slider:before {
  transform: translateX(18px);
}

.toggle-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
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

.more-options-accordion {
  margin-top: 0.2rem;
}

.toggle-more-btn {
  background: transparent;
  border: none;
  color: #3b82f6;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  min-height: var(--touch-target-min);
  padding: 0.2rem 0;
  display: inline-flex;
  align-items: center;
}

.more-options-content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-subtle);
}

.sheet-actions {
  margin-top: 0.5rem;
}

.submit-event-btn {
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

.submit-event-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.submit-event-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

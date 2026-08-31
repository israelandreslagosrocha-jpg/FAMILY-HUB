<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useReminderStore } from '../../stores/reminderStore'
import { getChileTodayString } from '../../utils/dateUtils'

const reminderStore = useReminderStore()

const selectedOption = ref<'exact' | '30min' | '1hour' | '1day' | '5days' | 'custom'>('30min')
const customDate = ref('')
const customTime = ref('09:00')
const isSystemAlarm = ref(false)
const isSaving = ref(false)

const activeTarget = computed(() => reminderStore.activeTargetForReminder)

watch(activeTarget, (tgt) => {
  if (tgt) {
    customDate.value = tgt.baseDate || getChileTodayString()
    customTime.value = tgt.baseTime || '09:00'
    isSystemAlarm.value = false
    selectedOption.value = tgt.baseDate ? '30min' : 'exact'
  }
}, { immediate: true })

async function handleSchedule() {
  if (!activeTarget.value) return

  isSaving.value = true
  try {
    let scheduledAt = ''
    let relativeOffsetMinutes: number | undefined = undefined

    const baseDateStr = activeTarget.value.baseDate || customDate.value || getChileTodayString()
    const baseTimeStr = activeTarget.value.baseTime || customTime.value || '09:00'
    const baseIso = `${baseDateStr}T${baseTimeStr}:00`
    const baseDate = new Date(baseIso)

    if (selectedOption.value === 'exact') {
      scheduledAt = baseIso
      relativeOffsetMinutes = 0
    } else if (selectedOption.value === '30min') {
      const targetTime = new Date(baseDate.getTime() - 30 * 60000)
      scheduledAt = targetTime.toISOString()
      relativeOffsetMinutes = -30
    } else if (selectedOption.value === '1hour') {
      const targetTime = new Date(baseDate.getTime() - 60 * 60000)
      scheduledAt = targetTime.toISOString()
      relativeOffsetMinutes = -60
    } else if (selectedOption.value === '1day') {
      const targetTime = new Date(baseDate.getTime() - 24 * 60 * 60000)
      scheduledAt = targetTime.toISOString()
      relativeOffsetMinutes = -1440
    } else if (selectedOption.value === '5days') {
      const targetTime = new Date(Date.now() + 5 * 24 * 60 * 60000)
      scheduledAt = targetTime.toISOString()
    } else if (selectedOption.value === 'custom') {
      scheduledAt = `${customDate.value}T${customTime.value}:00`
    }

    await reminderStore.scheduleReminder({
      targetType: activeTarget.value.targetType,
      targetId: activeTarget.value.targetId,
      title: activeTarget.value.title,
      scheduledAt,
      relativeOffsetMinutes,
      mode: isSystemAlarm.value && reminderStore.hasSystemAlarmAvailable ? 'system_alarm' : 'notification',
      operationIdempotencyKey: `rem-op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    })

    reminderStore.closeReminderPicker()
  } catch (err: any) {
    alert('Error al programar recordatorio: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  reminderStore.closeReminderPicker()
}
</script>

<template>
  <div v-if="reminderStore.isPickerModalOpen && activeTarget" class="picker-backdrop" @click.self="handleClose">
    <div class="picker-sheet glass-card">
      <div class="sheet-grabber"></div>

      <div class="picker-header">
        <div class="header-titles">
          <span class="header-badge">RECORDATORIO DE DISPOSITIVO</span>
          <h3 class="picker-title">¿Cuándo quieres que te avise?</h3>
          <p class="target-title">Para: "{{ activeTarget.title }}"</p>
        </div>
        <button class="sheet-close-btn" @click="handleClose" title="Cerrar">✕</button>
      </div>

      <!-- Opciones Rápidas de Antelación / Fecha -->
      <div class="options-list">
        <button 
          type="button"
          class="option-pill-btn"
          :class="{ selected: selectedOption === 'exact' }"
          @click="selectedOption = 'exact'"
        >
          <span class="option-icon">⏰</span>
          <div class="option-texts">
            <span class="option-main">A la hora del compromiso</span>
            <span class="option-sub">Notificación exacta en el momento</span>
          </div>
        </button>

        <button 
          v-if="activeTarget.baseDate"
          type="button"
          class="option-pill-btn"
          :class="{ selected: selectedOption === '30min' }"
          @click="selectedOption = '30min'"
        >
          <span class="option-icon">🔔</span>
          <div class="option-texts">
            <span class="option-main">30 minutos antes</span>
            <span class="option-sub">Tiempo para prepararte</span>
          </div>
        </button>

        <button 
          v-if="activeTarget.baseDate"
          type="button"
          class="option-pill-btn"
          :class="{ selected: selectedOption === '1hour' }"
          @click="selectedOption = '1hour'"
        >
          <span class="option-icon">🔔</span>
          <div class="option-texts">
            <span class="option-main">1 hora antes</span>
            <span class="option-sub">Para salir con antelación</span>
          </div>
        </button>

        <button 
          v-if="activeTarget.baseDate"
          type="button"
          class="option-pill-btn"
          :class="{ selected: selectedOption === '1day' }"
          @click="selectedOption = '1day'"
        >
          <span class="option-icon">📅</span>
          <div class="option-texts">
            <span class="option-main">1 día antes</span>
            <span class="option-sub">Aviso previo el día anterior</span>
          </div>
        </button>

        <button 
          type="button"
          class="option-pill-btn"
          :class="{ selected: selectedOption === '5days' }"
          @click="selectedOption = '5days'"
        >
          <span class="option-icon">📆</span>
          <div class="option-texts">
            <span class="option-main">En 5 días</span>
            <span class="option-sub">Ideal para cuotas o vencimientos</span>
          </div>
        </button>

        <button 
          type="button"
          class="option-pill-btn"
          :class="{ selected: selectedOption === 'custom' }"
          @click="selectedOption = 'custom'"
        >
          <span class="option-icon">⚙️</span>
          <div class="option-texts">
            <span class="option-main">Fecha y hora personalizada</span>
            <span class="option-sub">Elige exactamente cuándo</span>
          </div>
        </button>
      </div>

      <!-- Selector Personalizado -->
      <div v-if="selectedOption === 'custom'" class="custom-datetime-grid">
        <div class="form-group">
          <label class="form-label">Fecha del Aviso</label>
          <input v-model="customDate" type="date" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label">Hora del Aviso</label>
          <input v-model="customTime" type="time" class="form-input" required />
        </div>
      </div>

      <!-- Alarma Fuerte del Sistema (Solo si la plataforma la soporta realmente) -->
      <div v-if="reminderStore.hasSystemAlarmAvailable" class="system-alarm-toggle-box">
        <label class="alarm-label">
          <input v-model="isSystemAlarm" type="checkbox" class="alarm-checkbox" />
          <div class="alarm-texts">
            <span class="alarm-title">⏰ Usar alarma fuerte del sistema</span>
            <span class="alarm-desc">Suena en el Reloj del sistema incluso en silencio</span>
          </div>
        </label>
      </div>

      <!-- Botones de Acción -->
      <div class="actions-row">
        <button type="button" class="btn-cancel" @click="handleClose">
          Cancelar
        </button>
        <button type="button" class="btn-save" :disabled="isSaving" @click="handleSchedule">
          <span v-if="isSaving">Programando...</span>
          <span v-else>🔔 Activar Recordatorio</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2200;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.picker-sheet {
  width: 100%;
  max-width: 520px;
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

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-badge {
  font-size: 0.68rem;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 0.05em;
}

.picker-title {
  font-size: clamp(1.1rem, 3.5vw, 1.25rem);
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.target-title {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0;
  font-style: italic;
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

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-pill-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.75rem 1rem;
  min-height: var(--touch-target-min);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.option-pill-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.option-pill-btn.selected {
  background: rgba(245, 158, 11, 0.15);
  border-color: #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

.option-icon { font-size: 1.2rem; flex-shrink: 0; }
.option-texts { display: flex; flex-direction: column; }
.option-main { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
.option-sub { font-size: 0.72rem; color: var(--text-secondary); }

.custom-datetime-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.04);
  padding: 0.75rem;
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  font-size: 15px;
  color: var(--text-primary);
  box-sizing: border-box;
}

.system-alarm-toggle-box {
  padding: 0.75rem;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.alarm-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.alarm-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #ef4444;
}

.alarm-texts { display: flex; flex-direction: column; }
.alarm-title { font-size: 0.85rem; font-weight: 800; color: var(--text-primary); }
.alarm-desc { font-size: 0.72rem; color: var(--text-secondary); }

.actions-row {
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

.btn-save {
  padding: 0.65rem 1.35rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: none;
  background: #f59e0b;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
</style>

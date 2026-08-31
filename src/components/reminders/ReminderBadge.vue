<script setup lang="ts">
import { computed } from 'vue'
import { useReminderStore } from '../../stores/reminderStore'
import type { ReminderTargetType } from '../../types/reminder'

const props = defineProps<{
  targetType: ReminderTargetType
  targetId: string
  title: string
  baseDate?: string
  baseTime?: string
}>()

const reminderStore = useReminderStore()

const activeReminder = computed(() => {
  return reminderStore.getReminderForTarget(props.targetType, props.targetId)
})

function handleClick(e: Event) {
  e.stopPropagation()
  if (activeReminder.value) {
    if (confirm(`¿Deseas cancelar el recordatorio para "${props.title}"?`)) {
      reminderStore.cancelReminder(activeReminder.value.id)
    }
  } else {
    reminderStore.openReminderPicker({
      targetType: props.targetType,
      targetId: props.targetId,
      title: props.title,
      baseDate: props.baseDate,
      baseTime: props.baseTime
    })
  }
}
</script>

<template>
  <button 
    class="reminder-badge-btn"
    :class="{ active: !!activeReminder }"
    :title="activeReminder ? 'Recordatorio activo (Toca para cancelar)' : 'Programar recordatorio en dispositivo'"
    @click="handleClick"
  >
    <span class="badge-icon">{{ activeReminder ? '🔔' : '⏱️' }}</span>
    <span v-if="activeReminder" class="badge-label">Recordatorio activo</span>
  </button>
</template>

<style scoped>
.reminder-badge-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  min-height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.reminder-badge-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.02);
}

.reminder-badge-btn.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: #f59e0b;
}

:root[data-theme="dark"] .reminder-badge-btn.active {
  color: #fbbf24;
}

.badge-icon {
  font-size: 0.85rem;
}

.badge-label {
  white-space: nowrap;
}
</style>

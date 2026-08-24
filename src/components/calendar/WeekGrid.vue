<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '../../stores/calendarStore'
import { getChileTodayString } from '../../utils/dateUtils'

const calendarStore = useCalendarStore()

// Genera los 7 días de la semana seleccionada
const weekDays = computed(() => {
  const todayStr = getChileTodayString()
  const [year, month, day] = calendarStore.selectedDate.split('-').map(Number)
  const current = new Date(year, month - 1, day)
  
  let dayOfWeek = current.getDay() - 1 // 0=Lun, 6=Dom
  if (dayOfWeek === -1) dayOfWeek = 6

  const monday = new Date(current)
  monday.setDate(current.getDate() - dayOfWeek)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const fullDateStr = `${yyyy}-${mm}-${dd}`

    const dayName = d.toLocaleDateString('es-CL', { weekday: 'short' })
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1)

    const dayEvents = calendarStore.filteredEvents.filter(e => e.eventDate === fullDateStr)

    days.push({
      dateStr: fullDateStr,
      dayName: capitalizedDayName,
      dayNumber: d.getDate(),
      isToday: fullDateStr === todayStr,
      isSelected: fullDateStr === calendarStore.selectedDate,
      events: dayEvents
    })
  }

  return days
})

function selectDay(dateStr: string) {
  calendarStore.setSelectedDate(dateStr)
  calendarStore.setViewType('day')
}

function handleContextAdd(dateStr: string, e: Event) {
  e.stopPropagation()
  calendarStore.openCreateSheet(dateStr)
}
</script>

<template>
  <div class="week-grid-container glass-card">
    <div class="week-grid">
      <div 
        v-for="day in weekDays" 
        :key="day.dateStr"
        class="week-day-column"
        :class="{ 'is-today': day.isToday, 'is-selected': day.isSelected }"
        @click="selectDay(day.dateStr)"
      >
        <div class="column-header">
          <span class="day-name">{{ day.dayName }}</span>
          <span class="day-num">{{ day.dayNumber }}</span>
          <button 
            class="add-quick-icon" 
            title="Nuevo evento este día"
            @click="handleContextAdd(day.dateStr, $event)"
          >
            +
          </button>
        </div>

        <div class="events-stack">
          <div v-if="day.events.length === 0" class="no-events-stub">
            —
          </div>
          <div 
            v-for="event in day.events" 
            :key="event.id"
            class="week-event-chip"
            :style="{ borderLeftColor: event.color || '#3b82f6' }"
          >
            <span class="chip-time">{{ event.isAllDay ? 'Día' : event.startTime }}</span>
            <span class="chip-title">{{ event.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-grid-container {
  padding: 1.25rem;
  border-radius: 20px;
  overflow-x: auto;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  gap: 8px;
}

.week-day-column {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 14px;
  padding: 8px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-color-scheme: dark) {
  .week-day-column {
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(255, 255, 255, 0.05);
  }
}

.week-day-column:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.8);
}

.week-day-column.is-today {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.week-day-column.is-selected {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 6px;
}

.day-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.day-num {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.add-quick-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.week-day-column:hover .add-quick-icon {
  opacity: 1;
}

.events-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.no-events-stub {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: center;
  padding-top: 1rem;
  opacity: 0.4;
}

.week-event-chip {
  background: rgba(255, 255, 255, 0.7);
  border-left: 3px solid #3b82f6;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

@media (prefers-color-scheme: dark) {
  .week-event-chip {
    background: rgba(15, 23, 42, 0.7);
  }
}

.chip-time {
  font-weight: 700;
  color: #3b82f6;
  font-size: 0.68rem;
}

.chip-title {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

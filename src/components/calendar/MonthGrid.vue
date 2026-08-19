<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '../../stores/calendarStore'

const calendarStore = useCalendarStore()

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Genera la grilla de días del mes seleccionado (Agosto 2026)
const calendarDays = computed(() => {
  const [year, month] = calendarStore.selectedDate.split('-').map(Number)
  
  // Primer día del mes
  const firstDayOfMonth = new Date(year, month - 1, 1)
  const lastDayOfMonth = new Date(year, month, 0)

  let startDayOfWeek = firstDayOfMonth.getDay() - 1 // 0=Lun, 6=Dom
  if (startDayOfWeek === -1) startDayOfWeek = 6

  const totalDays = lastDayOfMonth.getDate()
  const daysArray = []

  // Relleno mes anterior
  for (let i = startDayOfWeek; i > 0; i--) {
    const prevDate = new Date(year, month - 1, 1 - i)
    daysArray.push({
      dayNumber: prevDate.getDate(),
      fullDate: formatDate(prevDate),
      isCurrentMonth: false
    })
  }

  // Días del mes actual
  for (let d = 1; d <= totalDays; d++) {
    const currDate = new Date(year, month - 1, d)
    const fullDateStr = formatDate(currDate)
    
    // Obtener puntos de eventos para este día
    const dayEvents = calendarStore.filteredEvents.filter(e => e.eventDate === fullDateStr)
    const dots = dayEvents.slice(0, 3).map(e => {
      const member = calendarStore.members.find(m => e.memberIds.includes(m.id))
      return {
        id: e.id,
        color: e.color || member?.color || '#3b82f6'
      }
    })

    daysArray.push({
      dayNumber: d,
      fullDate: fullDateStr,
      isCurrentMonth: true,
      isToday: fullDateStr === '2026-08-19',
      isSelected: fullDateStr === calendarStore.selectedDate,
      dots
    })
  }

  return daysArray
})

function formatDate(dateObj: Date): string {
  const yyyy = dateObj.getFullYear()
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
  const dd = String(dateObj.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function selectDay(dateStr: string) {
  calendarStore.setSelectedDate(dateStr)
  // Al tocar un día en vista mes, cambia automáticamente a la vista Día para ver la agenda
  calendarStore.setViewType('day')
}

function handleContextAdd(dateStr: string, e: Event) {
  e.stopPropagation()
  calendarStore.openCreateSheet(dateStr)
}
</script>

<template>
  <div class="month-grid-container glass-card">
    <!-- Encabezado Días de la Semana -->
    <div class="weekday-header">
      <div v-for="wd in weekDays" :key="wd" class="weekday-cell">{{ wd }}</div>
    </div>

    <!-- Grilla Mensual -->
    <div class="month-days-grid">
      <div 
        v-for="(day, index) in calendarDays" 
        :key="index"
        class="day-cell"
        :class="{ 
          'other-month': !day.isCurrentMonth,
          'is-today': day.isToday,
          'is-selected': day.isSelected
        }"
        @click="selectDay(day.fullDate)"
      >
        <div class="day-cell-top">
          <span class="day-number">{{ day.dayNumber }}</span>
          <button 
            class="context-add-btn" 
            title="Nuevo evento este día"
            @click="handleContextAdd(day.fullDate, $event)"
          >
            +
          </button>
        </div>

        <!-- Indicadores de Actividad Puntos (● ● ○) -->
        <div class="dots-row">
          <span 
            v-for="dot in day.dots" 
            :key="dot.id" 
            class="event-dot"
            :style="{ backgroundColor: dot.color }"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-grid-container {
  padding: 1.25rem;
  border-radius: 20px;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary, #64748b);
  margin-bottom: 0.75rem;
}

.month-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.day-cell {
  aspect-ratio: 1 / 1;
  min-height: 54px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

@media (prefers-color-scheme: dark) {
  .day-cell {
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(255, 255, 255, 0.05);
  }
}

.day-cell:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.day-cell.other-month {
  opacity: 0.35;
}

.day-cell.is-today {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.day-cell.is-selected {
  background: #3b82f6 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
}

.day-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-number {
  font-size: 0.9rem;
  font-weight: 700;
}

.context-add-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  font-size: 0.8rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.day-cell:hover .context-add-btn {
  opacity: 1;
}

.day-cell.is-selected .context-add-btn {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.dots-row {
  display: flex;
  gap: 3px;
  justify-content: center;
  align-items: center;
  min-height: 8px;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
</style>

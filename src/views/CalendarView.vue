<script setup lang="ts">
import { onMounted } from 'vue'
import { useCalendarStore } from '../stores/calendarStore'
import CalendarHeader from '../components/calendar/CalendarHeader.vue'
import DayTimeline from '../components/calendar/DayTimeline.vue'
import WeekGrid from '../components/calendar/WeekGrid.vue'
import MonthGrid from '../components/calendar/MonthGrid.vue'
import CreateEventSheet from '../components/calendar/CreateEventSheet.vue'
import EducationalHintCard from '../components/common/EducationalHintCard.vue'

const calendarStore = useCalendarStore()

onMounted(async () => {
  calendarStore.resetToToday()
  await calendarStore.loadDataFromSupabase()
})

function handleUniversalAdd() {
  calendarStore.openCreateSheet()
}
</script>

<template>
  <div class="calendar-page-container">
    <!-- Encabezado de Navegación, Vistas y Filtros del Calendario -->
    <CalendarHeader />

    <!-- Guía Educativa de Ejemplo -->
    <EducationalHintCard type="events" />

    <!-- Vistas del Calendario (Jerarquía: Día > Semana > Mes) -->
    <main class="calendar-content">
      <!-- VISTA DÍA (Prioridad #1 de uso cotidiano) -->
      <DayTimeline v-if="calendarStore.viewType === 'day'" />

      <!-- VISTA SEMANA (Organización intermedia) -->
      <WeekGrid v-else-if="calendarStore.viewType === 'week'" />

      <!-- VISTA MES (Planificación panorámica) -->
      <MonthGrid v-else-if="calendarStore.viewType === 'month'" />
    </main>

    <!-- Botón Flotante Universal '+' Contextual (Decisión #4) -->
    <button 
      class="universal-fab-btn" 
      title="Nuevo evento (Rápido)"
      @click="handleUniversalAdd"
    >
      +
    </button>

    <!-- Modal Sheet Inferior Táctil para Creación Ultra-Rápida -->
    <CreateEventSheet />
  </div>
</template>

<style scoped>
.calendar-page-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  min-height: calc(100vh - 160px);
  padding-bottom: 5rem;
}

.calendar-content {
  flex: 1;
}

/* Botón Flotante Universal '+' (Decisión #4) */
.universal-fab-btn {
  position: fixed;
  bottom: 5rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 2rem;
  font-weight: 300;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
  cursor: pointer;
  z-index: 900;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
}

.universal-fab-btn:hover {
  transform: scale(1.08) rotate(90deg);
  box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
}

.universal-fab-btn:active {
  transform: scale(0.95);
}

@media (min-width: 768px) {
  .universal-fab-btn {
    bottom: 2.5rem;
    right: 2.5rem;
    width: 60px;
    height: 60px;
  }
}
</style>

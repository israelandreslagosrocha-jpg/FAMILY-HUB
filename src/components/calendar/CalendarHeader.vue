<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '../../stores/calendarStore'
import { useAuthStore } from '../../stores/authStore'
import type { CalendarViewType, ViewMode } from '../../types'

const calendarStore = useCalendarStore()
const authStore = useAuthStore()

// Formateador de Fecha según la vista
const formattedDateTitle = computed(() => {
  const [year, month, day] = calendarStore.selectedDate.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  
  if (calendarStore.viewType === 'day') {
    const weekday = dateObj.toLocaleDateString('es-CL', { weekday: 'long' })
    const monthName = dateObj.toLocaleDateString('es-CL', { month: 'long' })
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    return `${capitalizedWeekday} ${day} de ${capitalizedMonth}`
  } else if (calendarStore.viewType === 'month') {
    const monthName = dateObj.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    return monthName.charAt(0).toUpperCase() + monthName.slice(1)
  } else {
    return `Semana del ${day} de Agosto`
  }
})

function changeDate(daysOffset: number) {
  const [year, month, day] = calendarStore.selectedDate.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + daysOffset)
  
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  
  calendarStore.setSelectedDate(`${yyyy}-${mm}-${dd}`)
}

function resetToToday() {
  calendarStore.setSelectedDate('2026-08-19')
}

function handleViewType(type: CalendarViewType) {
  calendarStore.setViewType(type)
}

function handleViewMode(mode: ViewMode) {
  calendarStore.setViewMode(mode)
}

function handleFilterMember(memberId: string) {
  calendarStore.setFilterMember(memberId)
}
</script>

<template>
  <header class="calendar-header bento-card">
    <!-- Fila 1: Control de Vista + Switcher Mi Día / Familia -->
    <div class="header-top-row">
      <!-- Conmutador Mi día / Familia (Regla 22) -->
      <div class="view-mode-toggle">
        <button 
          class="mode-btn"
          :class="{ active: calendarStore.viewMode === 'my_day' }"
          @click="handleViewMode('my_day')"
        >
          👤 Mi día
        </button>
        <button 
          class="mode-btn"
          :class="{ active: calendarStore.viewMode === 'family' }"
          @click="handleViewMode('family')"
        >
          🏠 Familia
        </button>
      </div>

      <!-- Selector de Tipo de Vista: Día | Semana | Mes -->
      <div class="view-type-selector">
        <button 
          class="type-btn"
          :class="{ active: calendarStore.viewType === 'day' }"
          @click="handleViewType('day')"
        >
          Día
        </button>
        <button 
          class="type-btn"
          :class="{ active: calendarStore.viewType === 'week' }"
          @click="handleViewType('week')"
        >
          Semana
        </button>
        <button 
          class="type-btn"
          :class="{ active: calendarStore.viewType === 'month' }"
          @click="handleViewType('month')"
        >
          Mes
        </button>
      </div>
    </div>

    <!-- Fila 2: Navegación de Fecha + Título -->
    <div class="header-nav-row">
      <div class="date-controls">
        <button class="icon-nav-btn" @click="changeDate(-1)" title="Día anterior">
          ‹
        </button>
        <button class="today-btn" @click="resetToToday">
          Hoy
        </button>
        <button class="icon-nav-btn" @click="changeDate(1)" title="Día siguiente">
          ›
        </button>
      </div>
      <h2 class="date-title">{{ formattedDateTitle }}</h2>
    </div>

    <!-- Fila 3: Filtro por Integrantes del Hogar (Regla 23) -->
    <div class="member-filter-bar">
      <button 
        class="filter-chip"
        :class="{ active: calendarStore.filterMemberId === 'all' }"
        @click="handleFilterMember('all')"
      >
        <span class="all-icon">👥</span>
        <span>Todos</span>
      </button>

      <button 
        v-for="member in authStore.familyMembers" 
        :key="member.id"
        class="filter-chip member-chip"
        :class="{ active: calendarStore.filterMemberId === member.id }"
        :style="{ '--member-color': member.color }"
        @click="handleFilterMember(member.id)"
      >
        <span class="color-badge" :style="{ backgroundColor: member.color }"></span>
        <span class="chip-name">{{ member.name }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.calendar-header {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
  border-radius: 20px;
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-mode-toggle, .view-type-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
}

@media (prefers-color-scheme: dark) {
  .view-mode-toggle, .view-type-selector {
    background: rgba(255, 255, 255, 0.1);
  }
}

.mode-btn, .type-btn {
  border: none;
  background: transparent;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 9px;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.mode-btn.active, .type-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .mode-btn.active, .type-btn.active {
    background: #1e293b;
    color: #f8fafc;
  }
}

.header-nav-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.date-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.icon-nav-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.2s;
}

.icon-nav-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.today-btn {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
}

.date-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.member-filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: transparent;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-chip.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.color-badge {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
</style>

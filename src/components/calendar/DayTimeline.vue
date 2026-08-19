<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '../../stores/calendarStore'

const calendarStore = useCalendarStore()

const events = computed(() => calendarStore.selectedDayEvents)
const tasks = computed(() => calendarStore.selectedDayTasks)

function getMemberObj(memberId: string) {
  return calendarStore.members.find(m => m.id === memberId)
}

function handleToggleTask(taskId: string) {
  calendarStore.toggleTask(taskId)
}

function handleOpenContextSheet() {
  calendarStore.openCreateSheet(calendarStore.selectedDate)
}
</script>

<template>
  <div class="day-timeline-container">
    <!-- CAPA 1: EVENTOS DEL DÍA (Ocupan bloques temporales) -->
    <div class="section-card glass-card">
      <div class="section-header">
        <h3 class="section-title">
          🗓️ Eventos del Día
          <span class="count-badge">{{ events.length }}</span>
        </h3>
        <button class="add-event-quick-btn" @click="handleOpenContextSheet">
          + Evento
        </button>
      </div>

      <!-- Estado Vacío -->
      <div v-if="events.length === 0" class="empty-state">
        <span class="empty-icon">☕</span>
        <p class="empty-text">No hay eventos programados para esta fecha.</p>
        <button class="action-link-btn" @click="handleOpenContextSheet">
          + Agregar un compromiso familiar
        </button>
      </div>

      <!-- Lista de Eventos del Día -->
      <div v-else class="events-list">
        <div 
          v-for="event in events" 
          :key="event.id"
          class="event-card"
          :style="{ '--event-accent': event.color || '#3b82f6' }"
        >
          <!-- Borde lateral de color semántico -->
          <div class="event-color-bar"></div>

          <div class="event-content">
            <div class="event-header-row">
              <div class="time-pill">
                <span v-if="event.isAllDay" class="all-day-tag">Todo el día</span>
                <span v-else class="time-range">{{ event.startTime }} <template v-if="event.endTime">— {{ event.endTime }}</template></span>
              </div>
              <span class="category-badge">{{ event.category }}</span>
            </div>

            <h4 class="event-card-title">{{ event.title }}</h4>
            <p v-if="event.description" class="event-description">{{ event.description }}</p>

            <!-- Participantes del Hogar (Chips con Avatar y Nombre) -->
            <div class="participants-row">
              <span class="participants-label">Participantes:</span>
              <div class="avatars-group">
                <div 
                  v-for="mId in event.memberIds" 
                  :key="mId"
                  class="member-avatar-chip"
                  :title="getMemberObj(mId)?.name"
                  :style="{ '--m-color': getMemberObj(mId)?.color }"
                >
                  <span class="dot-indicator" :style="{ backgroundColor: getMemberObj(mId)?.color }"></span>
                  <span class="member-chip-name">{{ getMemberObj(mId)?.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CAPA 2: PENDIENTES / TAREAS DEL DÍA (Separada conceptualmente) -->
    <div class="section-card glass-card tasks-section">
      <div class="section-header">
        <h3 class="section-title">
          📌 Tareas Pendientes del Día
          <span class="count-badge badge-amber">{{ tasks.length }}</span>
        </h3>
      </div>

      <div v-if="tasks.length === 0" class="empty-state compact">
        <p class="empty-text">Sin tareas pendientes asignadas para hoy.</p>
      </div>

      <div v-else class="tasks-list">
        <div 
          v-for="task in tasks" 
          :key="task.id"
          class="task-item-row"
          :class="{ completed: task.completed }"
        >
          <label class="checkbox-container">
            <input 
              type="checkbox" 
              :checked="task.completed"
              @change="handleToggleTask(task.id)"
            />
            <span class="checkmark"></span>
          </label>

          <div class="task-info" @click="handleToggleTask(task.id)">
            <span class="task-title" :class="{ strike: task.completed }">{{ task.title }}</span>
            <span v-if="task.description" class="task-desc">{{ task.description }}</span>
          </div>

          <div class="task-meta">
            <span 
              class="member-tag"
              :style="{ backgroundColor: getMemberObj(task.assignedToMemberId)?.color + '20', color: getMemberObj(task.assignedToMemberId)?.color }"
            >
              {{ getMemberObj(task.assignedToMemberId)?.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-timeline-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-card {
  padding: 1.25rem;
  border-radius: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
}

.count-badge {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
}

.count-badge.badge-amber {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.add-event-quick-btn {
  background: #3b82f6;
  color: #ffffff;
  border: none;
  padding: 0.4rem 0.85rem;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.add-event-quick-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.5rem 1rem;
  gap: 0.5rem;
}

.empty-state.compact {
  padding: 1rem;
}

.empty-icon {
  font-size: 2rem;
}

.empty-text {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  margin: 0;
}

.action-link-btn {
  background: transparent;
  border: none;
  color: #3b82f6;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 0.5rem;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.event-card {
  display: flex;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

@media (prefers-color-scheme: dark) {
  .event-card {
    background: rgba(30, 41, 59, 0.6);
    border-color: rgba(255, 255, 255, 0.05);
  }
}

.event-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.event-color-bar {
  width: 6px;
  background-color: var(--event-accent, #3b82f6);
}

.event-content {
  flex: 1;
  padding: 0.9rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.event-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-pill {
  font-size: 0.82rem;
  font-weight: 700;
  color: #3b82f6;
}

.all-day-tag {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
}

.category-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.05);
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
}

.event-card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.event-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.participants-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.3rem;
  flex-wrap: wrap;
}

.participants-label {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.avatars-group {
  display: flex;
  gap: 0.4rem;
}

.member-avatar-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Sección de Tareas */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: opacity 0.2s;
}

@media (prefers-color-scheme: dark) {
  .task-item-row {
    background: rgba(30, 41, 59, 0.5);
  }
}

.task-item-row.completed {
  opacity: 0.6;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-container input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.task-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.task-title.strike {
  text-decoration: line-through;
}

.task-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.member-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 8px;
}
</style>

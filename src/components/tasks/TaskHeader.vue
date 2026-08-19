<script setup lang="ts">
import { useTaskStore } from '../../stores/taskStore'
import type { TaskFocusType, ViewMode } from '../../types'

const taskStore = useTaskStore()

function handleFocus(focus: TaskFocusType) {
  taskStore.setTaskFocus(focus)
}

function handleViewMode(mode: ViewMode) {
  taskStore.setViewMode(mode)
}

function handleFilterMember(memberId: string) {
  taskStore.setFilterMember(memberId)
}
</script>

<template>
  <header class="task-header glass-card">
    <!-- Fila 1: Selector de Focos Principal (Mis Tareas | Tareas del Hogar | Responsabilidades) -->
    <div class="header-top-row">
      <div class="focus-selector">
        <button 
          class="focus-btn"
          :class="{ active: taskStore.taskFocus === 'my_tasks' }"
          @click="handleFocus('my_tasks')"
        >
          ✅ Mis Tareas
        </button>
        <button 
          class="focus-btn"
          :class="{ active: taskStore.taskFocus === 'family_tasks' }"
          @click="handleFocus('family_tasks')"
        >
          📋 Tareas del Hogar
        </button>
        <button 
          class="focus-btn"
          :class="{ active: taskStore.taskFocus === 'responsibilities' }"
          @click="handleFocus('responsibilities')"
        >
          🛠️ Responsabilidades
        </button>
      </div>

      <!-- Switcher Mi día / Familia (Regla 22) -->
      <div class="view-mode-toggle">
        <button 
          class="mode-btn"
          :class="{ active: taskStore.viewMode === 'my_day' }"
          @click="handleViewMode('my_day')"
        >
          👤 Mi día
        </button>
        <button 
          class="mode-btn"
          :class="{ active: taskStore.viewMode === 'family' }"
          @click="handleViewMode('family')"
        >
          🏠 Familia
        </button>
      </div>
    </div>

    <!-- Fila 2: Filtro por Integrantes del Hogar (Regla 23) -->
    <div v-if="taskStore.taskFocus !== 'my_tasks' && taskStore.viewMode !== 'my_day'" class="member-filter-bar">
      <button 
        class="filter-chip"
        :class="{ active: taskStore.filterMemberId === 'all' }"
        @click="handleFilterMember('all')"
      >
        <span class="all-icon">👥</span>
        <span>Todos</span>
      </button>

      <button 
        v-for="member in taskStore.members" 
        :key="member.id"
        class="filter-chip member-chip"
        :class="{ active: taskStore.filterMemberId === member.id }"
        @click="handleFilterMember(member.id)"
      >
        <span class="color-badge" :style="{ backgroundColor: member.color }"></span>
        <span class="chip-name">{{ member.name }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.task-header {
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

.focus-selector, .view-mode-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 3px;
  border-radius: 12px;
  gap: 2px;
}

@media (prefers-color-scheme: dark) {
  .focus-selector, .view-mode-toggle {
    background: rgba(255, 255, 255, 0.1);
  }
}

.focus-btn, .mode-btn {
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

.focus-btn.active, .mode-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .focus-btn.active, .mode-btn.active {
    background: #1e293b;
    color: #f8fafc;
  }
}

.member-filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 4px;
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
}
</style>

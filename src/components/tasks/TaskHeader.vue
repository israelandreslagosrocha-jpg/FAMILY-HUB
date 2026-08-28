<script setup lang="ts">
import { useTaskStore } from '../../stores/taskStore'
import { useAuthStore } from '../../stores/authStore'
import type { TaskFocusType, ViewMode } from '../../types'

const taskStore = useTaskStore()
const authStore = useAuthStore()

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
  <header class="task-header bento-card">
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

      <!-- Grupo de Botones de Acción Prominentes -->
      <div class="action-buttons-group">
        <button class="add-action-btn add-task-btn" @click="taskStore.openCreateTaskSheet('task')">
          <span>➕ Nueva Tarea</span>
        </button>
        <button class="add-action-btn add-resp-btn" @click="taskStore.openCreateTaskSheet('responsibility')">
          <span>🛠️ Nueva Responsabilidad</span>
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
        v-for="member in authStore.familyMembers" 
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
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: 1rem;
  border-radius: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.header-top-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

@media (min-width: 768px) {
  .header-top-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
}

.focus-selector, .view-mode-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .focus-selector, .view-mode-toggle {
    width: auto;
  }
}

:root[data-theme="dark"] .focus-selector,
:root[data-theme="dark"] .view-mode-toggle {
  background: rgba(255, 255, 255, 0.08);
}

.focus-btn, .mode-btn {
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
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.focus-btn.active, .mode-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .focus-btn.active,
:root[data-theme="dark"] .mode-btn.active {
  background: #1e293b;
  color: #f8fafc;
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

@media (min-width: 480px) {
  .action-buttons-group {
    flex-direction: row;
  }
}

@media (min-width: 768px) {
  .action-buttons-group {
    width: auto;
  }
}

.add-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0.65rem 1.1rem;
  min-height: var(--touch-target-min);
  border-radius: 14px;
  border: none;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .add-action-btn {
    flex: 1;
  }
}

@media (min-width: 768px) {
  .add-action-btn {
    flex: none;
    width: auto;
  }
}

.add-action-btn:hover {
  transform: translateY(-1px);
}

.add-task-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.add-resp-btn {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.member-filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 2px;
  width: 100%;
  box-sizing: border-box;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.5rem;
}

.member-filter-bar::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  min-height: var(--touch-target-min);
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.filter-chip.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

:root[data-theme="dark"] .filter-chip.active {
  color: #60a5fa;
}

.color-badge {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

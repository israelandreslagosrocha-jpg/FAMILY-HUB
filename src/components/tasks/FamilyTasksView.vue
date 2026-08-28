<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '../../stores/taskStore'
import type { FamilyMember, TaskItem } from '../../types'

const taskStore = useTaskStore()

// Agrupar tareas por cada miembro de la familia
const tasksByMember = computed(() => {
  return taskStore.members.map((member: FamilyMember) => {
    const memberTasks = taskStore.tasks.filter((t: TaskItem) => t.assignedToMemberId === member.id)
    const pendingCount = memberTasks.filter((t: TaskItem) => t.status === 'pending').length
    const completedCount = memberTasks.filter((t: TaskItem) => t.status === 'completed').length
    return {
      member,
      tasks: memberTasks,
      pendingCount,
      completedCount
    }
  })
})

function handleToggle(taskId: string) {
  taskStore.toggleTaskStatus(taskId)
}

function handleDeleteTask(taskId: string) {
  if (confirm('¿Deseas eliminar esta tarea?')) {
    taskStore.deleteTask(taskId)
  }
}
</script>

<template>
  <div class="family-tasks-container">
    <div class="members-grid">
      <section 
        v-for="group in tasksByMember" 
        :key="group.member.id"
        class="member-card-group glass-card"
        :style="{ '--member-color': group.member.color }"
      >
        <!-- Encabezado del Miembro -->
        <div class="member-card-header">
          <div class="member-info-row">
            <span class="m-avatar-badge" :style="{ backgroundColor: group.member.color }">
              {{ group.member.name.charAt(0) }}
            </span>
            <div class="m-name-col">
              <h3 class="member-name">{{ group.member.name }}</h3>
              <span class="member-role">{{ group.member.role }}</span>
            </div>
          </div>

          <div class="member-stats-row">
            <span class="stat-badge pending-badge">
              {{ group.pendingCount }} pendientes
            </span>
            <span class="stat-badge completed-badge">
              {{ group.completedCount }} listas
            </span>
          </div>
        </div>

        <!-- Lista de Tareas del Miembro -->
        <div class="member-tasks-list">
          <div v-if="group.tasks.length === 0" class="no-tasks-text">
            Sin tareas asignadas
          </div>

          <div 
            v-for="task in group.tasks" 
            :key="task.id"
            class="mini-task-item"
            :class="{ 'is-completed': task.status === 'completed' }"
            @click="handleToggle(task.id)"
          >
            <input 
              type="checkbox" 
              :checked="task.status === 'completed'"
              class="mini-checkbox"
              @change.stop="handleToggle(task.id)"
            />
            <span class="mini-task-title" :class="{ strike: task.status === 'completed' }">
              {{ task.title }}
            </span>

            <div class="mini-task-actions">
              <button type="button" class="action-icon-btn" title="Editar Tarea" @click.stop="taskStore.openEditTaskSheet(task)">✏️</button>
              <button type="button" class="action-icon-btn" title="Eliminar Tarea" @click.stop="handleDeleteTask(task.id)">🗑️</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.family-tasks-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.members-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .members-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

.member-card-group {
  padding: 1.15rem 1.25rem;
  border-radius: 20px;
  border-left: 4px solid var(--member-color, #3b82f6);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  width: 100%;
}

.member-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.member-info-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.m-avatar-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 800;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.m-name-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.member-name {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.member-stats-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.2rem 0.55rem;
  border-radius: 8px;
}

.pending-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.completed-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.member-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.no-tasks-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: 0.5rem 0;
}

.mini-task-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  touch-action: manipulation;
  min-height: var(--touch-target-min);
  transition: background 0.15s;
  box-sizing: border-box;
}

:root[data-theme="dark"] .mini-task-item {
  background: rgba(30, 41, 59, 0.5);
}

.mini-task-item.is-completed {
  opacity: 0.6;
}

.mini-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #3b82f6;
  flex-shrink: 0;
}

.mini-task-title {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 0;
  line-height: 1.35;
}

.mini-task-title.strike {
  text-decoration: line-through;
}

.mini-task-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.action-icon-btn {
  background: transparent;
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  touch-action: manipulation;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.15s;
}

.action-icon-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

:root[data-theme="dark"] .action-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>

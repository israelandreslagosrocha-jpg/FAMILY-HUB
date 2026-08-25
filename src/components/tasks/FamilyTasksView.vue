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
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.member-card-group {
  padding: 1.25rem;
  border-radius: 20px;
  border-left: 4px solid var(--member-color, #3b82f6);
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.m-name-col {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.member-role {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.member-stats-row {
  display: flex;
  gap: 0.5rem;
}

.stat-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
}

.pending-badge {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.completed-badge {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.member-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.no-tasks-text {
  font-size: 0.83rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: 0.5rem 0;
}

.mini-task-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

@media (prefers-color-scheme: dark) {
  .mini-task-item {
    background: rgba(30, 41, 59, 0.5);
  }
}

.mini-task-item.is-completed {
  opacity: 0.6;
}

.mini-checkbox {
  cursor: pointer;
  accent-color: #3b82f6;
}

.mini-task-title {
  flex: 1;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
}

.mini-task-title.strike {
  text-decoration: line-through;
}

.mini-task-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.action-icon-btn {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.15s;
}

.action-icon-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}
</style>

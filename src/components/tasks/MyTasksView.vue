<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTaskStore } from '../../stores/taskStore'
import { useAuthStore } from '../../stores/authStore'
import EducationalHintCard from '../common/EducationalHintCard.vue'
import type { TaskItem } from '../../types'

const taskStore = useTaskStore()
const authStore = useAuthStore()
const activeMenuTaskId = ref<string | null>(null)

// Tareas agrupadas por Prioridad
const highPriorityTasks = computed(() => taskStore.displayedTasks.filter((t: TaskItem) => t.priority === 'alta'))
const mediumPriorityTasks = computed(() => taskStore.displayedTasks.filter((t: TaskItem) => t.priority === 'media'))
const lowPriorityTasks = computed(() => taskStore.displayedTasks.filter((t: TaskItem) => t.priority === 'baja'))

function handleToggle(taskId: string) {
  taskStore.toggleTaskStatus(taskId)
}

function handleSkip(taskId: string) {
  taskStore.skipTask(taskId)
  activeMenuTaskId.value = null
}

function handleEdit(task: TaskItem) {
  const newTitle = prompt('Editar título de la tarea:', task.title)
  if (newTitle !== null && newTitle.trim() !== '') {
    const newDesc = prompt('Editar descripción de la tarea (opcional):', task.description || '')
    taskStore.updateTaskDetails(task.id, newTitle.trim(), newDesc !== null ? newDesc.trim() : task.description)
  }
  activeMenuTaskId.value = null
}

function handleReassign(taskId: string, newMemberId: string) {
  taskStore.reassignTask(taskId, newMemberId)
  activeMenuTaskId.value = null
}

function handleDelete(taskId: string) {
  if (confirm('¿Deseas eliminar esta tarea?')) {
    taskStore.deleteTask(taskId)
    activeMenuTaskId.value = null
  }
}

function toggleOptionsMenu(taskId: string) {
  if (activeMenuTaskId.value === taskId) {
    activeMenuTaskId.value = null
  } else {
    activeMenuTaskId.value = taskId
  }
}
</script>

<template>
  <div class="my-tasks-container">
    <!-- Guía Educativa de Ejemplo -->
    <EducationalHintCard type="tasks" />
    <!-- Estado Vacío -->
    <div v-if="taskStore.displayedTasks.length === 0" class="bento-card empty-card">
      <span class="empty-icon">🎉</span>
      <h3 class="empty-title">¡Todo al día!</h3>
      <p class="empty-desc">No tienes tareas pendientes por realizar en este momento.</p>
    </div>

    <!-- Grupos por Prioridad -->
    <div v-else class="priority-groups">
      <!-- 🔴 Alta Prioridad -->
      <section v-if="highPriorityTasks.length > 0" class="priority-section glass-card">
        <h3 class="priority-title title-high">
          🔴 Prioridad Alta
          <span class="count-pill badge-red">{{ highPriorityTasks.length }}</span>
        </h3>

        <div class="tasks-list">
          <div 
            v-for="task in highPriorityTasks" 
            :key="task.id"
            class="task-card-item"
            :class="{ 
              'status-completed': task.status === 'completed',
              'status-skipped': task.status === 'skipped'
            }"
          >
            <!-- Checkbox ejecutable en 1 toque -->
            <label class="checkbox-wrapper">
              <input 
                type="checkbox" 
                :checked="task.status === 'completed'"
                @change="handleToggle(task.id)"
              />
              <span class="checkbox-custom"></span>
            </label>

            <!-- Detalle de Tarea -->
            <div class="task-details-col" @click="handleToggle(task.id)">
              <span class="task-title-text" :class="{ strike: task.status === 'completed' }">
                {{ task.title }}
              </span>
              <span v-if="task.description" class="task-desc-text">{{ task.description }}</span>
              <div class="task-sub-meta">
                <span class="category-tag">{{ task.category }}</span>
                <span v-if="task.status === 'completed' && task.completedAt" class="completed-at-text">
                  ✓ Completada
                </span>
                <span v-else-if="task.status === 'skipped'" class="skipped-at-text">
                  ↷ Omitida
                </span>
              </div>
            </div>

            <!-- Menú de Opciones (Reasignar / Omitir) -->
            <div class="task-actions-col">
              <button class="options-trigger-btn" @click.stopPropagation="toggleOptionsMenu(task.id)">
                •••
              </button>

              <div v-if="activeMenuTaskId === task.id" class="dropdown-menu glass-card">
                <button class="menu-item" @click="handleEdit(task)">
                  ✏️ Editar tarea
                </button>
                <button class="menu-item" @click="handleSkip(task.id)">
                  ↷ Omitir tarea
                </button>
                <button class="menu-item delete-item" @click="handleDelete(task.id)">
                  🗑️ Eliminar tarea
                </button>
                <div class="menu-divider"></div>
                <div class="menu-header-text">Reasignar a:</div>
                <button 
                  v-for="member in authStore.familyMembers" 
                  :key="member.id"
                  class="menu-item member-item"
                  @click="handleReassign(task.id, member.id)"
                >
                  <span class="m-dot" :style="{ backgroundColor: member.color }"></span>
                  <span>{{ member.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 🟡 Prioridad Media -->
      <section v-if="mediumPriorityTasks.length > 0" class="priority-section glass-card">
        <h3 class="priority-title title-medium">
          🟡 Prioridad Media
          <span class="count-pill badge-amber">{{ mediumPriorityTasks.length }}</span>
        </h3>

        <div class="tasks-list">
          <div 
            v-for="task in mediumPriorityTasks" 
            :key="task.id"
            class="task-card-item"
            :class="{ 
              'status-completed': task.status === 'completed',
              'status-skipped': task.status === 'skipped'
            }"
          >
            <label class="checkbox-wrapper">
              <input 
                type="checkbox" 
                :checked="task.status === 'completed'"
                @change="handleToggle(task.id)"
              />
              <span class="checkbox-custom"></span>
            </label>

            <div class="task-details-col" @click="handleToggle(task.id)">
              <span class="task-title-text" :class="{ strike: task.status === 'completed' }">
                {{ task.title }}
              </span>
              <span v-if="task.description" class="task-desc-text">{{ task.description }}</span>
              <div class="task-sub-meta">
                <span class="category-tag">{{ task.category }}</span>
                <span v-if="task.status === 'completed' && task.completedAt" class="completed-at-text">
                  ✓ Completada
                </span>
                <span v-else-if="task.status === 'skipped'" class="skipped-at-text">
                  ↷ Omitida
                </span>
              </div>
            </div>

            <div class="task-actions-col">
              <button class="options-trigger-btn" @click.stopPropagation="toggleOptionsMenu(task.id)">
                •••
              </button>

              <div v-if="activeMenuTaskId === task.id" class="dropdown-menu glass-card">
                <button class="menu-item" @click="handleEdit(task)">
                  ✏️ Editar tarea
                </button>
                <button class="menu-item" @click="handleSkip(task.id)">
                  ↷ Omitir tarea
                </button>
                <div class="menu-divider"></div>
                <div class="menu-header-text">Reasignar a:</div>
                <button 
                  v-for="member in authStore.familyMembers" 
                  :key="member.id"
                  class="menu-item member-item"
                  @click="handleReassign(task.id, member.id)"
                >
                  <span class="m-dot" :style="{ backgroundColor: member.color }"></span>
                  <span>{{ member.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 🔵 Prioridad Baja -->
      <section v-if="lowPriorityTasks.length > 0" class="priority-section glass-card">
        <h3 class="priority-title title-low">
          🔵 Prioridad Baja
          <span class="count-pill badge-blue">{{ lowPriorityTasks.length }}</span>
        </h3>

        <div class="tasks-list">
          <div 
            v-for="task in lowPriorityTasks" 
            :key="task.id"
            class="task-card-item"
            :class="{ 
              'status-completed': task.status === 'completed',
              'status-skipped': task.status === 'skipped'
            }"
          >
            <label class="checkbox-wrapper">
              <input 
                type="checkbox" 
                :checked="task.status === 'completed'"
                @change="handleToggle(task.id)"
              />
              <span class="checkbox-custom"></span>
            </label>

            <div class="task-details-col" @click="handleToggle(task.id)">
              <span class="task-title-text" :class="{ strike: task.status === 'completed' }">
                {{ task.title }}
              </span>
              <span v-if="task.description" class="task-desc-text">{{ task.description }}</span>
              <div class="task-sub-meta">
                <span class="category-tag">{{ task.category }}</span>
                <span v-if="task.status === 'completed' && task.completedAt" class="completed-at-text">
                  ✓ Completada
                </span>
                <span v-else-if="task.status === 'skipped'" class="skipped-at-text">
                  ↷ Omitida
                </span>
              </div>
            </div>

            <div class="task-actions-col">
              <button class="options-trigger-btn" @click.stopPropagation="toggleOptionsMenu(task.id)">
                •••
              </button>

              <div v-if="activeMenuTaskId === task.id" class="dropdown-menu glass-card">
                <button class="menu-item" @click="handleEdit(task)">
                  ✏️ Editar tarea
                </button>
                <button class="menu-item" @click="handleSkip(task.id)">
                  ↷ Omitir tarea
                </button>
                <div class="menu-divider"></div>
                <div class="menu-header-text">Reasignar a:</div>
                <button 
                  v-for="member in authStore.familyMembers" 
                  :key="member.id"
                  class="menu-item member-item"
                  @click="handleReassign(task.id, member.id)"
                >
                  <span class="m-dot" :style="{ backgroundColor: member.color }"></span>
                  <span>{{ member.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.my-tasks-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.empty-card {
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 20px;
}

.empty-icon {
  font-size: 2.5rem;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0.5rem 0 0.25rem;
}

.empty-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.priority-groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.priority-section {
  padding: 1.25rem;
  border-radius: 20px;
}

.priority-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-high { color: #ef4444; }
.title-medium { color: #d97706; }
.title-low { color: #2563eb; }

.count-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
}

.badge-red { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge-amber { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.badge-blue { background: rgba(59, 130, 246, 0.15); color: #2563eb; }

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.task-card-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  transition: all 0.2s ease;
}

@media (prefers-color-scheme: dark) {
  .task-card-item {
    background: rgba(30, 41, 59, 0.55);
    border-color: rgba(255, 255, 255, 0.05);
  }
}

.task-card-item.status-completed {
  opacity: 0.55;
  background: rgba(16, 185, 129, 0.05);
}

.task-card-item.status-skipped {
  opacity: 0.5;
  background: rgba(100, 116, 139, 0.05);
}

.checkbox-wrapper {
  cursor: pointer;
  padding-top: 2px;
}

.checkbox-wrapper input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.task-details-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  cursor: pointer;
}

.task-title-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.task-title-text.strike {
  text-decoration: line-through;
}

.task-desc-text {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.task-sub-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.2rem;
}

.category-tag {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.45rem;
  border-radius: 6px;
}

.completed-at-text {
  font-size: 0.72rem;
  font-weight: 700;
  color: #059669;
}

.skipped-at-text {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
}

.task-actions-col {
  position: relative;
}

.options-trigger-btn {
  background: transparent;
  border: none;
  font-size: 1rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  width: 170px;
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

@media (prefers-color-scheme: dark) {
  .dropdown-menu {
    background: #1e293b;
  }
}

.menu-item {
  background: transparent;
  border: none;
  padding: 0.45rem 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.menu-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0.2rem 0;
}

.menu-header-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 0.2rem 0.6rem;
}

.m-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import TaskHeader from '../components/tasks/TaskHeader.vue'
import MyTasksView from '../components/tasks/MyTasksView.vue'
import FamilyTasksView from '../components/tasks/FamilyTasksView.vue'
import ResponsibilitiesView from '../components/tasks/ResponsibilitiesView.vue'
import CreateTaskSheet from '../components/tasks/CreateTaskSheet.vue'

const taskStore = useTaskStore()

onMounted(async () => {
  await taskStore.loadDataFromSupabase()
})

function handleOpenCreateSheet() {
  taskStore.openCreateTaskSheet()
}
</script>

<template>
  <div class="tasks-page-view">
    <!-- Header del Módulo con Focos y Switcher -->
    <TaskHeader />

    <!-- Área Principal de Contenido dinámico según el Foco Seleccionado -->
    <main class="tasks-main-content">
      <!-- Foco 1: Mis Tareas (Mi día) -->
      <MyTasksView v-if="taskStore.taskFocus === 'my_tasks'" />

      <!-- Foco 2: Tareas del Hogar (Familia) -->
      <FamilyTasksView v-else-if="taskStore.taskFocus === 'family_tasks'" />

      <!-- Foco 3: Responsabilidades Fijas del Hogar -->
      <ResponsibilitiesView v-else-if="taskStore.taskFocus === 'responsibilities'" />
    </main>

    <!-- Botón Flotante Universal (+) -->
    <button 
      class="fab-add-button" 
      title="Agregar nueva tarea"
      @click="handleOpenCreateSheet"
    >
      <span class="fab-icon">+</span>
    </button>

    <!-- Modal Sheet de Creación Táctil -->
    <CreateTaskSheet />
  </div>
</template>

<style scoped>
.tasks-page-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 5rem; /* Espacio para navegación inferior */
  position: relative;
  min-height: 80vh;
}

.tasks-main-content {
  flex: 1;
}

.fab-add-button {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + max(1rem, var(--sab)));
  right: max(1.25rem, var(--sar));
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  touch-action: manipulation;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
}

.fab-add-button:hover {
  transform: scale(1.08);
  background: #2563eb;
}

.fab-add-button:active {
  transform: scale(0.95);
}

.fab-icon {
  font-size: 2rem;
  font-weight: 400;
  line-height: 1;
}

@media (min-width: 768px) {
  .fab-add-button {
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
  }
}
</style>

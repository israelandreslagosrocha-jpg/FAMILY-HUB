<script setup lang="ts">
import { onMounted } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import AvatarImage from '../components/common/AvatarImage.vue'
import { CheckCircle2, Calendar, DollarSign, Activity } from 'lucide-vue-next'

const store = useFamilyStore()

onMounted(() => {
  store.loadData()
})

function getMemberName(id: string) {
  const m = store.members.find(mem => mem.id === id)
  return m ? m.name : 'Familiar'
}

function getMemberAvatarId(id: string) {
  const m = store.members.find(mem => mem.id === id)
  return m ? m.avatarId : 'avatar-01'
}

function getMemberColor(id: string) {
  const m = store.members.find(mem => mem.id === id)
  return m ? m.color : '#3b82f6'
}
</script>

<template>
  <div class="dashboard-view">
    <!-- Saludo / Encabezado de Contexto (Regla 24) -->
    <div class="dashboard-banner glass-card">
      <div class="banner-user-info" v-if="store.activeMember">
        <AvatarImage 
          :avatarId="store.activeMember.avatarId" 
          :size="52" 
          :borderColor="store.activeMember.color" 
        />
        <div>
          <h1 v-if="store.viewMode === 'my_day'">
            ¡Hola, {{ store.activeMember.name }}! 👋
          </h1>
          <h1 v-else>
            Resumen Familiar 🏡
          </h1>
          <p class="text-secondary">
            <span v-if="store.viewMode === 'my_day'">
              Aquí tienes tu agenda y responsabilidades personales para hoy.
            </span>
            <span v-else>
              Estado general de las actividades, eventos y finanzas del hogar.
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Filtro Familiar por Miembros (Regla 23) -->
    <div class="family-filter-bar" v-if="store.viewMode === 'family'">
      <span class="filter-label">Filtrar por:</span>
      <div class="filter-pills">
        <button 
          class="filter-pill" 
          :class="{ active: store.selectedFilterMemberId === 'all' }"
          @click="store.setFilterMember('all')"
        >
          <span>Todos</span>
        </button>
        <button 
          v-for="m in store.members" 
          :key="m.id"
          class="filter-pill"
          :class="{ active: store.selectedFilterMemberId === m.id }"
          @click="store.setFilterMember(m.id)"
        >
          <AvatarImage :avatarId="m.avatarId" :size="20" :borderColor="m.color" />
          <span>{{ m.name }}</span>
        </button>
      </div>
    </div>

    <!-- Grid Principal de Widgets (Responsive) -->
    <div class="dashboard-grid">
      <!-- Widget Tareas Pendientes -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <CheckCircle2 class="widget-icon text-blue" />
            <h3>Tareas Pendientes</h3>
          </div>
          <span class="badge-status badge-yellow">
            {{ store.pendingTasksCount }} pendientes
          </span>
        </div>

        <div class="task-list">
          <div 
            v-for="task in store.displayedTasks" 
            :key="task.id"
            class="task-item-row"
            :class="{ completed: task.completed }"
          >
            <input 
              type="checkbox" 
              :checked="task.completed" 
              @change="store.toggleTaskCompletion(task.id)"
              class="task-checkbox"
            />
            <div class="task-info">
              <span class="task-title">{{ task.title }}</span>
              <span class="task-meta text-muted">
                {{ task.dueDate }} · {{ task.category }}
              </span>
            </div>
            <!-- Identificador de Miembro Asignado -->
            <div class="assigned-member-tag" :title="getMemberName(task.assignedToMemberId)">
              <AvatarImage 
                :avatarId="getMemberAvatarId(task.assignedToMemberId)" 
                :size="24"
                :borderColor="getMemberColor(task.assignedToMemberId)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Widget Próximos Eventos -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <Calendar class="widget-icon text-purple" />
            <h3>Próximos Eventos</h3>
          </div>
          <span class="badge-status badge-blue">Calendario</span>
        </div>

        <div class="events-list">
          <div 
            v-for="event in store.events" 
            :key="event.id"
            class="event-item-row"
          >
            <div class="event-time-badge">
              <span class="event-time">{{ event.time }}</span>
              <span class="event-date text-muted">{{ event.eventDate }}</span>
            </div>
            <div class="event-details">
              <span class="event-title">{{ event.title }}</span>
              <span class="event-cat text-muted">{{ event.category }}</span>
            </div>
            <AvatarImage 
              :avatarId="getMemberAvatarId(event.memberId)" 
              :size="24" 
              :borderColor="getMemberColor(event.memberId)"
            />
          </div>
        </div>
      </div>

      <!-- Widget Resumen Financiero -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <DollarSign class="widget-icon text-green" />
            <h3>Finanzas del Hogar</h3>
          </div>
          <span class="badge-status badge-green">Período Agosto</span>
        </div>

        <div class="finance-summary-box">
          <div class="finance-stat">
            <span class="stat-label text-secondary">Total Gastos Registrados</span>
            <span class="stat-value">${{ store.totalFamilyExpenses.toLocaleString('es-CL') }}</span>
          </div>

          <div class="recent-expenses-list">
            <div 
              v-for="exp in store.expenses" 
              :key="exp.id"
              class="expense-row"
            >
              <div class="expense-info">
                <span class="expense-title">{{ exp.title }}</span>
                <span class="expense-meta text-muted">{{ exp.date }} · {{ exp.category }}</span>
              </div>
              <span class="expense-amount">${{ exp.amount.toLocaleString('es-CL') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Widget Histórico / Actividad Reciente (Regla 19: Quién -> qué hizo -> cuándo -> ítem) -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <Activity class="widget-icon text-amber" />
            <h3>Actividad Reciente</h3>
          </div>
          <span class="badge-status badge-gray">Histórico</span>
        </div>

        <div class="history-list">
          <div 
            v-for="log in store.history" 
            :key="log.id"
            class="history-row"
          >
            <AvatarImage :avatarId="log.memberAvatarId" :size="32" />
            <div class="history-content">
              <div class="history-main">
                <strong>{{ log.memberName }}</strong> {{ log.actionText }}
              </div>
              <div class="history-item text-secondary">"{{ log.itemTitle }}"</div>
              <div class="history-time text-muted">{{ log.formattedTime }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 2rem;
}

.dashboard-banner {
  padding: 1.5rem;
}

.banner-user-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Filtro por Miembro */
.family-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 4px 0;
}

.filter-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.filter-pills {
  display: flex;
  gap: 0.5rem;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.filter-pill.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #60a5fa;
  font-weight: 600;
}

/* Layout Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.widget-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 0.75rem;
}

.widget-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.widget-icon {
  width: 20px;
  height: 20px;
}
.text-blue { color: #3b82f6; }
.text-purple { color: #a855f7; }
.text-green { color: #22c55e; }
.text-amber { color: #f59e0b; }

/* Tareas */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  transition: background var(--transition-fast);
}

.task-item-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.task-item-row.completed .task-title {
  text-decoration: line-through;
  color: var(--text-muted);
}

.task-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.task-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.task-title {
  font-size: 0.9rem;
  font-weight: 500;
}

.task-meta {
  font-size: 0.75rem;
}

/* Eventos */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.event-time-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(168, 85, 247, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
  min-width: 60px;
}

.event-time {
  font-size: 0.8rem;
  font-weight: 700;
  color: #c084fc;
}

.event-date {
  font-size: 0.65rem;
}

.event-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.event-title {
  font-size: 0.9rem;
  font-weight: 500;
}

.event-cat {
  font-size: 0.75rem;
}

/* Finanzas */
.finance-summary-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.finance-stat {
  display: flex;
  flex-direction: column;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 12px;
  border-radius: var(--radius-md);
}

.stat-label {
  font-size: 0.8rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4ade80;
}

.recent-expenses-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.expense-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border-subtle);
}

.expense-title {
  font-size: 0.85rem;
  font-weight: 500;
}

.expense-meta {
  font-size: 0.75rem;
}

.expense-amount {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Histórico */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
}

.history-content {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}

.history-main {
  color: var(--text-primary);
}

.history-item {
  font-style: italic;
  font-size: 0.8rem;
}

.history-time {
  font-size: 0.7rem;
  margin-top: 2px;
}
</style>

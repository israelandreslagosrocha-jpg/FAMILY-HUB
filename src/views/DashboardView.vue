<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useTaskStore } from '../stores/taskStore'
import { useCalendarStore } from '../stores/calendarStore'
import { useFinanceStore } from '../stores/financeStore'
import AvatarImage from '../components/common/AvatarImage.vue'
import { CheckCircle2, Calendar, DollarSign, Activity } from 'lucide-vue-next'

const authStore = useAuthStore()
const taskStore = useTaskStore()
const calendarStore = useCalendarStore()
const financeStore = useFinanceStore()

onMounted(async () => {
  await authStore.loadFamilyMembers()
  await taskStore.loadDataFromSupabase()
  await calendarStore.loadDataFromSupabase()
  await financeStore.loadDataFromSupabase()
})

const activeMember = computed(() => authStore.activeMember)

function getMemberName(id: string) {
  const m = authStore.familyMembers.find(mem => mem.id === id)
  return m ? m.name : 'Familiar'
}

function getMemberAvatarId(id: string) {
  const m = authStore.familyMembers.find(mem => mem.id === id)
  return m ? m.avatarId : 'avatar-01'
}

function getMemberColor(id: string) {
  const m = authStore.familyMembers.find(mem => mem.id === id)
  return m ? m.color : '#3b82f6'
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div class="dashboard-view">
    <!-- Saludo / Encabezado de Contexto con Nombre de Familia -->
    <div class="dashboard-banner glass-card">
      <div class="banner-user-info" v-if="activeMember">
        <AvatarImage 
          :avatarId="activeMember.avatarId" 
          :size="56" 
          :borderColor="activeMember.color" 
        />
        <div>
          <span class="family-name-tag">🏡 FAMILIA LAGOS RIQUELME</span>
          <h1 v-if="taskStore.viewMode === 'my_day'">
            ¡Hola, {{ activeMember.name }}! 👋
          </h1>
          <h1 v-else>
            Resumen Familiar 🏡
          </h1>
          <p class="text-secondary">
            <span v-if="taskStore.viewMode === 'my_day'">
              Tu agenda, tareas y responsabilidades del hogar para hoy.
            </span>
            <span v-else>
              Estado en tiempo real de actividades, calendario y finanzas familiares.
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Filtro Familiar por Miembros Reales -->
    <div class="family-filter-bar" v-if="taskStore.viewMode === 'family'">
      <span class="filter-label">Filtrar por:</span>
      <div class="filter-pills">
        <button 
          class="filter-pill" 
          :class="{ active: taskStore.filterMemberId === 'all' }"
          @click="taskStore.setFilterMember('all')"
        >
          <span>Todos</span>
        </button>
        <button 
          v-for="m in authStore.familyMembers" 
          :key="m.id"
          class="filter-pill"
          :class="{ active: taskStore.filterMemberId === m.id }"
          @click="taskStore.setFilterMember(m.id)"
        >
          <AvatarImage :avatarId="m.avatarId" :size="20" :borderColor="m.color" />
          <span>{{ m.name }}</span>
        </button>
      </div>
    </div>

    <!-- Grid Principal de Widgets (Responsive) -->
    <div class="dashboard-grid">
      <!-- Widget 1: Tareas Pendientes -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <CheckCircle2 class="widget-icon text-blue" />
            <h3>Tareas Pendientes</h3>
          </div>
          <span class="badge-status badge-yellow">
            {{ taskStore.pendingTasks.length }} pendientes
          </span>
        </div>

        <div v-if="taskStore.displayedTasks.length === 0" class="empty-widget">
          <span class="empty-emoji">🎉</span>
          <p class="empty-txt">¡Todo al día! Sin tareas pendientes.</p>
        </div>

        <div v-else class="task-list">
          <div 
            v-for="task in taskStore.displayedTasks" 
            :key="task.id"
            class="task-item-row"
            :class="{ completed: task.completed }"
          >
            <input 
              type="checkbox" 
              :checked="task.completed" 
              @change="taskStore.toggleTaskStatus(task.id)"
              class="task-checkbox"
            />
            <div class="task-info">
              <span class="task-title">{{ task.title }}</span>
              <span class="task-meta text-muted">
                {{ task.dueDate }} · {{ task.category }}
              </span>
            </div>
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

      <!-- Widget 2: Próximos Eventos -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <Calendar class="widget-icon text-purple" />
            <h3>Próximos Eventos</h3>
          </div>
          <router-link to="/calendar" class="badge-status badge-blue">Calendario</router-link>
        </div>

        <div v-if="calendarStore.events.length === 0" class="empty-widget">
          <span class="empty-emoji">☕</span>
          <p class="empty-txt">Sin eventos próximos programados.</p>
        </div>

        <div v-else class="events-list">
          <div 
            v-for="event in calendarStore.events" 
            :key="event.id"
            class="event-item-row"
          >
            <div class="event-time-badge">
              <span class="event-time">{{ event.isAllDay ? 'Todo el día' : event.startTime }}</span>
              <span class="event-date text-muted">{{ event.eventDate }}</span>
            </div>
            <div class="event-details">
              <span class="event-title">{{ event.title }}</span>
              <span class="event-cat text-muted">{{ event.category }}</span>
            </div>
            <AvatarImage 
              v-if="event.memberIds && event.memberIds[0]"
              :avatarId="getMemberAvatarId(event.memberIds[0])" 
              :size="24" 
              :borderColor="getMemberColor(event.memberIds[0])"
            />
          </div>
        </div>
      </div>

      <!-- Widget 3: Finanzas del Hogar -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <DollarSign class="widget-icon text-green" />
            <h3>Finanzas del Hogar</h3>
          </div>
          <router-link to="/finance" class="badge-status badge-green">Ver Finanzas</router-link>
        </div>

        <div class="finance-summary-box">
          <div class="finance-stat">
            <span class="stat-label text-secondary">Total Gastos Registrados</span>
            <span class="stat-value">{{ formatCurrency(financeStore.totalExpenses) }}</span>
          </div>

          <div v-if="financeStore.movements.length === 0" class="empty-widget compact">
            <p class="empty-txt">Sin movimientos registrados aún.</p>
          </div>

          <div v-else class="recent-expenses-list">
            <div 
              v-for="mov in financeStore.movements.slice(0, 4)" 
              :key="mov.id"
              class="expense-row"
            >
              <div class="expense-info">
                <span class="expense-title">{{ mov.title }}</span>
                <span class="expense-meta text-muted">{{ mov.date }} · {{ mov.categoryName }}</span>
              </div>
              <span 
                class="expense-amount" 
                :class="{ 'income-txt': mov.type === 'income', 'expense-txt': mov.type === 'expense' }"
              >
                {{ mov.type === 'income' ? '+' : '-' }} {{ formatCurrency(mov.amount) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Widget 4: Actividad Reciente / Histórico -->
      <div class="glass-card widget-card">
        <div class="widget-header">
          <div class="widget-title-group">
            <Activity class="widget-icon text-amber" />
            <h3>Actividad Reciente</h3>
          </div>
          <span class="badge-status badge-gray">Histórico</span>
        </div>

        <div class="empty-widget">
          <span class="empty-emoji">📜</span>
          <p class="empty-txt">Sin actividad reciente registrada en el historial.</p>
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
  border-radius: 20px;
}

.banner-user-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.family-name-tag {
  font-size: 0.78rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.04em;
}

.banner-user-info h1 {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0.1rem 0;
}

.banner-user-info p {
  font-size: 0.85rem;
  margin: 0;
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
  padding: 1.25rem;
  border-radius: 20px;
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

.empty-widget {
  padding: 2rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.empty-widget.compact {
  padding: 1rem;
}

.empty-emoji {
  font-size: 2rem;
}

.empty-txt {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
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
  border-radius: 12px;
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
  border-radius: 14px;
}

.stat-label {
  font-size: 0.8rem;
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 800;
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
  font-weight: 600;
}

.expense-meta {
  font-size: 0.75rem;
}

.expense-amount {
  font-size: 0.9rem;
  font-weight: 800;
}

.income-txt { color: #10b981; }
.expense-txt { color: #f43f5e; }
</style>

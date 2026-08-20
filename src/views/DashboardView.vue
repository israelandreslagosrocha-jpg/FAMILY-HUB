<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useTaskStore } from '../stores/taskStore'
import { useCalendarStore } from '../stores/calendarStore'
import { useFinanceStore } from '../stores/financeStore'
import AvatarImage from '../components/common/AvatarImage.vue'
import { Calendar } from 'lucide-vue-next'

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
  <div class="dashboard-bento-view">
    <!-- BARRA BENTO: Filtro por Miembros de la Familia -->
    <div class="bento-filter-row" v-if="taskStore.viewMode === 'family'">
      <div class="filter-pills-bento">
        <button 
          class="bento-pill" 
          :class="{ active: taskStore.filterMemberId === 'all' }"
          @click="taskStore.setFilterMember('all')"
        >
          <span>👥 Todos</span>
        </button>
        <button 
          v-for="m in authStore.familyMembers" 
          :key="m.id"
          class="bento-pill"
          :class="{ active: taskStore.filterMemberId === m.id }"
          @click="taskStore.setFilterMember(m.id)"
        >
          <AvatarImage :avatarId="m.avatarId" :size="20" :borderColor="m.color" />
          <span>{{ m.name }}</span>
        </button>
      </div>
    </div>

    <!-- 🍱 GRILLA PRINCIPAL BENTO (APPLE BENTO GRID SYSTEM) -->
    <div class="bento-grid">
      <!-- 📌 BENTO CARD HERO (8 COLS): Saludo e Identidad Familiar -->
      <div class="bento-card bento-col-7 bento-card-hero">
        <div class="hero-header-bento">
          <div class="hero-avatar-wrap" v-if="activeMember">
            <AvatarImage 
              :avatarId="activeMember.avatarId" 
              :size="64" 
              :borderColor="activeMember.color" 
            />
          </div>
          <div class="hero-titles-bento">
            <span class="hero-badge">🏡 FAMILIA LAGOS RIQUELME</span>
            <h1 class="hero-headline">
              ¡Hola, {{ activeMember?.name || 'Israel' }}! 👋
            </h1>
            <p class="hero-subtext">
              Tu centro inteligente para coordinar la vida cotidiana de tu hogar en equipo.
            </p>
          </div>
        </div>

        <div class="hero-tags-row">
          <span class="bento-tag-pill">✨ FAMILY STABLE v1.0</span>
          <span class="bento-tag-pill">👨‍👩‍👧‍👦 {{ authStore.familyMembers.length }} Integrantes</span>
          <span class="bento-tag-pill">🔒 Supabase Auth & RLS</span>
        </div>
      </div>

      <!-- 📌 BENTO CARD STAT CYAN (5 COLS): Finanzas del Hogar -->
      <div class="bento-card bento-col-5 bento-card-cyan">
        <div class="bento-card-top">
          <span class="bento-metric-title">💡 Finanzas del Hogar</span>
          <router-link to="/finance" class="bento-arrow-link">Ver todo →</router-link>
        </div>

        <div class="bento-metric-col">
          <span class="bento-metric-large">{{ formatCurrency(financeStore.totalExpenses) }}</span>
          <span class="bento-metric-sub">Total gastos registrados en el período</span>
        </div>

        <div class="bento-stat-footer">
          <span class="bento-tag-pill light-pill">
            {{ financeStore.movements.length === 0 ? '✓ Al día ($0 CLP)' : `${financeStore.movements.length} Movimientos` }}
          </span>
        </div>
      </div>

      <!-- 📌 BENTO CARD STAT GREEN (5 COLS): Tareas Pendientes -->
      <div class="bento-card bento-col-5 bento-card-green">
        <div class="bento-card-top">
          <span class="bento-metric-title">✅ Tareas Pendientes</span>
          <router-link to="/tasks" class="bento-arrow-link">Gestionar →</router-link>
        </div>

        <div class="bento-metric-col">
          <span class="bento-metric-large">{{ taskStore.pendingTasks.length }}</span>
          <span class="bento-metric-sub">
            {{ taskStore.pendingTasks.length === 0 ? '¡Todo al día en el hogar!' : 'Tareas por completar' }}
          </span>
        </div>

        <div class="bento-stat-footer">
          <span class="bento-tag-pill light-pill">
            {{ taskStore.completedTasks.length }} Completadas este mes
          </span>
        </div>
      </div>

      <!-- 📌 BENTO CARD (7 COLS): Próximos Eventos & Actividad -->
      <div class="bento-card bento-col-7">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Calendar class="bento-icon text-purple" />
            <h3 class="bento-card-title">Próximos Eventos</h3>
          </div>
          <router-link to="/calendar" class="bento-link-btn">Ver Calendario →</router-link>
        </div>

        <div v-if="calendarStore.events.length === 0" class="bento-empty-state">
          <span class="empty-emoji font-32">☕</span>
          <p class="empty-txt">Sin eventos próximos programados.</p>
        </div>

        <div v-else class="bento-events-list">
          <div 
            v-for="event in calendarStore.events.slice(0, 3)" 
            :key="event.id"
            class="bento-event-row"
          >
            <div class="bento-time-chip">
              <span class="bento-time">{{ event.isAllDay ? 'Todo el día' : event.startTime }}</span>
              <span class="bento-date text-muted">{{ event.eventDate }}</span>
            </div>
            <div class="bento-event-text">
              <span class="bento-event-title">{{ event.title }}</span>
              <span class="bento-event-cat text-muted">{{ event.category }}</span>
            </div>
            <AvatarImage 
              v-if="event.memberIds && event.memberIds[0]"
              :avatarId="getMemberAvatarId(event.memberIds[0])" 
              :size="26" 
              :borderColor="getMemberColor(event.memberIds[0])"
            />
          </div>
        </div>
      </div>

      <!-- 📌 BENTO QUOTE BANNER (12 COLS): Frase Familiar de Cierre -->
      <div class="bento-quote-banner">
        "Organización <span class="hl-cyan">familiar en equipo</span>, máxima <span class="hl-green">tranquilidad cotidianidad</span>."
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-bento-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 3rem;
}

.bento-filter-row {
  display: flex;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-pills-bento {
  display: flex;
  gap: 0.5rem;
}

.bento-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bento-pill.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Bento Card Hero */
.bento-card-hero {
  background: var(--bg-card);
  gap: 1.5rem;
}

.hero-header-bento {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.hero-badge {
  font-size: 0.75rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.06em;
}

.hero-headline {
  font-size: 1.8rem;
  font-weight: 900;
  margin: 0.2rem 0;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.hero-subtext {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.hero-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.bento-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.bento-arrow-link, .bento-link-btn {
  font-size: 0.82rem;
  font-weight: 700;
  color: currentColor;
  text-decoration: none;
  opacity: 0.9;
}

.bento-metric-col {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 1rem 0;
}

.bento-metric-sub {
  font-size: 0.83rem;
  opacity: 0.9;
}

.light-pill {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.bento-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bento-card-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0;
}

.bento-empty-state {
  text-align: center;
  padding: 1.5rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.font-32 { font-size: 2rem; }

.bento-events-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.bento-event-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.03);
}

@media (prefers-color-scheme: dark) {
  .bento-event-row {
    background: rgba(255, 255, 255, 0.04);
  }
}

.bento-time-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(168, 85, 247, 0.15);
  padding: 4px 8px;
  border-radius: 8px;
  min-width: 65px;
}

.bento-time {
  font-size: 0.8rem;
  font-weight: 800;
  color: #c084fc;
}

.bento-date { font-size: 0.65rem; }

.bento-event-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bento-event-title {
  font-size: 0.9rem;
  font-weight: 700;
}

.bento-event-cat {
  font-size: 0.75rem;
}
</style>

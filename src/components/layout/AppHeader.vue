<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFamilyStore } from '../../stores/familyStore'
import { useAuthStore } from '../../stores/authStore'
import { useCalendarStore } from '../../stores/calendarStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { getChileTimeString, getChileFormattedDate, getChileTodayString } from '../../utils/dateUtils'
import AvatarImage from '../common/AvatarImage.vue'
import NetworkStatusBadge from '../pwa/NetworkStatusBadge.vue'
import NotificationBell from '../pwa/NotificationBell.vue'
import { Mic, MicOff } from 'lucide-vue-next'

const store = useFamilyStore()
const authStore = useAuthStore()
const calendarStore = useCalendarStore()
const voiceStore = useVoiceStore()

const showMemberSelector = ref(false)
const currentTheme = ref<'dark' | 'light'>('dark')

const chileTime = ref(getChileTimeString())
const chileDate = ref(getChileFormattedDate())
let timerId: ReturnType<typeof setInterval> | null = null
let lastTodayString = getChileTodayString()

onMounted(() => {
  const savedTheme = (localStorage.getItem('family_hub_theme') as 'dark' | 'light') || 'dark'
  currentTheme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)

  timerId = setInterval(() => {
    chileTime.value = getChileTimeString()
    chileDate.value = getChileFormattedDate()

    // Verificación automática de cambio de día a medianoche
    const currentToday = getChileTodayString()
    if (currentToday !== lastTodayString) {
      lastTodayString = currentToday
      calendarStore.setSelectedDate(currentToday)
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerId) clearInterval(timerId)
})

function toggleTheme() {
  const nextTheme = currentTheme.value === 'dark' ? 'light' : 'dark'
  currentTheme.value = nextTheme
  document.documentElement.setAttribute('data-theme', nextTheme)
  localStorage.setItem('family_hub_theme', nextTheme)
}

function selectActiveMember(id: string) {
  store.setActiveMember(id)
  showMemberSelector.value = false
}

async function handleLogout() {
  if (confirm('¿Deseas cerrar sesión en FAMILY-HUB?')) {
    showMemberSelector.value = false
    await authStore.logout()
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Logo / Identificación -->
      <div class="logo-group">
        <div class="logo-badge" title="FAMILY-HUB">FH</div>
        <div class="logo-titles">
          <span class="logo-title">FAMILIA LAGOS RIQUELME</span>
          <span class="logo-subtitle">FAMILY-HUB</span>
        </div>
      </div>

      <!-- Toggle Instantáneo: Mi día | Familia (Regla 22) -->
      <div class="toggle-pill-container">
        <button 
          class="toggle-pill-btn"
          :class="{ active: store.viewMode === 'my_day' }"
          @click="store.setViewMode('my_day')"
        >
          Mi día
        </button>
        <button 
          class="toggle-pill-btn"
          :class="{ active: store.viewMode === 'family' }"
          @click="store.setViewMode('family')"
        >
          Familia
        </button>
      </div>

      <!-- Selector de Miembro Autenticado + Badges + Acciones -->
      <div class="header-right-controls">
        <!-- Reloj y Fecha Oficial Chile (America/Santiago) - Desktop / Tablet -->
        <div class="chile-clock-badge" title="Hora y Fecha en Tiempo Real de Chile (America/Santiago)">
          <span class="clock-flag">🇨🇱</span>
          <div class="clock-details">
            <span class="clock-time">{{ chileTime }}</span>
            <span class="clock-date">{{ chileDate }}</span>
          </div>
        </div>

        <!-- Estado de Red - Desktop / Tablet -->
        <div class="desktop-network-status">
          <NetworkStatusBadge />
        </div>

        <!-- Campana de Notificaciones (Siempre visible en Móvil y Desktop) -->
        <NotificationBell />

        <!-- Botón de Captura por Voz Rápida (Siempre visible en Móvil y Desktop) -->
        <button 
          class="header-voice-btn" 
          :class="{ listening: voiceStore.isListening }"
          :title="voiceStore.isListening ? 'Escuchando tu voz...' : 'Captura Rápida por Voz'"
          @click="voiceStore.isListening ? voiceStore.stopCapture() : voiceStore.startCapture()"
        >
          <Mic v-if="!voiceStore.isListening" :size="19" />
          <MicOff v-else :size="19" class="pulse-mic-icon" />
        </button>

        <!-- Botón Conmutador Tema - Desktop -->
        <button 
          class="theme-toggle-btn desktop-only-btn" 
          :title="currentTheme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'" 
          @click="toggleTheme"
        >
          <span v-if="currentTheme === 'dark'">☀️</span>
          <span v-else>🌙</span>
        </button>

        <!-- Botón Avatar de Miembro con Dropdown Unificado -->
        <div class="member-selector-relative">
          <button 
            class="active-member-btn" 
            :title="store.activeMember?.name || 'Perfil'"
            @click="showMemberSelector = !showMemberSelector"
            v-if="store.activeMember"
          >
            <AvatarImage 
              :avatarId="store.activeMember.avatarId" 
              :size="32" 
              :borderColor="store.activeMember.color"
            />
            <span class="member-name-label">{{ store.activeMember.name }}</span>
          </button>

          <!-- Backdrop para cerrar dropdown al tocar fuera en móvil/desktop -->
          <div v-if="showMemberSelector" class="dropdown-backdrop" @click="showMemberSelector = false"></div>

          <!-- Dropdown de Miembros y Ajustes Móviles Rápidos -->
          <div v-if="showMemberSelector" class="member-dropdown glass-card">
            <div class="dropdown-header">Cambiar Miembro Activo:</div>
            <button 
              v-for="m in store.members" 
              :key="m.id"
              class="dropdown-item"
              :class="{ selected: m.id === store.activeMemberId }"
              @click="selectActiveMember(m.id)"
            >
              <AvatarImage :avatarId="m.avatarId" :size="28" :borderColor="m.color" />
              <span class="item-name">{{ m.name }}</span>
              <span class="role-tag" :style="{ color: m.color }">{{ m.role }}</span>
            </button>

            <!-- Acciones Secundarias para Móvil dentro del Menú de Perfil -->
            <div class="mobile-menu-divider"></div>

            <div class="mobile-menu-actions">
              <button class="mobile-action-row" @click="toggleTheme">
                <span class="row-icon">{{ currentTheme === 'dark' ? '☀️' : '🌙' }}</span>
                <span>{{ currentTheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro' }}</span>
              </button>

              <button class="mobile-action-row logout-row" @click="handleLogout">
                <span class="row-icon">🚪</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Botón Cerrar Sesión Directo - Desktop -->
        <button class="logout-btn desktop-only-btn" title="Cerrar Sesión" @click="handleLogout">
          🚪
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  padding: max(0.5rem, var(--sat)) var(--space-3) 0.5rem var(--space-3);
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.logo-badge {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-weight: 800;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -0.05em;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  flex-shrink: 0;
}

.logo-titles {
  display: none;
  flex-direction: column;
}

.logo-title {
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.logo-subtitle {
  font-size: 0.68rem;
  font-weight: 700;
  color: #3b82f6;
  letter-spacing: 0.05em;
}

.header-right-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.header-voice-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  color: #3b82f6;
  cursor: pointer;
  touch-action: manipulation;
  transition: all var(--transition-fast);
}

:root[data-theme="dark"] .header-voice-btn {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.header-voice-btn:hover {
  background: rgba(59, 130, 246, 0.25);
  transform: scale(1.05);
}

.header-voice-btn.listening {
  background: #ef4444 !important;
  color: #ffffff !important;
  border-color: #ef4444 !important;
  animation: pulse-ring-header 1.2s infinite ease-in-out;
}

@keyframes pulse-ring-header {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); box-shadow: 0 0 10px rgba(239, 68, 68, 0.6); }
}

.pulse-mic-icon {
  animation: pulse-svg 1s infinite alternate ease-in-out;
}

/* Ocultar elementos desktop en vista móvil */
.logo-titles,
.chile-clock-badge,
.desktop-network-status,
.desktop-only-btn {
  display: none;
}

.active-member-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-subtle);
  padding: 4px;
  border-radius: 50%;
  color: var(--text-primary);
  cursor: pointer;
  touch-action: manipulation;
  transition: all var(--transition-fast);
}

:root[data-theme="dark"] .active-member-btn {
  background: rgba(255, 255, 255, 0.06);
}

.active-member-btn:hover {
  background: rgba(59, 130, 246, 0.15);
}

.member-name-label {
  display: none;
}

.member-selector-relative {
  position: relative;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: transparent;
}

.member-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 230px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 120;
  animation: slideDown 0.15s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-header {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  padding: 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  min-height: var(--touch-target-min);
  border: none;
  background: transparent;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.88rem;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.dropdown-item.selected {
  background: rgba(59, 130, 246, 0.15);
  font-weight: 700;
}

.item-name {
  flex: 1;
}

.role-tag {
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.9;
}

.mobile-menu-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 0;
}

.mobile-menu-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  min-height: var(--touch-target-min);
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.mobile-action-row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.row-icon {
  font-size: 1rem;
}

.logout-row {
  color: #ef4444;
}

.logout-row:hover {
  background: rgba(239, 68, 68, 0.1);
}

.theme-toggle-btn {
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-subtle);
  font-size: 1rem;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, background 0.15s;
}

:root[data-theme="dark"] .theme-toggle-btn {
  background: rgba(255, 255, 255, 0.08);
}

.theme-toggle-btn:hover {
  transform: scale(1.08);
  background: rgba(59, 130, 246, 0.15);
}

.logout-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.95rem;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.logout-btn:hover {
  transform: scale(1.08);
  background: rgba(239, 68, 68, 0.2);
}

.chile-clock-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 4px 10px;
  border-radius: 16px;
  user-select: none;
}

.clock-flag {
  font-size: 1.1rem;
}

.clock-details {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.clock-time {
  font-size: 0.85rem;
  font-weight: 800;
  font-family: monospace, var(--font-main);
  color: #2563eb;
  letter-spacing: -0.02em;
}

:root[data-theme="dark"] .clock-time {
  color: #3b82f6;
}

.clock-date {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* ============================================================================
   PROGRESSIVE ENHANCEMENT: Tablet / Desktop (>= 768px)
   ============================================================================ */
@media (min-width: 768px) {
  .app-header {
    padding: 0.75rem 1.25rem;
  }

  .header-content {
    gap: 1rem;
  }

  .logo-titles {
    display: flex;
  }

  .header-right-controls {
    gap: 0.75rem;
  }

  .chile-clock-badge,
  .desktop-network-status,
  .desktop-only-btn {
    display: inline-flex;
  }

  .active-member-btn {
    padding: 4px 10px 4px 4px;
    border-radius: 24px;
  }

  .member-name-label {
    display: inline;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-primary);
    padding-right: 4px;
  }

  .mobile-menu-divider,
  .mobile-menu-actions {
    display: none;
  }
}
</style>

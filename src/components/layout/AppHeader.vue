<script setup lang="ts">
import { ref } from 'vue'
import { useFamilyStore } from '../../stores/familyStore'
import { useAuthStore } from '../../stores/authStore'
import AvatarImage from '../common/AvatarImage.vue'
import NetworkStatusBadge from '../pwa/NetworkStatusBadge.vue'
import NotificationBell from '../pwa/NotificationBell.vue'

const store = useFamilyStore()
const authStore = useAuthStore()
const showMemberSelector = ref(false)

function selectActiveMember(id: string) {
  store.setActiveMember(id)
  showMemberSelector.value = false
}

function handleLogout() {
  if (confirm('¿Deseas cerrar sesión en FAMILY-HUB?')) {
    authStore.logout()
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Logo / Identificación -->
      <div class="logo-group">
        <div class="logo-badge">FH</div>
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

      <!-- Selector de Miembro Autenticado + PWA Badges -->
      <div class="header-right-controls">
        <NetworkStatusBadge />
        <NotificationBell />

        <div class="member-selector-relative">
          <button 
            class="active-member-btn" 
            @click="showMemberSelector = !showMemberSelector"
            v-if="store.activeMember"
          >
            <AvatarImage 
              :avatarId="store.activeMember.avatarId" 
              :size="34" 
              :borderColor="store.activeMember.color"
            />
            <span class="member-name-label">{{ store.activeMember.name }}</span>
          </button>

          <!-- Dropdown de Miembros -->
          <div v-if="showMemberSelector" class="member-dropdown">
            <div class="dropdown-header">Cambiar Miembro Activo:</div>
            <button 
              v-for="m in store.members" 
              :key="m.id"
              class="dropdown-item"
              :class="{ selected: m.id === store.activeMemberId }"
              @click="selectActiveMember(m.id)"
            >
              <AvatarImage :avatarId="m.avatarId" :size="28" :borderColor="m.color" />
              <span>{{ m.name }}</span>
              <span class="role-tag">{{ m.role }}</span>
            </button>
          </div>
        </div>

        <!-- Botón Cerrar Sesión -->
        <button class="logout-btn" title="Cerrar Sesión" @click="handleLogout">
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
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.75rem 1.25rem;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -0.05em;
}

.logo-titles {
  display: flex;
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
  gap: 0.75rem;
}

.active-member-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  padding: 4px 10px 4px 4px;
  border-radius: 24px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.active-member-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.member-name-label {
  font-size: 0.875rem;
  font-weight: 600;
  padding-right: 4px;
}

.member-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 200px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-header {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 4px 8px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.dropdown-item.selected {
  background: rgba(59, 130, 246, 0.15);
  font-weight: 600;
}

.logout-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  font-size: 0.95rem;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.logout-btn:hover {
  transform: scale(1.08);
  background: rgba(239, 68, 68, 0.2);
}

@media (max-width: 640px) {
  .logo-title {
    display: none;
  }
}
</style>

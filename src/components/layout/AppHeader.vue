<script setup lang="ts">
import { ref } from 'vue'
import { useFamilyStore } from '../../stores/familyStore'
import AvatarImage from '../common/AvatarImage.vue'

const store = useFamilyStore()
const showMemberSelector = ref(false)

function selectActiveMember(id: string) {
  store.setActiveMember(id)
  showMemberSelector.value = false
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <!-- Logo / Identificación -->
      <div class="logo-group">
        <div class="logo-badge">FH</div>
        <span class="logo-title">FAMILY-HUB</span>
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

      <!-- Selector de Miembro Autenticado (Simulado) -->
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

.logo-title {
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.member-selector-relative {
  position: relative;
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

.role-tag {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .logo-title {
    display: none;
  }
}
</style>

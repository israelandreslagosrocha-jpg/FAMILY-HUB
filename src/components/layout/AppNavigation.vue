<script setup lang="ts">
import { useRoute } from 'vue-router'
import { 
  Home, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  Users, 
  Settings 
} from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { name: 'Inicio', path: '/', icon: Home },
  { name: 'Calendario', path: '/calendar', icon: Calendar },
  { name: 'Tareas', path: '/tasks', icon: CheckSquare },
  { name: 'Finanzas', path: '/finance', icon: DollarSign },
  { name: 'Familia', path: '/family', icon: Users },
  { name: 'Ajustes', path: '/settings', icon: Settings }
]
</script>

<template>
  <!-- Menú Lateral (Desktop) -->
  <aside class="sidebar-nav">
    <div class="sidebar-menu">
      <router-link 
        v-for="item in navItems" 
        :key="item.path" 
        :to="item.path" 
        class="nav-link-desktop"
        :class="{ active: route.path === item.path }"
      >
        <component :is="item.icon" :size="20" class="nav-icon" />
        <span>{{ item.name }}</span>
      </router-link>
    </div>
  </aside>

  <!-- Barra Inferior (Móvil - iOS/Android Style) -->
  <nav class="bottom-nav">
    <router-link 
      v-for="item in navItems" 
      :key="item.path" 
      :to="item.path" 
      class="nav-link-mobile"
      :class="{ active: route.path === item.path }"
    >
      <component :is="item.icon" :size="22" />
      <span class="mobile-label">{{ item.name }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
/* Estilos Menú Lateral Desktop */
.sidebar-nav {
  display: none;
  width: 220px;
  flex-shrink: 0;
  padding: 1.5rem 1rem;
  border-right: 1px solid var(--border-subtle);
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-link-desktop {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
}

.nav-link-desktop:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.nav-link-desktop.active {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-weight: 600;
}

.nav-icon {
  flex-shrink: 0;
}

/* Estilos Barra Inferior Móvil */
.bottom-nav {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(19, 27, 46, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-subtle);
  z-index: 90;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-link-mobile {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--text-muted);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.nav-link-mobile.active {
  color: #3b82f6;
}

.mobile-label {
  font-size: 0.7rem;
  font-weight: 600;
}

/* Media Queries para Responsive Breakpoint */
@media (min-width: 768px) {
  .sidebar-nav {
    display: block;
  }
  .bottom-nav {
    display: none;
  }
}
</style>

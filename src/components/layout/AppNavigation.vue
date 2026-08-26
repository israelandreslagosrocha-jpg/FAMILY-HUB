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

const mobileNavItems = [
  { name: 'Inicio', path: '/', icon: Home },
  { name: 'Calendario', path: '/calendar', icon: Calendar },
  { name: 'Tareas', path: '/tasks', icon: CheckSquare },
  { name: 'Finanzas', path: '/finance', icon: DollarSign },
  { name: 'Familia', path: '/family', icon: Users }
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

  <!-- Barra Inferior (Móvil - iOS/Android Style 5 Tabs) -->
  <nav class="bottom-nav">
    <router-link 
      v-for="item in mobileNavItems" 
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
/* Estilos Menú Lateral Desktop (Apple HIG Sidebar) */
.sidebar-nav {
  display: none;
  width: 230px;
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
  border-radius: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
  letter-spacing: -0.01em;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-link-desktop:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  transform: translateX(3px);
}

.nav-link-desktop.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(37, 99, 235, 0.22));
  color: #3b82f6;
  font-weight: 700;
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.nav-icon {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.nav-link-desktop.active .nav-icon {
  transform: scale(1.1);
}

/* Estilos Barra Inferior Móvil (iOS TabBar HIG) */
.bottom-nav {
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-glass);
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
  transition: color 0.15s, transform 0.15s;
}

.nav-link-mobile:active {
  transform: scale(0.92);
}

.nav-link-mobile.active {
  color: #3b82f6;
  font-weight: 700;
}

.mobile-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: -0.01em;
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

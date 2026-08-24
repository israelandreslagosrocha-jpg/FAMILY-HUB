<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'
import AppHeader from './components/layout/AppHeader.vue'
import AppNavigation from './components/layout/AppNavigation.vue'
import StaleDataBanner from './components/pwa/StaleDataBanner.vue'
import PWAInstallBanner from './components/pwa/PWAInstallBanner.vue'
import NotificationDrawer from './components/notifications/NotificationDrawer.vue'
import LoginView from './views/LoginView.vue'
import JoinFamilyModal from './components/common/JoinFamilyModal.vue'

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.initAuth()
})
</script>

<template>
  <div class="app-layout">
    <!-- Banner Discreto de Datos Cacheados en Modo Offline -->
    <StaleDataBanner />

    <!-- Modal de Vinculación a la Familia para Usuarios Nuevos Sin Hogar Registrado -->
    <JoinFamilyModal v-if="authStore.isAuthenticated && authStore.isUnlinkedUser" />

    <!-- Pantalla de Login Apple Style cuando NO está Autenticado -->
    <LoginView v-if="!authStore.isAuthenticated" />

    <!-- Aplicación Principal Operativa cuando está Autenticado -->
    <template v-else>
      <!-- Encabezado Fijo Apple Style -->
      <AppHeader />

      <!-- Contenido Principal con Navegación Responsive -->
      <div class="app-body">
        <AppNavigation />

        <main class="main-content">
          <!-- Banner Nativo de Instalación PWA -->
          <PWAInstallBanner />

          <router-view />
        </main>
      </div>

      <!-- Panel Lateral de Notificaciones del Hogar -->
      <NotificationDrawer />
    </template>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-body {
  display: flex;
  flex: 1;
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
}

.main-content {
  flex: 1;
  padding: 1.25rem;
  padding-bottom: 5rem; /* Espacio para barra inferior en móvil */
}

@media (min-width: 768px) {
  .main-content {
    padding-bottom: 2rem;
  }
}
</style>

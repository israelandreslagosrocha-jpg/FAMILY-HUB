<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import AppNavigation from './components/layout/AppNavigation.vue'
import StaleDataBanner from './components/pwa/StaleDataBanner.vue'
import PWAInstallBanner from './components/pwa/PWAInstallBanner.vue'
import NotificationDrawer from './components/notifications/NotificationDrawer.vue'
</script>

<template>
  <div class="app-layout">
    <!-- Banner Discreto de Datos Cacheados en Modo Offline -->
    <StaleDataBanner />

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

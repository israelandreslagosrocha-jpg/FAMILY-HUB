<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import AppNavigation from './components/layout/AppNavigation.vue'
</script>

<template>
  <div class="app-layout">
    <!-- Encabezado Fijo Apple Style -->
    <AppHeader />

    <!-- Contenido Principal con Navegación Responsive -->
    <div class="app-body">
      <AppNavigation />

      <main class="main-content">
        <router-view />
      </main>
    </div>
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

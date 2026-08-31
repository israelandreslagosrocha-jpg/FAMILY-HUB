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
import VoiceCaptureButton from './components/voice/VoiceCaptureButton.vue'
import VoiceCaptureSheet from './components/voice/VoiceCaptureSheet.vue'
import VoiceIntentReviewSheet from './components/voice/VoiceIntentReviewSheet.vue'
import ReminderPickerModal from './components/reminders/ReminderPickerModal.vue'

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

      <!-- Botón Flotante Global y Hojas de Captura de Voz -->
      <VoiceCaptureButton />
      <VoiceCaptureSheet />
      <VoiceIntentReviewSheet />

      <!-- Modal Global de Recordatorios de Dispositivo -->
      <ReminderPickerModal />

      <!-- Panel Lateral de Notificaciones del Hogar -->
      <NotificationDrawer />
    </template>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.app-body {
  display: flex;
  flex: 1;
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: var(--space-3);
  padding-bottom: calc(var(--bottom-nav-height) + max(var(--space-4), var(--sab)));
}

@media (min-width: 768px) {
  .main-content {
    padding: var(--space-5);
    padding-bottom: var(--space-6);
  }
}
</style>

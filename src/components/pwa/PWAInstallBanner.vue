<script setup lang="ts">
import { usePWAStore } from '../../stores/pwaStore'

const pwaStore = usePWAStore()

function handleDismiss() {
  pwaStore.dismissInstallPrompt()
}

function handleInstall() {
  alert('📲 ¡FAMILY-HUB está lista para instalarse en tu pantalla de inicio! Abre el menú de tu navegador y selecciona "Agregar a la pantalla principal".')
  pwaStore.dismissInstallPrompt()
}
</script>

<template>
  <div v-if="pwaStore.isInstallPromptVisible" class="pwa-install-banner glass-card">
    <div class="banner-left">
      <span class="app-icon">🏡</span>
      <div class="banner-texts">
        <span class="banner-title">Instalar App FAMILY-HUB</span>
        <span class="banner-sub">Acceso rápido y funcionamiento sin conexión en tu teléfono</span>
      </div>
    </div>

    <div class="banner-actions">
      <button class="install-btn" @click="handleInstall">📲 Instalar</button>
      <button class="dismiss-btn" @click="handleDismiss">✕</button>
    </div>
  </div>
</template>

<style scoped>
.pwa-install-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.banner-left { display: flex; align-items: center; gap: 0.75rem; }
.app-icon { font-size: 1.6rem; }
.banner-texts { display: flex; flex-direction: column; }
.banner-title { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
.banner-sub { font-size: 0.75rem; color: var(--text-secondary); }

.banner-actions { display: flex; align-items: center; gap: 0.5rem; }

.install-btn {
  padding: 0.4rem 0.85rem;
  border-radius: 10px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3);
  transition: transform 0.15s;
}

.install-btn:hover { transform: scale(1.03); }

.dismiss-btn {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}
</style>

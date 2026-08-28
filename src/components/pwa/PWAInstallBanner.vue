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
  padding: 0.85rem 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 1rem;
  gap: 0.75rem;
  flex-wrap: wrap;
  box-sizing: border-box;
  width: 100%;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.app-icon { font-size: 1.6rem; flex-shrink: 0; }
.banner-texts { display: flex; flex-direction: column; min-width: 0; }
.banner-title { font-size: 0.88rem; font-weight: 800; color: var(--text-primary); }
.banner-sub { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.3; }

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.install-btn {
  padding: 0.5rem 0.95rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3);
  transition: transform 0.15s, background 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.install-btn:hover {
  background: #2563eb;
  transform: scale(1.02);
}

.dismiss-btn {
  background: transparent;
  border: none;
  font-size: 1rem;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

:root[data-theme="dark"] .dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
</style>

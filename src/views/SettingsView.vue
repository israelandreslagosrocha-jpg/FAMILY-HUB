<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useReminderStore } from '../stores/reminderStore'
import { Moon, Sun, Shield, Bell, Cloud, Smartphone, Mic } from 'lucide-vue-next'

const authStore = useAuthStore()
const reminderStore = useReminderStore()
const currentTheme = ref<'dark' | 'light'>('dark')

onMounted(async () => {
  const saved = (localStorage.getItem('family_hub_theme') as 'dark' | 'light') || 'dark'
  currentTheme.value = saved
  await reminderStore.checkPermissions()
})

function setTheme(theme: 'dark' | 'light') {
  currentTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('family_hub_theme', theme)
}

async function handleRequestPermissions() {
  await reminderStore.requestPermissions()
}
</script>

<template>
  <div class="settings-bento-page">
    <div class="bento-grid">
      <!-- HERO CARD: Ajustes Generales -->
      <div class="bento-card bento-col-12 bento-card-hero">
        <div class="settings-hero-header">
          <div class="hero-icon-box">⚙️</div>
          <div>
            <span class="bento-tag-pill">FH CONTROL</span>
            <h1 class="settings-title">Ajustes & Preferencias</h1>
            <p class="text-secondary">Personaliza la apariencia, notificaciones y sincronización de tu hogar.</p>
          </div>
        </div>
      </div>

      <!-- CARD NUEVA (12 COLS): Recordatorios, Alarmas & Captura de Voz -->
      <div class="bento-card bento-col-12">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Mic class="text-blue" />
            <h3>Voz, Recordatorios & Alarmas de Dispositivo</h3>
          </div>
          <span class="bento-tag-pill">⚡ Captura Rápida</span>
        </div>

        <p class="setting-desc">
          Estado de permisos en tu dispositivo para la captura por voz y avisos puntuales de tareas, eventos y pagos.
        </p>

        <div class="permissions-status-grid">
          <!-- Micrófono -->
          <div class="perm-card">
            <div class="perm-header">
              <span class="perm-icon">🎙️</span>
              <span class="perm-title">Micrófono</span>
            </div>
            <span class="perm-badge" :class="{ ok: true }">
              ✓ Web Speech API (es-CL)
            </span>
          </div>

          <!-- Notificaciones -->
          <div class="perm-card">
            <div class="perm-header">
              <span class="perm-icon">🔔</span>
              <span class="perm-title">Recordatorios</span>
            </div>
            <span class="perm-badge" :class="{ ok: reminderStore.hasNotificationPermission }">
              {{ reminderStore.hasNotificationPermission ? '✓ Permitido' : '⚠️ Pendiente' }}
            </span>
            <button 
              v-if="!reminderStore.hasNotificationPermission" 
              type="button" 
              class="perm-action-btn"
              @click="handleRequestPermissions"
            >
              Habilitar
            </button>
          </div>

          <!-- Alarma del Sistema -->
          <div class="perm-card">
            <div class="perm-header">
              <span class="perm-icon">⏰</span>
              <span class="perm-title">Alarma del Sistema</span>
            </div>
            <span class="perm-badge" :class="{ ok: reminderStore.hasSystemAlarmAvailable }">
              {{ reminderStore.hasSystemAlarmAvailable ? '✓ Disponible' : 'ℹ️ Vía Notificación' }}
            </span>
          </div>

          <!-- Plataforma -->
          <div class="perm-card">
            <div class="perm-header">
              <span class="perm-icon">📱</span>
              <span class="perm-title">Plataforma</span>
            </div>
            <span class="perm-badge info">
              Web PWA
            </span>
          </div>
        </div>
      </div>

      <!-- CARD 1 (6 COLS): Modo Claro / Oscuro -->
      <div class="bento-card bento-col-6">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Sun v-if="currentTheme === 'light'" class="text-amber" />
            <Moon v-else class="text-purple" />
            <h3>Apariencia & Tema</h3>
          </div>
          <span class="bento-tag-pill">{{ currentTheme === 'dark' ? '🌙 Oscuro' : '☀️ Claro' }}</span>
        </div>

        <p class="setting-desc">Elige la interfaz que prefieras para usar en tu teléfono o computador.</p>

        <div class="theme-options-grid">
          <button 
            class="theme-select-card"
            :class="{ active: currentTheme === 'dark' }"
            @click="setTheme('dark')"
          >
            <span class="theme-icon">🌙</span>
            <span class="theme-name">Modo Oscuro</span>
            <span class="theme-sub">Fondos oscuros profundos</span>
          </button>

          <button 
            class="theme-select-card"
            :class="{ active: currentTheme === 'light' }"
            @click="setTheme('light')"
          >
            <span class="theme-icon">☀️</span>
            <span class="theme-name">Modo Claro</span>
            <span class="theme-sub">Estilo Apple iOS Blanco</span>
          </button>
        </div>
      </div>

      <!-- CARD 2 (6 COLS): Identidad Familiar -->
      <div class="bento-card bento-col-6">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Shield class="text-blue" />
            <h3>Familia Autenticada</h3>
          </div>
          <span class="bento-tag-pill">👑 Jefe de Hogar</span>
        </div>

        <div class="family-info-box">
          <span class="fam-label">Nombre del Hogar:</span>
          <span class="fam-value">FAMILIA LAGOS RIQUELME</span>

          <span class="fam-label margin-top">Cuenta Principal:</span>
          <span class="fam-value">{{ authStore.user?.email || 'israel@familyhub.cl' }}</span>

          <span class="fam-label margin-top">Integrantes Registrados:</span>
          <span class="fam-value">{{ authStore.familyMembers.length }} Integrantes (Israel, Naty, Santi, Vicente)</span>
        </div>
      </div>

      <!-- CARD 3 (4 COLS): Notificaciones Push -->
      <div class="bento-card bento-col-4">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Bell class="text-green" />
            <h3>Notificaciones WebPush</h3>
          </div>
          <span class="bento-tag-pill">Activo</span>
        </div>
        <p class="setting-desc">Alertas instantáneas para recordatorios de eventos, tareas y gastos.</p>
        <span class="bento-tag-pill light-pill">✓ WebPush VAPID Habilitado</span>
      </div>

      <!-- CARD 4 (4 COLS): PWA Offline & Service Worker -->
      <div class="bento-card bento-col-4">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Smartphone class="text-purple" />
            <h3>Aplicación PWA</h3>
          </div>
          <span class="bento-tag-pill">Instalable</span>
        </div>
        <p class="setting-desc">Funcionamiento autónomo con caché offline y cola de peticiones con reconexión automática.</p>
        <span class="bento-tag-pill light-pill">✓ Service Worker Activo</span>
      </div>

      <!-- CARD 5 (4 COLS): Supabase Cloud Sync -->
      <div class="bento-card bento-col-4">
        <div class="bento-card-top">
          <div class="bento-title-group">
            <Cloud class="text-blue" />
            <h3>Supabase Cloud DB</h3>
          </div>
          <span class="bento-tag-pill">En línea</span>
        </div>
        <p class="setting-desc">Base de datos PostgreSQL sincronizada con políticas RLS de seguridad extrema.</p>
        <span class="bento-tag-pill light-pill">✓ Supabase Connected</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-bento-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: 5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.settings-hero-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hero-icon-box {
  font-size: clamp(2rem, 6vw, 2.5rem);
  flex-shrink: 0;
}

.settings-title {
  font-size: clamp(1.3rem, 5vw, 1.8rem);
  font-weight: 900;
  margin: 0.2rem 0;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.bento-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.75rem 0;
  line-height: 1.35;
}

.theme-options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

@media (min-width: 480px) {
  .theme-options-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.theme-select-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.15rem 1rem;
  min-height: 48px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

:root[data-theme="dark"] .theme-select-card {
  background: rgba(255, 255, 255, 0.05);
}

.theme-select-card.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
}

.theme-icon { font-size: 1.8rem; margin-bottom: 0.3rem; }

.theme-name {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-primary);
}

.theme-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.family-info-box {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.03);
  padding: 1rem;
  border-radius: 16px;
  margin-top: 0.75rem;
  border: 1px solid var(--border-subtle);
  box-sizing: border-box;
}

:root[data-theme="dark"] .family-info-box {
  background: rgba(255, 255, 255, 0.04);
}

.fam-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.fam-label.margin-top {
  margin-top: 0.6rem;
}

.fam-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.35;
  word-break: break-word;
}

.light-pill {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
  font-weight: 800;
}

:root[data-theme="dark"] .light-pill {
  color: #60a5fa;
}

.permissions-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.perm-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.85rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--border-subtle);
  box-sizing: border-box;
}

:root[data-theme="dark"] .perm-card {
  background: rgba(255, 255, 255, 0.04);
}

.perm-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.perm-icon { font-size: 1.1rem; }
.perm-title { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); }

.perm-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  width: fit-content;
}

.perm-badge.ok {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.perm-badge.info {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.perm-action-btn {
  margin-top: 0.25rem;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.text-amber { color: #f59e0b; }
.text-purple { color: #a855f7; }
.text-blue { color: #3b82f6; }
.text-green { color: #22c55e; }
</style>

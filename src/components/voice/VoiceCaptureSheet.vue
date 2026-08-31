<script setup lang="ts">
import { useVoiceStore } from '../../stores/voiceStore'

const voiceStore = useVoiceStore()

function handleStop() {
  voiceStore.stopCapture()
}

function handleCancel() {
  voiceStore.cancelCapture()
}
</script>

<template>
  <div v-if="voiceStore.isListening || voiceStore.captureState === 'error'" class="voice-sheet-backdrop" @click.self="handleCancel">
    <div class="voice-sheet glass-card">
      <div class="sheet-grabber"></div>

      <div class="voice-sheet-header">
        <div class="header-left">
          <span class="status-dot" :class="{ error: voiceStore.captureState === 'error' }"></span>
          <span class="header-status">
            {{ voiceStore.captureState === 'error' ? 'Aviso' : 'Escuchando tu voz...' }}
          </span>
        </div>
        <button class="sheet-close-btn" @click="handleCancel" title="Cerrar">✕</button>
      </div>

      <!-- Estado de Error -->
      <div v-if="voiceStore.captureState === 'error'" class="voice-error-box">
        <span class="error-icon">⚠️</span>
        <p class="error-msg">{{ voiceStore.errorMessage }}</p>
        <button class="retry-btn" @click="voiceStore.startCapture()">
          🔄 Reintentar
        </button>
      </div>

      <!-- Estado de Escucha Activa -->
      <div v-else class="voice-listening-content">
        <!-- Visualizador de Ondas de Audio -->
        <div class="audio-waves">
          <span class="wave-bar bar-1"></span>
          <span class="wave-bar bar-2"></span>
          <span class="wave-bar bar-3"></span>
          <span class="wave-bar bar-4"></span>
          <span class="wave-bar bar-5"></span>
        </div>

        <p class="live-transcript">
          <span v-if="voiceStore.interimTranscript" class="transcript-text">
            "{{ voiceStore.interimTranscript }}"
          </span>
          <span v-else class="placeholder-text">
            Ej: "Comprar pan mañana", "Pagué 48 mil de luz", "Reunión el viernes a las siete"...
          </span>
        </p>

        <div class="actions-row">
          <button class="btn-cancel" @click="handleCancel">
            Cancelar
          </button>
          <button class="btn-stop" @click="handleStop">
            ✓ Listo / Terminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.voice-sheet {
  width: 100%;
  max-width: 540px;
  background: var(--bg-card, #0f172a);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border: 1px solid var(--border-subtle);
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-grabber {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  margin: -0.25rem auto 0.25rem auto;
}

.voice-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  animation: blink 1.2s infinite ease-in-out;
}

.status-dot.error {
  background: #f59e0b;
  animation: none;
}

@keyframes blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.header-status {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.sheet-close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  font-size: 1.1rem;
  min-width: 38px;
  min-height: 38px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.audio-waves {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 48px;
  margin: 0.5rem 0;
}

.wave-bar {
  width: 5px;
  background: linear-gradient(180deg, #3b82f6, #60a5fa);
  border-radius: 4px;
  animation: wave 1.2s infinite ease-in-out;
}

.bar-1 { height: 16px; animation-delay: 0.1s; }
.bar-2 { height: 32px; animation-delay: 0.3s; }
.bar-3 { height: 44px; animation-delay: 0.2s; }
.bar-4 { height: 28px; animation-delay: 0.4s; }
.bar-5 { height: 18px; animation-delay: 0.15s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1.1); }
}

.live-transcript {
  min-height: 50px;
  text-align: center;
  font-size: 1.05rem;
  line-height: 1.4;
  margin: 0.5rem 0 1rem;
}

.transcript-text {
  font-weight: 700;
  color: #3b82f6;
}

:root[data-theme="dark"] .transcript-text {
  color: #60a5fa;
}

.placeholder-text {
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-style: italic;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel {
  padding: 0.65rem 1.1rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.btn-stop {
  padding: 0.65rem 1.35rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.voice-error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  text-align: center;
}

.error-icon { font-size: 2rem; }
.error-msg { font-size: 0.88rem; color: #ef4444; margin: 0; }

.retry-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  touch-action: manipulation;
}
</style>

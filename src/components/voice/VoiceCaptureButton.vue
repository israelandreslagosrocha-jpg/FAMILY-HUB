<script setup lang="ts">
import { useVoiceStore } from '../../stores/voiceStore'
import { Mic, MicOff } from 'lucide-vue-next'

const voiceStore = useVoiceStore()

function handleClick() {
  if (voiceStore.isListening) {
    voiceStore.stopCapture()
  } else {
    voiceStore.startCapture()
  }
}
</script>

<template>
  <button 
    class="voice-floating-btn"
    :class="{ 
      listening: voiceStore.isListening, 
      error: voiceStore.captureState === 'error' 
    }"
    :title="voiceStore.isListening ? 'Detener escucha' : 'Captura por voz rápida (Presiona y habla)'"
    @click="handleClick"
  >
    <!-- Anillo de pulso sutil cuando está escuchando -->
    <span v-if="voiceStore.isListening" class="pulse-ring"></span>
    
    <Mic v-if="!voiceStore.isListening" :size="24" class="mic-icon" />
    <MicOff v-else :size="24" class="mic-icon pulse-icon" />
  </button>
</template>

<style scoped>
.voice-floating-btn {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + max(1rem, var(--sab)));
  right: max(1rem, var(--sar));
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
  cursor: pointer;
  z-index: 1000;
  touch-action: manipulation;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
}

.voice-floating-btn:hover {
  transform: scale(1.06);
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.voice-floating-btn:active {
  transform: scale(0.94);
}

.voice-floating-btn.listening {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.25), 0 8px 24px rgba(239, 68, 68, 0.5);
  border-color: rgba(255, 255, 255, 0.6);
}

.voice-floating-btn.error {
  background: #f59e0b;
}

.pulse-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid #ef4444;
  animation: ripple 1.5s infinite ease-out;
}

@keyframes ripple {
  0% { transform: scale(0.85); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.pulse-icon {
  animation: pulse-svg 1s infinite alternate ease-in-out;
}

@keyframes pulse-svg {
  from { transform: scale(0.92); }
  to { transform: scale(1.08); }
}

@media (min-width: 768px) {
  .voice-floating-btn {
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
  }
}
</style>

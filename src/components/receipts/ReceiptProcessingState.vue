<script setup lang="ts">
import { useReceiptStore } from '../../stores/receiptStore'

const receiptStore = useReceiptStore()
</script>

<template>
  <div 
    v-if="receiptStore.currentSession && ['capturing', 'uploading', 'processing_ocr'].includes(receiptStore.currentSession.status)" 
    class="processing-overlay"
  >
    <div class="processing-card glass-card">
      <div class="spinner-scanner">
        <span class="laser-beam"></span>
        <span class="receipt-icon">🧾</span>
      </div>

      <div class="status-texts">
        <h4 v-if="receiptStore.currentSession.status === 'capturing'" class="status-title">📷 Capturando Boleta...</h4>
        <h4 v-else-if="receiptStore.currentSession.status === 'uploading'" class="status-title">☁️ Subiendo Imagen Segura...</h4>
        <h4 v-else-if="receiptStore.currentSession.status === 'processing_ocr'" class="status-title">🔎 Analizando Texto con OCR...</h4>
        <p class="status-sub">Extrayendo comercio, monto total, fecha y categoría...</p>
      </div>

      <div class="progress-bar-bg">
        <div 
          class="progress-bar-fill"
          :class="{
            'step-1': receiptStore.currentSession.status === 'capturing',
            'step-2': receiptStore.currentSession.status === 'uploading',
            'step-3': receiptStore.currentSession.status === 'processing_ocr'
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.processing-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  z-index: 1200;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.processing-card {
  width: 100%;
  max-width: 380px;
  padding: 2rem 1.5rem;
  border-radius: 24px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}

@media (prefers-color-scheme: dark) {
  .processing-card { background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.1); }
}

.spinner-scanner {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: rgba(59, 130, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.receipt-icon { font-size: 2.2rem; }

.laser-beam {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: #ec4899;
  box-shadow: 0 0 10px #ec4899;
  animation: scanLaser 1.2s ease-in-out infinite alternate;
}

@keyframes scanLaser {
  from { top: 0; }
  to { top: 68px; }
}

.status-texts { display: flex; flex-direction: column; gap: 0.25rem; }
.status-title { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.status-sub { font-size: 0.83rem; color: var(--text-secondary); margin: 0; }

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  .progress-bar-bg { background: rgba(255, 255, 255, 0.1); }
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #ec4899);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.step-1 { width: 30%; }
.step-2 { width: 65%; }
.step-3 { width: 95%; }
</style>

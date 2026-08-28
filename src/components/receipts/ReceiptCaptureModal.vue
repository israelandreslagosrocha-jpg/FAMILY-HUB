<script setup lang="ts">
import { ref } from 'vue'
import { useReceiptStore } from '../../stores/receiptStore'

const receiptStore = useReceiptStore()
const fileInput = ref<HTMLInputElement | null>(null)

function handleClose() {
  receiptStore.closeScanner()
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    receiptStore.processRealFile(target.files[0])
  }
}

function handleSelectCase(caseType: 'high_confidence' | 'low_confidence' | 'failed' | 'duplicate') {
  receiptStore.startScanSimulated(caseType)
}
</script>

<template>
  <div v-if="receiptStore.isScannerOpen" class="capture-modal-backdrop" @click.self="handleClose">
    <div class="capture-modal-card glass-card" @click.stop @mousedown.stop>
      <div class="modal-header">
        <h3 class="modal-title">📷 Capturar Boleta para OCR</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <p class="modal-desc">
        Selecciona cómo deseas escanear la boleta físicamente o prueba uno de los casos reales simulados (ETAPA 7B):
      </p>

      <!-- Botones Principales de Entrada Móvil -->
      <input 
        ref="fileInput" 
        type="file" 
        accept="image/*,application/pdf" 
        style="display: none" 
        @change="handleFileChange" 
      />

      <div class="capture-actions-grid">
        <button class="capture-btn camera-btn" @click="triggerFileInput">
          <span class="btn-big-icon">📸</span>
          <div class="btn-text-col">
            <span class="btn-title">Tomar Foto con Cámara</span>
            <span class="btn-sub">Escanear boleta física directamente</span>
          </div>
        </button>

        <button class="capture-btn gallery-btn" @click="triggerFileInput">
          <span class="btn-big-icon">🖼️</span>
          <div class="btn-text-col">
            <span class="btn-title">Subir Imagen o PDF</span>
            <span class="btn-sub">Seleccionar desde la galería del dispositivo</span>
          </div>
        </button>
      </div>

      <!-- Simulador de Casos de Prueba OCR (Exigido en 7B) -->
      <div class="cases-simulator-box">
        <h4 class="simulator-title">🧪 Probar Escenarios Reales de Lectura OCR:</h4>
        <div class="cases-buttons-row">
          <button class="case-chip case-green" @click="handleSelectCase('high_confidence')">
            🟢 OCR Exitoso (>95%)
          </button>
          <button class="case-chip case-yellow" @click="handleSelectCase('low_confidence')">
            🟡 Baja Confianza (75%)
          </button>
          <button class="case-chip case-red" @click="handleSelectCase('failed')">
            🔴 OCR Fallido (Manual)
          </button>
          <button class="case-chip case-orange" @click="handleSelectCase('duplicate')">
            ⚠️ Posible Duplicado
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capture-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 0;
  box-sizing: border-box;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.capture-modal-card {
  width: 100%;
  max-width: 100%;
  max-height: calc(100dvh - 1.5rem);
  background: var(--bg-card, #ffffff);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title { 
  font-size: clamp(1.15rem, 3.5vw, 1.25rem); 
  font-weight: 800; 
  margin: 0; 
  color: var(--text-primary); 
}

.close-btn { 
  background: rgba(0, 0, 0, 0.05); 
  border: none; 
  font-size: 1.2rem; 
  min-width: var(--touch-target-min); 
  min-height: var(--touch-target-min); 
  border-radius: 50%; 
  cursor: pointer; 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  color: var(--text-secondary); 
  touch-action: manipulation;
}

:root[data-theme="dark"] .close-btn {
  background: rgba(255, 255, 255, 0.08);
}

.modal-desc { 
  font-size: 0.83rem; 
  color: var(--text-secondary); 
  margin: 0; 
  line-height: 1.35; 
}

.capture-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.capture-btn {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  min-height: 52px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  touch-action: manipulation;
  text-align: left;
  transition: all 0.15s;
  box-sizing: border-box;
}

:root[data-theme="dark"] .capture-btn { 
  background: rgba(255, 255, 255, 0.04); 
}

.capture-btn:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: #3b82f6;
}

.btn-big-icon { font-size: 1.8rem; flex-shrink: 0; }
.btn-text-col { display: flex; flex-direction: column; min-width: 0; }
.btn-title { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
.btn-sub { font-size: 0.75rem; color: var(--text-secondary); }

.cases-simulator-box {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.85rem;
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px dashed rgba(59, 130, 246, 0.3);
}

.simulator-title { 
  font-size: 0.8rem; 
  font-weight: 800; 
  margin: 0; 
  color: #3b82f6; 
}

.cases-buttons-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.45rem;
}

@media (min-width: 360px) {
  .cases-buttons-row {
    grid-template-columns: 1fr 1fr;
  }
}

.case-chip {
  padding: 0.55rem 0.65rem;
  min-height: var(--touch-target-min);
  border-radius: 10px;
  border: none;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: opacity 0.15s;
}

.case-chip:hover { opacity: 0.9; }

.case-green { background: #dcfce7; color: #15803d; }
.case-yellow { background: #fef9c3; color: #a16207; }
.case-red { background: #ffe4e6; color: #be123c; }
.case-orange { background: #ffedd5; color: #c2410c; }

:root[data-theme="dark"] .case-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
:root[data-theme="dark"] .case-yellow { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
:root[data-theme="dark"] .case-red { background: rgba(239, 68, 68, 0.2); color: #f87171; }
:root[data-theme="dark"] .case-orange { background: rgba(249, 115, 22, 0.2); color: #fb923c; }

@media (min-width: 768px) {
  .capture-modal-backdrop {
    align-items: center;
    padding: 1.5rem;
  }

  .capture-modal-card {
    max-width: 480px;
    border-radius: 24px;
    border-bottom: 1px solid var(--border-subtle);
    padding: 1.5rem;
    animation: none;
  }
}
</style>

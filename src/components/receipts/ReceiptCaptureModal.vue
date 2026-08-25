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
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(5px);
  z-index: 1100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.capture-modal-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

@media (prefers-color-scheme: dark) {
  .capture-modal-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title { font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.close-btn { background: rgba(0, 0, 0, 0.05); border: none; font-size: 1.4rem; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }

.modal-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4; }

.capture-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.capture-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

@media (prefers-color-scheme: dark) {
  .capture-btn { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.08); }
}

.capture-btn:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: #3b82f6;
}

.btn-big-icon { font-size: 2rem; }
.btn-text-col { display: flex; flex-direction: column; }
.btn-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
.btn-sub { font-size: 0.78rem; color: var(--text-secondary); }

.cases-simulator-box {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px dashed rgba(59, 130, 246, 0.3);
}

.simulator-title { font-size: 0.82rem; font-weight: 700; margin: 0; color: #2563eb; }

.cases-buttons-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.case-chip {
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  border: none;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
}

.case-chip:hover { opacity: 0.9; }

.case-green { background: #dcfce7; color: #15803d; }
.case-yellow { background: #fef9c3; color: #a16207; }
.case-red { background: #ffe4e6; color: #be123c; }
.case-orange { background: #ffedd5; color: #c2410c; }
</style>

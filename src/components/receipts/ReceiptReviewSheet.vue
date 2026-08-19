<script setup lang="ts">
import { ref, watch } from 'vue'
import { useReceiptStore } from '../../stores/receiptStore'

const receiptStore = useReceiptStore()

const merchantName = ref('')
const totalAmount = ref<number | null>(null)
const date = ref(new Date().toISOString().split('T')[0])
const suggestedCategory = ref('Supermercado')
const isFamilyScope = ref(true)

watch(() => receiptStore.currentSession, (session) => {
  if (session && session.extractedData) {
    merchantName.value = session.extractedData.merchantName || ''
    totalAmount.value = session.extractedData.totalAmount || null
    date.value = session.extractedData.date || new Date().toISOString().split('T')[0]
    suggestedCategory.value = session.extractedData.suggestedCategory || 'Supermercado'
    isFamilyScope.value = true
  }
}, { immediate: true })

function handleClose() {
  receiptStore.cancelSession()
}

function handleConfirm() {
  if (!merchantName.value.trim() || !totalAmount.value || totalAmount.value <= 0) return

  const session = receiptStore.currentSession
  const prevConf = session?.extractedData || {
    merchantConfidence: 100,
    amountConfidence: 100,
    dateConfidence: 100,
    categoryConfidence: 100,
    ocrConfidence: 95,
    extractionConfidence: 90
  }

  receiptStore.confirmReceipt({
    merchantName: merchantName.value.trim(),
    merchantConfidence: prevConf.merchantConfidence,
    totalAmount: totalAmount.value,
    amountConfidence: prevConf.amountConfidence,
    date: date.value,
    dateConfidence: prevConf.dateConfidence,
    suggestedCategory: suggestedCategory.value,
    categoryConfidence: prevConf.categoryConfidence,
    ocrConfidence: prevConf.ocrConfidence || 95,
    extractionConfidence: prevConf.extractionConfidence || 90
  }, isFamilyScope.value)
}
</script>

<template>
  <div v-if="receiptStore.isReviewSheetOpen && receiptStore.currentSession" class="review-backdrop" @click="handleClose">
    <div class="review-modal glass-card" @click.stopPropagation>
      <div class="modal-header">
        <h3 class="modal-title">✏️ Revisión Táctil de Boleta (Human-in-the-Loop)</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <!-- Alerta de Advertencia de Posible Duplicado (Caso 4) -->
      <div v-if="receiptStore.currentSession.extractedData?.isPossibleDuplicate" class="alert-box alert-warning">
        <span class="alert-icon">⚠️</span>
        <div class="alert-text">
          <strong>Posible Boleta Duplicada Detectada</strong>
          <span>Ya existe un gasto en la familia por ${{ receiptStore.currentSession.extractedData?.totalAmount.toLocaleString('es-CL') }} en {{ receiptStore.currentSession.extractedData?.merchantName }} con esta misma fecha.</span>
        </div>
      </div>

      <!-- Alerta de OCR Fallido (Caso 3) -->
      <div v-if="receiptStore.currentSession.status === 'ocr_failed'" class="alert-box alert-danger">
        <span class="alert-icon">🔴</span>
        <div class="alert-text">
          <strong>Lectura OCR Incompleta</strong>
          <span>No se pudieron extraer algunos datos. Ingresa el monto y comercio manualmente a continuación.</span>
        </div>
      </div>

      <div class="review-body-grid">
        <!-- Columna Izquierda: Vista Previa de la Foto Original -->
        <div class="preview-col">
          <span class="col-label">Imagen Original de la Boleta</span>
          <div class="image-wrapper">
            <img :src="receiptStore.currentSession.imagePreviewUrl" alt="Boleta escaneada" class="receipt-img" />
            <span class="scanner-badge">OCR Scanned</span>
          </div>
        </div>

        <!-- Columna Derecha: Formulario de Verificación con Badges de Confianza % -->
        <form class="form-col" @submit.prevent="handleConfirm">
          <!-- Campo Comercio / Proveedor -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label">Comercio / Proveedor</label>
              <span 
                v-if="receiptStore.currentSession.extractedData?.merchantConfidence" 
                class="confidence-badge"
                :class="{ 
                  high: receiptStore.currentSession.extractedData.merchantConfidence >= 90,
                  low: receiptStore.currentSession.extractedData.merchantConfidence < 90
                }"
              >
                Confianza: {{ receiptStore.currentSession.extractedData.merchantConfidence }}%
              </span>
            </div>
            <input 
              v-model="merchantName" 
              type="text" 
              class="form-input" 
              placeholder="Ej. Supermercado Jumbo, Farmacia..." 
              required 
            />
          </div>

          <!-- Campo Monto Total -->
          <div class="form-group">
            <div class="label-row">
              <label class="form-label">Monto Total (CLP)</label>
              <div class="badges-group" v-if="receiptStore.currentSession.extractedData">
                <span 
                  class="confidence-badge"
                  :class="{ 
                    high: (receiptStore.currentSession.extractedData.extractionConfidence || 0) >= 90,
                    low: (receiptStore.currentSession.extractedData.extractionConfidence || 0) < 90
                  }"
                >
                  Extracción Total: {{ receiptStore.currentSession.extractedData.extractionConfidence || 0 }}%
                </span>
                <span 
                  class="confidence-badge"
                  :class="{ 
                    high: (receiptStore.currentSession.extractedData.ocrConfidence || 0) >= 90,
                    low: (receiptStore.currentSession.extractedData.ocrConfidence || 0) < 90
                  }"
                >
                  OCR: {{ receiptStore.currentSession.extractedData.ocrConfidence || 0 }}%
                </span>
              </div>
            </div>
            <div class="amount-wrapper">
              <span class="currency-prefix">$</span>
              <input 
                v-model.number="totalAmount" 
                type="number" 
                class="form-input amount-input" 
                placeholder="0" 
                min="1" 
                required 
              />
            </div>
          </div>

          <!-- Categoría y Fecha -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Categoría Sugerida</label>
              <select v-model="suggestedCategory" class="form-select">
                <option value="Supermercado">🛒 Supermercado</option>
                <option value="Servicios del Hogar">💡 Servicios del Hogar</option>
                <option value="Salud">💊 Salud & Farmacia</option>
                <option value="Ropa & Personal">👟 Ropa & Personal</option>
                <option value="Entretención & Salidas">🍕 Entretención</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Fecha de Emisión</label>
              <input v-model="date" type="date" class="form-input" required />
            </div>
          </div>

          <!-- Selector Ámbito (Familiar vs Personal) -->
          <div class="form-group">
            <label class="form-label">Ámbito del Gasto</label>
            <div class="scope-bar">
              <button 
                type="button" 
                class="scope-btn"
                :class="{ active: isFamilyScope }"
                @click="isFamilyScope = true"
              >
                🏡 Gasto Familiar
              </button>
              <button 
                type="button" 
                class="scope-btn"
                :class="{ active: !isFamilyScope }"
                @click="isFamilyScope = false"
              >
                👤 Gasto Personal
              </button>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="handleClose">Cancelar</button>
            <button type="submit" class="confirm-btn" :disabled="!merchantName.trim() || !totalAmount">
              ✅ Confirmar y Crear Gasto
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(5px);
  z-index: 1100;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.review-modal {
  width: 100%;
  max-width: 680px;
  background: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 90vh;
  overflow-y: auto;
}

@media (prefers-color-scheme: dark) {
  .review-modal { background: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.close-btn { background: rgba(0, 0, 0, 0.05); border: none; font-size: 1.4rem; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }

.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  font-size: 0.82rem;
}

.alert-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.alert-danger { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }

.alert-text { display: flex; flex-direction: column; gap: 0.15rem; }

.review-body-grid {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.25rem;
}

@media (max-width: 600px) {
  .review-body-grid { grid-template-columns: 1fr; }
}

.preview-col { display: flex; flex-direction: column; gap: 0.4rem; }
.col-label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }

.image-wrapper {
  position: relative;
  width: 100%;
  height: 240px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.receipt-img { width: 100%; height: 100%; object-fit: cover; }
.scanner-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 6px; }

.form-col { display: flex; flex-direction: column; gap: 0.85rem; }
.form-group { display: flex; flex-direction: column; gap: 0.3rem; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

.label-row { display: flex; justify-content: space-between; align-items: center; }
.form-label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }

.badges-group { display: flex; gap: 0.35rem; }
.confidence-badge { font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; }
.confidence-badge.high { background: #dcfce7; color: #15803d; }
.confidence-badge.low { background: #fef9c3; color: #a16207; }

.amount-wrapper { display: flex; align-items: center; background: rgba(0,0,0,0.03); border: 1.5px solid #3b82f6; border-radius: 12px; padding: 0.1rem 0.6rem; }
.currency-prefix { font-size: 1.2rem; font-weight: 800; color: #3b82f6; margin-right: 0.3rem; }
.amount-input { font-size: 1.2rem !important; font-weight: 800 !important; border: none !important; background: transparent !important; }

.form-input, .form-select {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.88rem;
  color: var(--text-primary);
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .form-input, .form-select { background: rgba(30, 41, 59, 0.8); border-color: rgba(255, 255, 255, 0.12); }
}

.scope-bar { display: flex; background: rgba(0,0,0,0.05); padding: 3px; border-radius: 10px; gap: 2px; }
.scope-btn { flex: 1; border: none; background: transparent; padding: 0.45rem; font-size: 0.78rem; font-weight: 700; border-radius: 8px; color: var(--text-secondary); cursor: pointer; }
.scope-btn.active { background: #ffffff; color: #0f172a; box-shadow: 0 2px 5px rgba(0,0,0,0.08); }

@media (prefers-color-scheme: dark) {
  .scope-btn.active { background: #1e293b; color: #f8fafc; }
}

.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
.cancel-btn { padding: 0.65rem 1rem; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); background: transparent; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.confirm-btn { padding: 0.65rem 1.25rem; border-radius: 12px; border: none; background: #10b981; color: #fff; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: background 0.15s; }
.confirm-btn:hover:not(:disabled) { background: #059669; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

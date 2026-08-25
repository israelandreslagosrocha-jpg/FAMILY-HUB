<script setup lang="ts">
import { ref, watch } from 'vue'
import { useReceiptStore } from '../../stores/receiptStore'
import type { ReceiptItem } from '../../types'

const receiptStore = useReceiptStore()

const merchantName = ref('')
const totalAmount = ref<number | null>(null)
const taxAmount = ref<number | null>(null)
const date = ref(new Date().toISOString().split('T')[0])
const suggestedCategory = ref('Supermercado')
const isFamilyScope = ref(true)
const items = ref<ReceiptItem[]>([])

// Escuchar únicamente cambios de ID de sesión para no reiniciar inputs al editar
watch(() => receiptStore.currentSession?.id, (sessionId) => {
  if (sessionId && receiptStore.currentSession?.extractedData) {
    const data = receiptStore.currentSession.extractedData
    merchantName.value = data.merchantName || ''
    totalAmount.value = data.totalAmount || null
    taxAmount.value = data.taxAmount || (data.totalAmount ? Math.round(data.totalAmount - (data.totalAmount / 1.19)) : null)
    date.value = data.date || new Date().toISOString().split('T')[0]
    suggestedCategory.value = data.suggestedCategory || 'Supermercado'
    isFamilyScope.value = true
    items.value = data.items ? data.items.map(i => ({ ...i })) : []
  }
}, { immediate: true })

function addItem() {
  items.value.push({
    id: `item-${Date.now()}-${Math.random()}`,
    quantity: 1,
    description: '',
    unitPrice: 0,
    totalPrice: 0
  })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  recalculateGrandTotal()
}

function recalculateItemTotal(item: ReceiptItem) {
  item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0)
  recalculateGrandTotal()
}

function recalculateGrandTotal() {
  if (items.value.length > 0) {
    const sum = items.value.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0)
    if (sum > 0) {
      totalAmount.value = sum
      taxAmount.value = Math.round(sum - (sum / 1.19))
    }
  }
}

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
    taxAmount: taxAmount.value || undefined,
    items: items.value,
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
  <div v-if="receiptStore.isReviewSheetOpen && receiptStore.currentSession" class="review-backdrop" @click.self="handleClose">
    <div class="review-modal glass-card" @click.stop @mousedown.stop>
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
              placeholder="Ej. Supermercado Bella Vista, Jumbo..." 
              required 
            />
          </div>

          <!-- Campo Monto Total e IVA -->
          <div class="form-row-2">
            <div class="form-group">
              <div class="label-row">
                <label class="form-label">Monto Total (CLP)</label>
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

            <div class="form-group">
              <label class="form-label">IVA Incluido (19%)</label>
              <div class="amount-wrapper tax-wrapper">
                <span class="currency-prefix tax-prefix">$</span>
                <input 
                  v-model.number="taxAmount" 
                  type="number" 
                  class="form-input amount-input tax-input" 
                  placeholder="0" 
                  min="0" 
                />
              </div>
            </div>
          </div>

          <!-- DESGLOSE DE PRODUCTOS / ÍTEMS DE LA BOLETA -->
          <div class="form-group items-section">
            <div class="label-row">
              <label class="form-label">🛒 Productos / Desglose Boleta ({{ items.length }})</label>
              <button type="button" class="add-item-btn" @click="addItem">+ Agregar Producto</button>
            </div>

            <div v-if="items.length > 0" class="items-list">
              <div class="items-header-row">
                <span class="col-hdr qty-hdr">Cant.</span>
                <span class="col-hdr desc-hdr">Descripción Producto</span>
                <span class="col-hdr price-hdr">P. Unit</span>
                <span class="col-hdr total-hdr">Total ($)</span>
                <span class="col-hdr act-hdr"></span>
              </div>
              <div v-for="(item, idx) in items" :key="item.id || idx" class="item-row">
                <input 
                  v-model.number="item.quantity" 
                  type="number" 
                  min="1" 
                  class="form-input item-qty" 
                  placeholder="Cant." 
                  @input="recalculateItemTotal(item)" 
                />
                <input 
                  v-model="item.description" 
                  type="text" 
                  class="form-input item-desc" 
                  placeholder="Descripción producto (Ej. Pan Corriente)" 
                />
                <input 
                  v-model.number="item.unitPrice" 
                  type="number" 
                  min="0" 
                  class="form-input item-price" 
                  placeholder="P. Unit" 
                  @input="recalculateItemTotal(item)" 
                />
                <span class="item-total-badge">${{ (item.totalPrice || 0).toLocaleString('es-CL') }}</span>
                <button type="button" class="remove-item-btn" @click="removeItem(idx)">🗑️</button>
              </div>
            </div>
            <div v-else class="empty-items-notice">
              <span>Sin productos desglosados automáticamente. Puedes agregarlos con "+ Agregar Producto".</span>
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
  max-width: 740px;
  background: #ffffff;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 92vh;
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
  height: 280px;
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

.confidence-badge { font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 6px; }
.confidence-badge.high { background: #dcfce7; color: #15803d; }
.confidence-badge.low { background: #fef9c3; color: #a16207; }

.amount-wrapper { display: flex; align-items: center; background: rgba(0,0,0,0.03); border: 1.5px solid #3b82f6; border-radius: 12px; padding: 0.1rem 0.6rem; }
.tax-wrapper { border-color: rgba(0, 0, 0, 0.12); background: transparent; }
.currency-prefix { font-size: 1.1rem; font-weight: 800; color: #3b82f6; margin-right: 0.3rem; }
.tax-prefix { color: #64748b; }
.amount-input { font-size: 1.1rem !important; font-weight: 800 !important; border: none !important; background: transparent !important; }

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

/* ESTILOS DE ÍTEMS / DESGLOSE DE PRODUCTOS */
.items-section {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0.75rem;
  border-radius: 14px;
}

@media (prefers-color-scheme: dark) {
  .items-section { background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); }
}

.add-item-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
}

.items-list { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.4rem; }
.items-header-row { display: flex; align-items: center; gap: 0.35rem; padding: 0 0.2rem; font-size: 0.72rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
.qty-hdr { width: 55px; text-align: center; }
.desc-hdr { flex: 1; }
.price-hdr { width: 85px; }
.total-hdr { width: 65px; text-align: right; }
.act-hdr { width: 24px; }
.item-row { display: flex; align-items: center; gap: 0.35rem; }
.item-qty { width: 55px !important; text-align: center; padding: 0.4rem !important; }
.item-desc { flex: 1; padding: 0.4rem !important; }
.item-price { width: 85px !important; padding: 0.4rem !important; }
.item-total-badge { font-size: 0.82rem; font-weight: 800; color: #10b981; min-width: 65px; text-align: right; }
.remove-item-btn { background: transparent; border: none; font-size: 0.9rem; cursor: pointer; padding: 0.2rem; }

.empty-items-notice { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.3rem; font-style: italic; }

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

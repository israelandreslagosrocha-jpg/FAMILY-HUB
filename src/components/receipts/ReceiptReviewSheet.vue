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
      <!-- Tirador táctil para móvil -->
      <div class="sheet-grabber"></div>

      <div class="modal-header">
        <div class="header-titles">
          <span class="badge-pill">HUMAN-IN-THE-LOOP</span>
          <h3 class="modal-title">✏️ Revisión de Boleta OCR</h3>
        </div>
        <button class="close-btn" @click="handleClose" title="Cerrar revisión">×</button>
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
          <span>No se pudieron extraer algunos datos. Ingresa el monto y comercio manualmente a continuación antes de confirmar.</span>
        </div>
      </div>

      <!-- Badges de Métricas de Confianza OCR y Extracción -->
      <div class="confidence-summary-bar">
        <div class="conf-item">
          <span class="conf-label">Lectura OCR:</span>
          <span 
            class="confidence-badge"
            :class="(receiptStore.currentSession.extractedData?.ocrConfidence || 95) >= 80 ? 'high' : 'low'"
          >
            {{ receiptStore.currentSession.extractedData?.ocrConfidence || 95 }}%
          </span>
        </div>

        <div class="conf-item">
          <span class="conf-label">Extracción Datos:</span>
          <span 
            class="confidence-badge"
            :class="(receiptStore.currentSession.extractedData?.extractionConfidence || 90) >= 80 ? 'high' : 'low'"
          >
            {{ receiptStore.currentSession.extractedData?.extractionConfidence || 90 }}%
          </span>
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

        <!-- Columna Derecha: Formulario de Verificación -->
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
                Comercio: {{ receiptStore.currentSession.extractedData.merchantConfidence }}%
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

          <!-- DESGLOSE DE PRODUCTOS / ÍTEMS DE LA BOLETA (RESPONSIVE) -->
          <div class="form-group items-section">
            <div class="label-row">
              <label class="form-label">🛒 Desglose de Productos ({{ items.length }})</label>
              <button type="button" class="add-item-btn" @click="addItem">+ Agregar Producto</button>
            </div>

            <div v-if="items.length > 0" class="items-list">
              <!-- Encabezado visible únicamente en Desktop (>=640px) -->
              <div class="items-header-row desktop-only">
                <span class="col-hdr qty-hdr">Cant.</span>
                <span class="col-hdr desc-hdr">Descripción Producto</span>
                <span class="col-hdr price-hdr">P. Unit</span>
                <span class="col-hdr total-hdr">Total ($)</span>
                <span class="col-hdr act-hdr"></span>
              </div>

              <!-- Fila de Producto: Card en Móvil, Fila en Desktop -->
              <div v-for="(item, idx) in items" :key="item.id || idx" class="item-card-row">
                <!-- Línea 1 en Móvil: Descripción completa -->
                <div class="item-desc-wrap">
                  <input 
                    v-model="item.description" 
                    type="text" 
                    class="form-input item-desc" 
                    placeholder="Descripción producto (Ej. Pan Corriente)" 
                  />
                </div>

                <!-- Línea 2 en Móvil: Cantidad, Precio Unitario, Total y Eliminar -->
                <div class="item-calc-wrap">
                  <div class="item-input-mini">
                    <span class="mini-label mobile-only">Cant:</span>
                    <input 
                      v-model.number="item.quantity" 
                      type="number" 
                      min="1" 
                      class="form-input item-qty" 
                      placeholder="Cant." 
                      @input="recalculateItemTotal(item)" 
                    />
                  </div>

                  <div class="item-input-mini price-col">
                    <span class="mini-label mobile-only">Unit:</span>
                    <input 
                      v-model.number="item.unitPrice" 
                      type="number" 
                      min="0" 
                      class="form-input item-price" 
                      placeholder="$ Unit" 
                      @input="recalculateItemTotal(item)" 
                    />
                  </div>

                  <div class="item-total-badge-wrap">
                    <span class="item-total-badge">${{ (item.totalPrice || 0).toLocaleString('es-CL') }}</span>
                  </div>

                  <button type="button" class="remove-item-btn" @click="removeItem(idx)" title="Eliminar ítem">
                    🗑️
                  </button>
                </div>
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

          <!-- Botones de Acción Human-in-the-Loop -->
          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="handleClose">
              Cancelar
            </button>
            <button type="submit" class="confirm-btn" :disabled="!merchantName.trim() || !totalAmount">
              ✅ Confirmar y Registrar Gasto
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

.review-modal {
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
  align-items: flex-start;
}

.header-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.badge-pill {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.05em;
}

.modal-title {
  font-size: clamp(1.15rem, 3.5vw, 1.3rem);
  font-weight: 800;
  margin: 0.1rem 0 0;
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

:root[data-theme="dark"] .alert-warning {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

:root[data-theme="dark"] .alert-danger {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.alert-text { display: flex; flex-direction: column; gap: 0.15rem; }

.confidence-summary-bar {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.06);
  border: 1px dashed rgba(59, 130, 246, 0.25);
  border-radius: 12px;
}

.conf-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.conf-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.review-body-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.preview-col { display: flex; flex-direction: column; gap: 0.4rem; }
.col-label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }

.image-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: rgba(0, 0, 0, 0.05);
}

.receipt-img { 
  width: 100%; 
  height: 100%; 
  object-fit: contain; 
  background: rgba(0, 0, 0, 0.2);
}

.scanner-badge { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 6px; }

.form-col { display: flex; flex-direction: column; gap: 0.85rem; }
.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
.form-row-2 { 
  display: grid; 
  grid-template-columns: 1fr; 
  gap: 0.75rem; 
}

@media (min-width: 480px) {
  .form-row-2 {
    grid-template-columns: 1fr 1fr;
  }
}

.label-row { display: flex; justify-content: space-between; align-items: center; }
.form-label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }

.confidence-badge { font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 8px; }
.confidence-badge.high { background: #dcfce7; color: #15803d; }
.confidence-badge.low { background: #fef9c3; color: #a16207; }

:root[data-theme="dark"] .confidence-badge.high {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

:root[data-theme="dark"] .confidence-badge.low {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.amount-wrapper { 
  display: flex; 
  align-items: center; 
  background: rgba(0,0,0,0.03); 
  border: 1.5px solid #3b82f6; 
  border-radius: 12px; 
  padding: 0.1rem 0.6rem; 
  min-height: var(--touch-target-min);
}

:root[data-theme="dark"] .amount-wrapper {
  background: rgba(255, 255, 255, 0.04);
}

.tax-wrapper { border-color: var(--border-subtle); background: transparent; }
.currency-prefix { font-size: 1.2rem; font-weight: 800; color: #3b82f6; margin-right: 0.3rem; }
.tax-prefix { color: #64748b; }
.amount-input { font-size: 1.15rem !important; font-weight: 800 !important; border: none !important; background: transparent !important; }

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  font-size: 16px;
  line-height: 1.4;
  color: var(--text-primary);
  box-sizing: border-box;
  min-height: var(--touch-target-min);
}

/* ============================================================================
   ESTILOS DE PRODUCTOS / DESGLOSE RESPONSIVE (CARD EN MÓVIL, TABLA EN DESKTOP)
   ============================================================================ */
.items-section {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-subtle);
  padding: 0.85rem;
  border-radius: 16px;
}

:root[data-theme="dark"] .items-section {
  background: rgba(255, 255, 255, 0.03);
}

.add-item-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  min-height: var(--touch-target-min);
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
}

.items-list { 
  display: flex; 
  flex-direction: column; 
  gap: 0.6rem; 
  margin-top: 0.5rem; 
}

/* Mobile-First Item Card */
.item-card-row {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.65rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
}

.item-desc-wrap {
  width: 100%;
}

.item-desc {
  width: 100%;
}

.item-calc-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.item-input-mini {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mini-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.item-qty {
  width: 65px !important;
  text-align: center;
  padding: 0.5rem !important;
}

.item-price {
  width: 85px !important;
  padding: 0.5rem !important;
}

.price-col {
  flex: 1;
}

.item-total-badge-wrap {
  min-width: 65px;
  text-align: right;
}

.item-total-badge { 
  font-size: 0.88rem; 
  font-weight: 800; 
  color: #10b981; 
}

.remove-item-btn { 
  background: rgba(239, 68, 68, 0.08); 
  border: 1px solid rgba(239, 68, 68, 0.2); 
  min-width: var(--touch-target-min);
  min-height: var(--touch-target-min);
  border-radius: 10px;
  font-size: 0.95rem; 
  cursor: pointer; 
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.empty-items-notice { 
  font-size: 0.78rem; 
  color: var(--text-secondary); 
  margin-top: 0.4rem; 
  font-style: italic; 
}

.scope-bar { 
  display: flex; 
  background: rgba(0,0,0,0.05); 
  padding: 4px; 
  border-radius: 12px; 
  gap: 4px; 
}

:root[data-theme="dark"] .scope-bar {
  background: rgba(255, 255, 255, 0.06);
}

.scope-btn { 
  flex: 1; 
  border: none; 
  background: transparent; 
  padding: 0.55rem; 
  min-height: var(--touch-target-min);
  font-size: 0.82rem; 
  font-weight: 700; 
  border-radius: 10px; 
  color: var(--text-secondary); 
  cursor: pointer; 
  touch-action: manipulation;
}

.scope-btn.active { 
  background: #3b82f6; 
  color: #ffffff; 
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); 
}

.modal-footer { 
  display: flex; 
  flex-direction: column;
  gap: 0.6rem; 
  margin-top: 0.75rem; 
}

.cancel-btn { 
  padding: 0.75rem 1rem; 
  min-height: var(--touch-target-min);
  border-radius: 12px; 
  border: 1px solid var(--border-subtle); 
  background: transparent; 
  font-size: 0.88rem; 
  font-weight: 700; 
  color: var(--text-secondary); 
  cursor: pointer; 
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.confirm-btn { 
  padding: 0.85rem 1.25rem; 
  min-height: 48px;
  border-radius: 14px; 
  border: none; 
  background: #10b981; 
  color: #fff; 
  font-size: 0.95rem; 
  font-weight: 800; 
  cursor: pointer; 
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
  transition: background 0.15s, transform 0.15s; 
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.confirm-btn:hover:not(:disabled) { 
  background: #059669; 
  transform: translateY(-1px);
}

.confirm-btn:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}

.desktop-only { display: none !important; }
.mobile-only { display: inline-block; }

/* ============================================================================
   🖥️ DESKTOP / TABLET (>= 640px)
   ============================================================================ */
@media (min-width: 640px) {
  .desktop-only { display: flex !important; }
  .mobile-only { display: none !important; }

  .review-modal {
    max-width: 760px;
    border-radius: 24px;
    border-bottom: 1px solid var(--border-subtle);
    padding: 1.75rem;
    animation: none;
  }

  .review-backdrop {
    align-items: center;
    padding: 1.5rem;
  }

  .sheet-grabber {
    display: none;
  }

  .review-body-grid {
    grid-template-columns: 240px 1fr;
    gap: 1.25rem;
  }

  .image-wrapper {
    height: 300px;
  }

  /* Desktop Table Row */
  .item-card-row {
    flex-direction: row;
    align-items: center;
    gap: 0.35rem;
    padding: 0;
    background: transparent;
    border: none;
  }

  .item-desc-wrap {
    flex: 1;
  }

  .item-calc-wrap {
    width: auto;
    gap: 0.35rem;
  }

  .items-header-row { 
    display: flex; 
    align-items: center; 
    gap: 0.35rem; 
    padding: 0 0.2rem; 
    font-size: 0.72rem; 
    font-weight: 800; 
    color: var(--text-secondary); 
    text-transform: uppercase; 
    letter-spacing: 0.04em; 
  }

  .qty-hdr { width: 55px; text-align: center; }
  .desc-hdr { flex: 1; }
  .price-hdr { width: 85px; }
  .total-hdr { width: 65px; text-align: right; }
  .act-hdr { width: var(--touch-target-min); }

  .modal-footer {
    flex-direction: row;
    justify-content: flex-end;
  }

  .cancel-btn, .confirm-btn {
    width: auto;
  }
}
</style>

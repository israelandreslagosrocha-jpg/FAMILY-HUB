<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useReceiptStore } from '../../stores/receiptStore'
import { useFinanceStore } from '../../stores/financeStore'
import { useAuthStore } from '../../stores/authStore'
import { storageService } from '../../services/storageService'
import AvatarImage from '../common/AvatarImage.vue'

const receiptStore = useReceiptStore()
const financeStore = useFinanceStore()
const authStore = useAuthStore()

const signedImageUrl = ref<string>('')
const isLoadingImage = ref<boolean>(false)
const isFullscreenImage = ref<boolean>(false)
const isSaving = ref<boolean>(false)
const saveSuccess = ref<boolean>(false)

// Form fields
const title = ref('')
const amount = ref<number>(0)
const date = ref('')
const categoryName = ref('Supermercado y Alimentación')
const categoryId = ref('')
const isFamilyScope = ref(true)
const belongingToMemberId = ref('')

const availableCategories = [
  { name: 'Supermercado y Alimentación', icon: '🛒', color: '#22c55e' },
  { name: 'Servicios y Cuentas', icon: '💡', color: '#ef4444' },
  { name: 'Transporte y Combustible', icon: '🚗', color: '#f59e0b' },
  { name: 'Salud y Medicina', icon: '💊', color: '#ec4899' },
  { name: 'Educación y Colegio', icon: '🎓', color: '#8b5cf6' },
  { name: 'Entretención & Salidas', icon: '🍕', color: '#3b82f6' },
  { name: 'Honorarios & Partituras', icon: '🎼', color: '#10b981' },
  { name: 'Gasto General', icon: '💸', color: '#64748b' }
]

const currentMovement = computed(() => receiptStore.selectedDetailMovement)

watch(currentMovement, async (mov) => {
  if (mov) {
    title.value = mov.title.replace(' (Boleta Escaneada)', '')
    amount.value = mov.amount
    date.value = mov.date || new Date().toISOString().split('T')[0]
    categoryName.value = mov.categoryName || 'Supermercado y Alimentación'
    categoryId.value = mov.categoryId || ''
    isFamilyScope.value = mov.scope === 'family'
    belongingToMemberId.value = mov.belongingToMemberId || (authStore.activeMemberId || '')
    saveSuccess.value = false
    isFullscreenImage.value = false

    if (mov.receiptImageUrl) {
      isLoadingImage.value = true
      try {
        signedImageUrl.value = await storageService.getSignedUrl(mov.receiptImageUrl)
      } catch (e) {
        signedImageUrl.value = ''
      } finally {
        isLoadingImage.value = false
      }
    } else {
      signedImageUrl.value = ''
      isLoadingImage.value = false
    }
  }
}, { immediate: true })

function handleClose() {
  receiptStore.closeDetailModal()
}

async function handleSave() {
  if (!currentMovement.value || !title.value.trim() || amount.value <= 0) return

  isSaving.value = true
  try {
    const selectedCat = availableCategories.find(c => c.name === categoryName.value)

    await receiptStore.saveDetailChanges(currentMovement.value.id, {
      title: title.value.trim(),
      amount: Number(amount.value),
      date: date.value,
      categoryName: categoryName.value,
      categoryIcon: selectedCat?.icon || currentMovement.value.categoryIcon || '💸',
      categoryColor: selectedCat?.color || currentMovement.value.categoryColor || '#3b82f6',
      scope: isFamilyScope.value ? 'family' : 'personal',
      belongingToMemberId: isFamilyScope.value ? undefined : belongingToMemberId.value
    })

    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
      handleClose()
    }, 800)
  } catch (err: any) {
    alert('Error al guardar cambios: ' + err.message)
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!currentMovement.value) return
  if (confirm(`¿Deseas eliminar el movimiento "${title.value}"?`)) {
    const id = currentMovement.value.id
    handleClose()
    await financeStore.deleteMovement(id)
    await receiptStore.loadReceiptsFromSupabase()
  }
}
</script>

<template>
  <!-- Modal Principal / Sheet -->
  <div v-if="receiptStore.isDetailModalOpen && currentMovement" class="detail-backdrop" @click.self="handleClose">
    <div class="detail-modal glass-card" @click.stop>
      <!-- Tirador táctil móvil -->
      <div class="sheet-grabber"></div>

      <!-- Header del Modal -->
      <div class="modal-header">
        <div class="header-titles">
          <span class="header-badge">DETALLE & COMPROBANTE</span>
          <h3 class="modal-title">🧾 Detalle del Movimiento</h3>
        </div>
        <button class="close-btn" @click="handleClose" title="Cerrar">✕</button>
      </div>

      <div class="detail-body-grid">
        <!-- SECCIÓN 1: FOTOGRAFÍA / COMPROBANTE ESCANEADO -->
        <div class="receipt-viewer-card">
          <div class="viewer-header">
            <span class="viewer-title">📸 Fotografía de la Boleta</span>
            <button 
              v-if="signedImageUrl" 
              class="zoom-btn" 
              @click="isFullscreenImage = true"
              title="Ver en pantalla completa"
            >
              🔍 Ampliar Foto
            </button>
          </div>

          <!-- Imagen con estado de carga -->
          <div class="image-box" :class="{ clickable: !!signedImageUrl }" @click="signedImageUrl ? isFullscreenImage = true : null">
            <div v-if="isLoadingImage" class="loading-state">
              <span class="spinner">⏳</span>
              <span>Cargando imagen protegida...</span>
            </div>

            <div v-else-if="signedImageUrl" class="img-container">
              <img :src="signedImageUrl" alt="Boleta escaneada" class="receipt-full-img" />
              <div class="img-overlay-hint">
                <span>🔍 Toca para ampliar</span>
              </div>
            </div>

            <div v-else class="no-receipt-stub">
              <span class="no-receipt-icon">📄</span>
              <p class="no-receipt-txt">Este movimiento no tiene una foto de boleta adjunta.</p>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: FORMULARIO DE EDICIÓN DE DATOS -->
        <form class="edit-form" @submit.prevent="handleSave">
          <!-- Campo Comercio / Título -->
          <div class="form-group">
            <label class="form-label">Comercio o Concepto</label>
            <input 
              v-model="title" 
              type="text" 
              class="form-input" 
              placeholder="Ej: Supermercado Lider" 
              required 
            />
          </div>

          <!-- Fila Monto y Fecha -->
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Monto (CLP)</label>
              <div class="amount-input-box">
                <span class="currency-sign">$</span>
                <input 
                  v-model.number="amount" 
                  type="number" 
                  min="1" 
                  class="form-input amount-val" 
                  placeholder="0" 
                  required 
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Fecha del Gasto</label>
              <input 
                v-model="date" 
                type="date" 
                class="form-input" 
                required 
              />
            </div>
          </div>

          <!-- Selector de Categoría -->
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select v-model="categoryName" class="form-select">
              <option v-for="cat in availableCategories" :key="cat.name" :value="cat.name">
                {{ cat.icon }} {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Selector de Ámbito (Familiar vs Personal) -->
          <div class="form-group">
            <label class="form-label">Ámbito del Gasto</label>
            <div class="scope-toggle-group">
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

          <!-- Selector de Miembro si es Gasto Personal -->
          <div v-if="!isFamilyScope" class="form-group">
            <label class="form-label">Asignado al Integrante</label>
            <div class="members-picker">
              <button 
                v-for="m in authStore.familyMembers" 
                :key="m.id"
                type="button"
                class="member-pill-btn"
                :class="{ active: belongingToMemberId === m.id }"
                @click="belongingToMemberId = m.id"
              >
                <AvatarImage :avatarId="m.avatarId" :size="22" :borderColor="m.color" />
                <span>{{ m.name }}</span>
              </button>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="modal-actions-row">
            <button type="button" class="delete-btn" @click="handleDelete" title="Eliminar este movimiento">
              🗑️ Eliminar
            </button>

            <div class="right-actions">
              <button type="button" class="cancel-btn" @click="handleClose">
                Cancelar
              </button>
              <button type="submit" class="save-btn" :disabled="isSaving">
                <span v-if="saveSuccess">✓ Guardado</span>
                <span v-else-if="isSaving">Guardando...</span>
                <span v-else>✓ Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- LIGHTBOX / FULLSCREEN IMAGE VIEWER -->
  <div v-if="isFullscreenImage && signedImageUrl" class="lightbox-backdrop" @click="isFullscreenImage = false">
    <div class="lightbox-controls">
      <span class="lightbox-hint">Toca cualquier parte para cerrar</span>
      <button class="lightbox-close-btn" @click="isFullscreenImage = false">✕</button>
    </div>
    <div class="lightbox-content" @click.stop>
      <img :src="signedImageUrl" alt="Boleta escaneada ampliada" class="lightbox-img" />
    </div>
  </div>
</template>

<style scoped>
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2100;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.detail-modal {
  width: 100%;
  max-width: 100%;
  max-height: calc(100dvh - 1.5rem);
  background: var(--bg-card, #0f172a);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4);
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

.sheet-grabber {
  width: 38px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  margin: -0.25rem auto 0.25rem auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-titles {
  display: flex;
  flex-direction: column;
}

.header-badge {
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
  background: rgba(255, 255, 255, 0.08);
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

.detail-body-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

/* ============================================================================
   SECCIÓN VISOR DE COMPROBANTE
   ============================================================================ */
.receipt-viewer-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  padding: 0.85rem;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
}

:root[data-theme="dark"] .receipt-viewer-card {
  background: rgba(255, 255, 255, 0.03);
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.viewer-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.zoom-btn {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #3b82f6;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  touch-action: manipulation;
}

:root[data-theme="dark"] .zoom-btn {
  color: #60a5fa;
}

.image-box {
  position: relative;
  width: 100%;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-box.clickable {
  cursor: pointer;
}

.img-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.receipt-full-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.img-overlay-hint {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  pointer-events: none;
}

.loading-state, .no-receipt-stub {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem;
}

.no-receipt-icon { font-size: 2.2rem; opacity: 0.6; }
.no-receipt-txt { margin: 0; font-size: 0.82rem; }

/* ============================================================================
   FORMULARIO DE EDICIÓN
   ============================================================================ */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input, .form-select {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  font-size: 16px;
  color: var(--text-primary);
  box-sizing: border-box;
  min-height: var(--touch-target-min);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.amount-input-box {
  display: flex;
  align-items: center;
  background: rgba(59, 130, 246, 0.08);
  border: 1.5px solid #3b82f6;
  border-radius: 12px;
  padding: 0 0.65rem;
  min-height: var(--touch-target-min);
}

.currency-sign {
  font-size: 1.15rem;
  font-weight: 800;
  color: #3b82f6;
  margin-right: 0.25rem;
}

.amount-val {
  font-size: 1.1rem !important;
  font-weight: 800 !important;
  border: none !important;
  background: transparent !important;
  padding-left: 0 !important;
}

.scope-toggle-group {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 12px;
  gap: 4px;
}

:root[data-theme="dark"] .scope-toggle-group {
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

.members-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.member-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.member-pill-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #3b82f6;
  font-weight: 700;
}

.modal-actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-subtle);
  flex-wrap: wrap;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 0.65rem 0.95rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.right-actions {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 0.65rem 1rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.save-btn {
  padding: 0.65rem 1.25rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: none;
  background: #10b981;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: transform 0.15s, background 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

/* ============================================================================
   LIGHTBOX PANTALLA COMPLETA
   ============================================================================ */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
  animation: fadeIn 0.2s ease;
}

.lightbox-controls {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.82rem;
  z-index: 3010;
}

.lightbox-close-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #ffffff;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-content {
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

/* ============================================================================
   PROGRESSIVE ENHANCEMENT DESKTOP (>= 680px)
   ============================================================================ */
@media (min-width: 680px) {
  .detail-backdrop {
    align-items: center;
    padding: 1.5rem;
  }

  .detail-modal {
    max-width: 760px;
    border-radius: 24px;
    border-bottom: 1px solid var(--border-subtle);
    padding: 1.75rem;
    animation: none;
  }

  .sheet-grabber {
    display: none;
  }

  .detail-body-grid {
    grid-template-columns: 1fr 1.2fr;
    align-items: start;
  }

  .image-box {
    height: 320px;
  }
}
</style>

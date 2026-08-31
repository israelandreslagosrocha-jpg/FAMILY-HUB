<script setup lang="ts">
import { onMounted } from 'vue'
import { useReceiptStore } from '../stores/receiptStore'
import { useFinanceStore } from '../stores/financeStore'
import type { ReceiptScanSession } from '../types'
import ReceiptScannerBtn from '../components/receipts/ReceiptScannerBtn.vue'
import ReceiptCaptureModal from '../components/receipts/ReceiptCaptureModal.vue'
import ReceiptProcessingState from '../components/receipts/ReceiptProcessingState.vue'
import ReceiptReviewSheet from '../components/receipts/ReceiptReviewSheet.vue'
import ReceiptDetailModal from '../components/receipts/ReceiptDetailModal.vue'

const receiptStore = useReceiptStore()
const financeStore = useFinanceStore()

onMounted(async () => {
  await receiptStore.loadReceiptsFromSupabase()
})

function handleOpenReceipt(rec: ReceiptScanSession) {
  const mov = financeStore.movements.find(m => m.id === rec.id)
  if (mov) {
    receiptStore.openDetailModal(mov)
  } else {
    receiptStore.openDetailModal({
      id: rec.id,
      title: rec.extractedData?.merchantName ? `${rec.extractedData.merchantName} (Boleta Escaneada)` : 'Boleta Escaneada',
      amount: rec.extractedData?.totalAmount || 0,
      currency: 'CLP',
      type: 'expense',
      scope: 'family',
      categoryId: rec.extractedData?.suggestedCategoryId || 'cat-general',
      categoryName: rec.extractedData?.suggestedCategory || 'Supermercado y Alimentación',
      categoryIcon: '🧾',
      categoryColor: '#3b82f6',
      registeredByMemberId: 'm-1',
      date: rec.extractedData?.date || rec.createdAt || new Date().toISOString().split('T')[0],
      receiptImageUrl: rec.storagePath
    })
  }
}
</script>

<template>
  <div class="receipts-page-view">
    <!-- Header del Módulo de Boletas -->
    <header class="receipts-header glass-card">
      <div class="header-left">
        <span class="header-icon">🧾</span>
        <div class="header-texts">
          <h2 class="header-title">Boletas & Captura OCR</h2>
          <p class="header-subtitle">Digitalización y verificación de comprobantes del hogar</p>
        </div>
      </div>

      <ReceiptScannerBtn />
    </header>

    <!-- Galería de Boletas Procesadas -->
    <main class="receipts-main">
      <div class="section-title-row">
        <h3 class="section-title">🖼️ Boletas Guardadas ({{ receiptStore.savedReceipts.length }})</h3>
      </div>

      <div v-if="receiptStore.isLoadingReceipts" class="empty-card glass-card">
        <span class="empty-icon">⏳</span>
        <h4 class="empty-title">Cargando comprobantes...</h4>
        <p class="empty-sub">Obteniendo tus fotografías y datos de Supabase.</p>
      </div>

      <div v-else-if="receiptStore.savedReceipts.length === 0" class="empty-card glass-card">
        <span class="empty-icon">🧾</span>
        <h4 class="empty-title">Sin boletas registradas</h4>
        <p class="empty-sub">Usa el botón de escanear para fotografiar o subir tu primera boleta.</p>
      </div>

      <div v-else class="receipts-grid">
        <div 
          v-for="rec in receiptStore.savedReceipts" 
          :key="rec.id"
          class="receipt-card glass-card receipt-card-interactive"
          @click="handleOpenReceipt(rec)"
          title="Toca para ver la foto y editar los datos"
        >
          <div class="card-img-wrapper">
            <img :src="rec.imagePreviewUrl" alt="Boleta" class="card-img" />
            <span class="status-chip">✅ Verificada</span>
          </div>

          <div class="card-info">
            <h4 class="merchant-name">{{ rec.extractedData?.merchantName || 'Comercio General' }}</h4>
            <span class="rec-date">{{ rec.extractedData?.date || rec.createdAt }}</span>

            <div class="amount-row">
              <span class="amount-val">${{ rec.extractedData?.totalAmount.toLocaleString('es-CL') }}</span>
              <span class="cat-chip">{{ rec.extractedData?.suggestedCategory || 'Gasto' }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modales y Sheets del Ciclo OCR y Detalle/Edición -->
    <ReceiptCaptureModal />
    <ReceiptProcessingState />
    <ReceiptReviewSheet />
    <ReceiptDetailModal />
  </div>
</template>

<style scoped>
.receipts-page-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 5rem;
}

.receipts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-radius: 20px;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left { display: flex; align-items: center; gap: 0.85rem; }
.header-icon { font-size: 2rem; }
.header-texts { display: flex; flex-direction: column; }
.header-title { font-size: 1.2rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.header-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin: 0.15rem 0 0; }

.section-title { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.85rem; color: var(--text-primary); }

.empty-card {
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 20px;
}

.empty-icon { font-size: 2.5rem; }
.empty-title { font-size: 1.1rem; font-weight: 700; margin: 0.5rem 0 0.2rem; color: var(--text-primary); }
.empty-sub { font-size: 0.85rem; color: var(--text-secondary); margin: 0; }

.receipts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.15rem;
}

.receipt-card {
  padding: 0.85rem;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.receipt-card-interactive {
  cursor: pointer;
}

.receipt-card-interactive:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

:root[data-theme="dark"] .receipt-card-interactive:hover {
  background: rgba(30, 41, 59, 0.85);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.card-img-wrapper {
  position: relative;
  width: 100%;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.card-img { width: 100%; height: 100%; object-fit: cover; }
.status-chip { position: absolute; top: 8px; right: 8px; background: rgba(16, 185, 129, 0.9); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 2px 7px; border-radius: 6px; }

.card-info { display: flex; flex-direction: column; gap: 0.2rem; }
.merchant-name { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.rec-date { font-size: 0.75rem; color: var(--text-secondary); }

.amount-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem; }
.amount-val { font-size: 1.05rem; font-weight: 800; color: #3b82f6; }
.cat-chip { font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.05); color: var(--text-secondary); }

@media (prefers-color-scheme: dark) {
  .cat-chip { background: rgba(255,255,255,0.1); }
}
</style>

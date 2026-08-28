<script setup lang="ts">
import { useReceiptStore } from '../../stores/receiptStore'

const receiptStore = useReceiptStore()

function handleOpen() {
  receiptStore.openScanner()
}
</script>

<template>
  <button class="receipt-scanner-btn" @click="handleOpen">
    <span class="btn-icon">📷</span>
    <span class="btn-text">Escanear Boleta</span>
  </button>
</template>

<style scoped>
.receipt-scanner-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.15rem;
  min-height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #ffffff;
  border: none;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.3);
  transition: transform 0.15s, box-shadow 0.15s;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .receipt-scanner-btn {
    width: auto;
  }
}

.receipt-scanner-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(236, 72, 153, 0.4);
}

.btn-icon { font-size: 1.2rem; }
</style>

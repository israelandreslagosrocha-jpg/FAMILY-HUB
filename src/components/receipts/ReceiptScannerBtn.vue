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
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #ffffff;
  border: none;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(236, 72, 153, 0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}

.receipt-scanner-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(236, 72, 153, 0.4);
}

.btn-icon { font-size: 1.1rem; }
</style>

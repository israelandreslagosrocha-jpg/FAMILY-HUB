<script setup lang="ts">
import { usePWAStore } from '../../stores/pwaStore'

const pwaStore = usePWAStore()
</script>

<template>
  <div v-if="!pwaStore.isOnline && pwaStore.lastStaleTime" class="stale-data-banner">
    <span class="stale-icon">🟠</span>
    <span class="stale-text">
      Mostrando datos de la caché local del dispositivo 
      <strong>(Actualizado a las {{ pwaStore.lastStaleTime }})</strong>
    </span>
  </div>
</template>

<style scoped>
.stale-data-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  background: linear-gradient(90deg, #fef3c7, #ffedd5);
  color: #92400e;
  border-bottom: 1px solid #fde68a;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  box-shadow: inset 0 -1px 3px rgba(0,0,0,0.03);
}

@media (prefers-color-scheme: dark) {
  .stale-data-banner {
    background: linear-gradient(90deg, #78350f, #7c2d12);
    color: #fef3c7;
    border-color: rgba(251, 191, 36, 0.3);
  }
}

.stale-icon { font-size: 0.85rem; }
</style>

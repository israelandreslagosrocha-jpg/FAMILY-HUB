<script setup lang="ts">
import { useNotificationStore } from '../../stores/notificationStore'

const notificationStore = useNotificationStore()

function handleToggleDrawer() {
  if (notificationStore.isDrawerOpen) {
    notificationStore.closeDrawer()
  } else {
    notificationStore.openDrawer()
  }
}
</script>

<template>
  <button 
    class="notification-bell-btn" 
    title="Centro de Notificaciones de la Familia"
    @click="handleToggleDrawer"
  >
    <span class="bell-icon">🔔</span>
    <span v-if="notificationStore.unreadCount > 0" class="unread-badge">
      {{ notificationStore.unreadCount }}
    </span>
  </button>
</template>

<style scoped>
.notification-bell-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.15s;
}

@media (prefers-color-scheme: dark) {
  .notification-bell-btn {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

.notification-bell-btn:hover {
  transform: scale(1.05);
  background: rgba(59, 130, 246, 0.1);
}

.bell-icon { font-size: 1.1rem; }

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 800;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);
}
</style>

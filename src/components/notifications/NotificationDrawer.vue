<script setup lang="ts">
import { useNotificationStore } from '../../stores/notificationStore'

const notificationStore = useNotificationStore()

function handleClose() {
  notificationStore.closeDrawer()
}

function handleMarkAsRead(id: string) {
  notificationStore.markAsRead(id)
}

function handleMarkAllAsRead() {
  notificationStore.markAllAsRead()
}
</script>

<template>
  <div v-if="notificationStore.isDrawerOpen" class="drawer-backdrop" @click="handleClose">
    <div class="drawer-panel glass-card" @click.stopPropagation>
      <div class="drawer-header">
        <div class="header-left">
          <span class="header-icon">🔔</span>
          <h3 class="drawer-title">Notificaciones del Hogar</h3>
        </div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="drawer-toolbar">
        <span class="unread-status">{{ notificationStore.unreadCount }} sin leer</span>
        <button 
          v-if="notificationStore.unreadCount > 0" 
          class="mark-all-btn" 
          @click="handleMarkAllAsRead"
        >
          ✓ Marcar todas leídas
        </button>
      </div>

      <div class="notifications-list">
        <div 
          v-for="item in notificationStore.notifications" 
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.isRead, [item.type]: true }"
          @click="handleMarkAsRead(item.id)"
        >
          <div class="notif-header">
            <span class="notif-title">{{ item.title }}</span>
            <span class="notif-time">{{ item.createdAt }}</span>
          </div>

          <p class="notif-message">{{ item.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawer-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.drawer-panel {
  width: 100%;
  max-width: 400px;
  height: 100%;
  background: #ffffff;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: -10px 0 30px rgba(0,0,0,0.15);
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .drawer-panel { background: #0f172a; border-left: 1px solid rgba(255,255,255,0.1); }
}

.drawer-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 0.5rem; }
.header-icon { font-size: 1.4rem; }
.drawer-title { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
.close-btn { background: rgba(0,0,0,0.05); border: none; font-size: 1.3rem; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; color: var(--text-secondary); }

.drawer-toolbar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
.unread-status { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); }
.mark-all-btn { background: transparent; border: none; font-size: 0.78rem; font-weight: 700; color: #3b82f6; cursor: pointer; }

.notifications-list { display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; flex: 1; }

.notification-item {
  padding: 0.85rem;
  border-radius: 14px;
  background: rgba(0,0,0,0.02);
  border: 1px solid rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.15s;
}

@media (prefers-color-scheme: dark) {
  .notification-item { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.08); }
}

.notification-item.unread {
  border-left: 4px solid #3b82f6;
  background: rgba(59, 130, 246, 0.04);
}

.notif-header { display: flex; justify-content: space-between; align-items: center; }
.notif-title { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
.notif-time { font-size: 0.7rem; color: var(--text-secondary); }
.notif-message { font-size: 0.8rem; color: var(--text-secondary); margin: 0; line-height: 1.35; }
</style>

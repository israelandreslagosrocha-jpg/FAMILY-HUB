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
  <div v-if="notificationStore.isDrawerOpen" class="drawer-backdrop" @click.self="handleClose">
    <div class="drawer-panel glass-card" @click.stop>
      <!-- Tirador táctil en móvil -->
      <div class="sheet-grabber mobile-grabber"></div>

      <div class="drawer-header">
        <div class="header-left">
          <span class="header-icon">🔔</span>
          <h3 class="drawer-title">Notificaciones del Hogar</h3>
        </div>
        <button class="close-btn" title="Cerrar" @click="handleClose">✕</button>
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

      <div v-if="notificationStore.notifications.length === 0" class="empty-notif-state">
        <span class="empty-icon">🔔</span>
        <p class="empty-txt">Sin notificaciones pendientes en el hogar.</p>
      </div>

      <div v-else class="notifications-list">
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
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1200;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

/* Base Móvil (<768px): Bottom Sheet Táctil */
.drawer-panel {
  width: 100%;
  max-width: 100%;
  max-height: calc(100dvh - 1.5rem);
  background: var(--bg-card);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid var(--border-subtle);
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-shadow: 0 -10px 35px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.mobile-grabber {
  display: block;
}

.drawer-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
}

.header-left { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
}

.header-icon { 
  font-size: 1.4rem; 
}

.drawer-title { 
  font-size: 1.1rem; 
  font-weight: 700; 
  margin: 0; 
  color: var(--text-primary); 
}

.close-btn { 
  background: rgba(0, 0, 0, 0.05); 
  border: none; 
  font-size: 1.1rem; 
  min-width: var(--touch-target-min); 
  min-height: var(--touch-target-min); 
  border-radius: 50%; 
  cursor: pointer; 
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  transition: all 0.15s;
}

:root[data-theme="dark"] .close-btn {
  background: rgba(255, 255, 255, 0.08);
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.drawer-toolbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding-bottom: 0.5rem; 
  border-bottom: 1px solid var(--border-subtle); 
}

.unread-status { 
  font-size: 0.8rem; 
  font-weight: 700; 
  color: var(--text-secondary); 
}

.mark-all-btn { 
  background: transparent; 
  border: none; 
  font-size: 0.82rem; 
  font-weight: 700; 
  color: #3b82f6; 
  cursor: pointer; 
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  touch-action: manipulation;
}

.mark-all-btn:hover {
  background: rgba(59, 130, 246, 0.1);
}

.notifications-list { 
  display: flex; 
  flex-direction: column; 
  gap: 0.65rem; 
  overflow-y: auto; 
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  flex: 1; 
  padding-right: 2px;
}

.notification-item {
  padding: 0.85rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s;
}

:root[data-theme="dark"] .notification-item {
  background: rgba(255, 255, 255, 0.03);
}

.notification-item:hover {
  background: rgba(59, 130, 246, 0.08);
}

.notification-item.unread {
  border-left: 4px solid #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

.notif-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
}

.notif-title { 
  font-size: 0.88rem; 
  font-weight: 700; 
  color: var(--text-primary); 
}

.notif-time { 
  font-size: 0.72rem; 
  color: var(--text-secondary); 
}

.notif-message { 
  font-size: 0.82rem; 
  color: var(--text-secondary); 
  margin: 0; 
  line-height: 1.35; 
}

.empty-notif-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 0.5rem;
  padding: 3rem 1rem;
}

.empty-icon { 
  font-size: 2.5rem; 
  opacity: 0.5; 
}

.empty-txt { 
  font-size: 0.88rem; 
  color: var(--text-secondary); 
  margin: 0; 
  text-align: center; 
}

/* ============================================================================
   🖥️ DESKTOP / TABLET (>= 768px): Drawer Lateral Derecho
   ============================================================================ */
@media (min-width: 768px) {
  .drawer-backdrop {
    justify-content: flex-end;
    align-items: stretch;
  }

  .drawer-panel {
    width: 380px;
    max-width: 400px;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
    border-left: 1px solid var(--border-subtle);
    border-top: none;
    padding: 1.5rem;
    animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideLeft {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .mobile-grabber {
    display: none;
  }
}
</style>

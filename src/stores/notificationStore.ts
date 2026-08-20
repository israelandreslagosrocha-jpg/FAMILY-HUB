import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppNotification } from '../types'

export const useNotificationStore = defineStore('notificationStore', () => {
  const isDrawerOpen = ref<boolean>(false)
  const notifications = ref<AppNotification[]>([])

  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

  function openDrawer() {
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
  }

  function markAsRead(id: string) {
    const target = notifications.value.find(n => n.id === id)
    if (target) target.isRead = true
  }

  function markAllAsRead() {
    notifications.value.forEach(n => n.isRead = true)
  }

  function addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
    notifications.value.unshift({
      ...notif,
      id: `notif-${Date.now()}`,
      createdAt: 'Ahora',
      isRead: false
    })
  }

  return {
    isDrawerOpen,
    notifications,
    unreadCount,
    openDrawer,
    closeDrawer,
    markAsRead,
    markAllAsRead,
    addNotification
  }
})

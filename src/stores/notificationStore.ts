import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppNotification } from '../types'

export const useNotificationStore = defineStore('notificationStore', () => {
  const isDrawerOpen = ref<boolean>(false)
  const notifications = ref<AppNotification[]>([
    {
      id: 'notif-1',
      title: '🚨 Alerta de Presupuesto',
      message: 'La categoría Supermercado ha alcanzado el 85% del límite mensual.',
      type: 'warning',
      entityType: 'finance',
      createdAt: 'Hace 10 min',
      isRead: false
    },
    {
      id: 'notif-2',
      title: '📅 Recordatorio de Calendario',
      message: 'Evento familiar "Reunión de Colegio" programado para hoy a las 18:00.',
      type: 'info',
      entityType: 'event',
      createdAt: 'Hace 45 min',
      isRead: false
    },
    {
      id: 'notif-3',
      title: '✅ Tarea Completada',
      message: 'Mamá completó la tarea "Comprar remedios del abuelo".',
      type: 'success',
      entityType: 'task',
      createdAt: 'Hace 2 horas',
      isRead: true
    }
  ])

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

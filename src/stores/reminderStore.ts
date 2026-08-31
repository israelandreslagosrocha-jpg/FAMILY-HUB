/**
 * Store Pinia para la Gestión de Recordatorios y Alarmas en FAMILY-HUB
 */

import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { reminderService } from '../services/reminders/reminderService'
import type { ReminderItem, ScheduleReminderParams, ReminderTargetType } from '../types/reminder'

export const useReminderStore = defineStore('reminderStore', () => {
  const reminders = ref<ReminderItem[]>([])
  const isPickerModalOpen = ref<boolean>(false)
  const activeTargetForReminder = ref<{
    targetType: ReminderTargetType
    targetId?: string
    title: string
    baseDate?: string
    baseTime?: string
  } | null>(null)

  const hasNotificationPermission = ref<boolean>(false)
  const hasExactAlarmPermission = ref<boolean>(false)
  const hasSystemAlarmAvailable = ref<boolean>(false)
  const isLoading = ref<boolean>(false)

  const activeReminders = computed(() => reminders.value.filter(r => r.status === 'scheduled'))

  async function loadReminders() {
    isLoading.value = true
    try {
      reminders.value = await reminderService.getAllReminders()
      await checkPermissions()
    } finally {
      isLoading.value = false
    }
  }

  async function checkPermissions() {
    const res = await reminderService.checkPermissions()
    hasNotificationPermission.value = res.notifications
    hasExactAlarmPermission.value = !!res.exactAlarm
    hasSystemAlarmAvailable.value = res.systemAlarmAvailable
  }

  async function requestPermissions() {
    const res = await reminderService.requestPermissions()
    hasNotificationPermission.value = res.notifications
    hasExactAlarmPermission.value = !!res.exactAlarm
    return res
  }

  async function scheduleReminder(params: ScheduleReminderParams): Promise<ReminderItem> {
    const item = await reminderService.scheduleReminder(params)
    // Actualizar lista local reactiva
    const idx = reminders.value.findIndex(r => r.id === item.id)
    if (idx >= 0) {
      reminders.value[idx] = item
    } else {
      reminders.value.unshift(item)
    }
    return item
  }

  async function cancelReminder(reminderId: string): Promise<boolean> {
    const ok = await reminderService.cancelReminder(reminderId)
    if (ok) {
      const target = reminders.value.find(r => r.id === reminderId)
      if (target) target.status = 'cancelled'
    }
    return ok
  }

  function getReminderForTarget(targetType: ReminderTargetType, targetId: string): ReminderItem | undefined {
    return reminders.value.find(r => r.targetType === targetType && r.targetId === targetId && r.status === 'scheduled')
  }

  function openReminderPicker(target: {
    targetType: ReminderTargetType
    targetId?: string
    title: string
    baseDate?: string
    baseTime?: string
  }) {
    activeTargetForReminder.value = target
    isPickerModalOpen.value = true
  }

  function closeReminderPicker() {
    isPickerModalOpen.value = false
    activeTargetForReminder.value = null
  }

  onMounted(async () => {
    await loadReminders()
    await reminderService.reconcilePendingReminders()
  })

  return {
    reminders,
    activeReminders,
    isPickerModalOpen,
    activeTargetForReminder,
    hasNotificationPermission,
    hasExactAlarmPermission,
    hasSystemAlarmAvailable,
    isLoading,
    loadReminders,
    checkPermissions,
    requestPermissions,
    scheduleReminder,
    cancelReminder,
    getReminderForTarget,
    openReminderPicker,
    closeReminderPicker
  }
})

/**
 * Store Pinia para la Captura Universal por Voz en FAMILY-HUB
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { voiceService } from '../services/voice/voiceService'
import { useAuthStore } from './authStore'
import { useTaskStore } from './taskStore'
import { useCalendarStore } from './calendarStore'
import { useFinanceStore } from './financeStore'
import { useReminderStore } from './reminderStore'
import type { VoiceCaptureState, VoiceParsedResult } from '../types/voice'

export const useVoiceStore = defineStore('voiceStore', () => {
  const authStore = useAuthStore()
  const taskStore = useTaskStore()
  const calendarStore = useCalendarStore()
  const financeStore = useFinanceStore()
  const reminderStore = useReminderStore()

  const captureState = ref<VoiceCaptureState>('idle')
  const interimTranscript = ref<string>('')
  const resolvedProposal = ref<VoiceParsedResult | null>(null)
  const errorMessage = ref<string | null>(null)
  const isExecutingAction = ref<boolean>(false)

  const isListening = computed(() => captureState.value === 'listening')
  const isReviewOpen = computed(() => captureState.value === 'review' && resolvedProposal.value !== null)

  /**
   * Inicia la captura de audio por micrófono
   */
  async function startCapture() {
    errorMessage.value = null
    interimTranscript.value = ''
    resolvedProposal.value = null
    captureState.value = 'listening'

    try {
      await voiceService.startListening(
        {
          onInterim: (text) => {
            interimTranscript.value = text
          },
          onFinal: (result) => {
            resolvedProposal.value = result
            captureState.value = 'review'
          },
          onError: (err) => {
            errorMessage.value = err
            captureState.value = 'error'
          },
          onEnd: () => {
            if (captureState.value === 'listening') {
              if (interimTranscript.value) {
                // Resolver el texto parcial acumulado
                const res = voiceService.resolveText(interimTranscript.value, authStore.familyMembers)
                resolvedProposal.value = res
                captureState.value = 'review'
              } else {
                captureState.value = 'idle'
              }
            }
          }
        },
        authStore.familyMembers
      )
    } catch (err: any) {
      errorMessage.value = err.message || 'Error al acceder al micrófono'
      captureState.value = 'error'
    }
  }

  /**
   * Detiene la escucha activa y procede al procesamiento de inmediato
   */
  function stopCapture() {
    try {
      voiceService.stopListening()
    } catch {}

    // Si ya se acumuló texto parcial, resolverlo de inmediato sin esperar al navegador
    if (interimTranscript.value.trim()) {
      const res = voiceService.resolveText(interimTranscript.value.trim(), authStore.familyMembers)
      resolvedProposal.value = res
      captureState.value = 'review'
    } else {
      captureState.value = 'idle'
    }
  }

  /**
   * Cancela la sesión de captura de voz de forma sincrónica e inmediata (cero cuelgues)
   */
  function cancelCapture() {
    captureState.value = 'idle'
    interimTranscript.value = ''
    resolvedProposal.value = null
    errorMessage.value = null

    try {
      voiceService.cancelListening()
    } catch {}
  }

  /**
   * Procesa directamente un texto escrito
   */
  function processTypedText(text: string) {
    errorMessage.value = null
    interimTranscript.value = text
    const result = voiceService.resolveText(text, authStore.familyMembers)
    resolvedProposal.value = result
    captureState.value = 'review'
  }

  /**
   * Ejecuta y persiste la propuesta confirmada por el usuario llamando exclusivamente a los servicios existentes
   */
  async function confirmProposal(customEntities?: Partial<VoiceParsedResult['entities']>): Promise<boolean> {
    if (!resolvedProposal.value) return false

    isExecutingAction.value = true
    const proposal = resolvedProposal.value
    const entities = { ...proposal.entities, ...customEntities }

    try {
      if (proposal.intent === 'task.create') {
        const assignedMemberId = entities.memberId || authStore.activeMemberId || (authStore.familyMembers[0]?.id || 'm-1')
        await taskStore.addTaskWithSupabase({
          title: entities.title || 'Nueva Tarea',
          assignedMemberId,
          priority: 'media',
          dueDate: entities.date || new Date().toISOString().split('T')[0]
        })
      } else if (proposal.intent === 'calendar.event.create') {
        const memberIds = entities.memberId ? [entities.memberId] : (authStore.activeMemberId ? [authStore.activeMemberId] : ['m-1'])
        const startTimeISO = `${entities.date || new Date().toISOString().split('T')[0]}T${entities.time || '10:00'}:00`
        await calendarStore.addEventWithSupabase({
          title: entities.title || 'Nuevo Evento',
          startTime: startTimeISO,
          isAllDay: !entities.time,
          isFamilyEvent: true,
          memberIds
        })
      } else if (proposal.intent === 'finance.expense.create') {
        const idempotencyKey = `voice-exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        await financeStore.addMovement({
          type: 'expense',
          title: entities.title || 'Gasto registrado por voz',
          amount: entities.amount || 0,
          currency: 'CLP',
          scope: entities.scope === 'personal' ? 'personal' : 'family',
          categoryId: entities.categoryId || 'cat-general',
          categoryName: entities.categoryName || 'Supermercado y Alimentación',
          categoryIcon: entities.categoryIcon || '💸',
          categoryColor: entities.categoryColor || '#3b82f6',
          registeredByMemberId: authStore.activeMemberId || 'm-1',
          belongingToMemberId: entities.scope === 'personal' ? entities.memberId : undefined,
          date: entities.date || new Date().toISOString().split('T')[0],
          idempotencyKey
        })
      } else if (proposal.intent === 'finance.income.create') {
        const idempotencyKey = `voice-inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        await financeStore.addMovement({
          type: 'income',
          title: entities.title || 'Ingreso registrado por voz',
          amount: entities.amount || 0,
          currency: 'CLP',
          scope: 'family',
          categoryId: 'cat-income',
          categoryName: 'Ingresos',
          categoryIcon: '💰',
          categoryColor: '#10b981',
          registeredByMemberId: authStore.activeMemberId || 'm-1',
          date: entities.date || new Date().toISOString().split('T')[0],
          idempotencyKey
        })
      } else if (proposal.intent === 'finance.transfer.create') {
        const idempotencyKey = `voice-trf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        await financeStore.addMovement({
          type: 'transfer',
          title: `Transferencia: ${entities.sourceAccount || 'Origen'} ➔ ${entities.destinationAccount || 'Destino'}`,
          amount: entities.amount || 0,
          currency: 'CLP',
          scope: 'family',
          categoryId: 'cat-transfer',
          categoryName: 'Transferencias',
          categoryIcon: '🔄',
          categoryColor: '#8b5cf6',
          registeredByMemberId: authStore.activeMemberId || 'm-1',
          date: entities.date || new Date().toISOString().split('T')[0],
          idempotencyKey
        })
      } else if (proposal.intent === 'responsibility.create') {
        const assignedMemberId = entities.memberId || authStore.activeMemberId || 'm-1'
        await taskStore.addTaskWithSupabase({
          title: entities.title || 'Responsabilidad semanal',
          assignedMemberId,
          priority: 'media',
          dueDate: entities.date || new Date().toISOString().split('T')[0],
          recurrenceFrequency: 'weekly',
          recurrenceDaysOfWeek: entities.recurrenceDaysOfWeek || [1]
        })
      } else if (proposal.intent === 'reminder.create') {
        const scheduledTime = entities.time || '09:00'
        const scheduledAtISO = `${entities.date || new Date().toISOString().split('T')[0]}T${scheduledTime}:00`
        await reminderStore.scheduleReminder({
          targetType: entities.targetType || 'standalone',
          title: entities.title || 'Recordatorio de voz',
          scheduledAt: scheduledAtISO,
          relativeOffsetMinutes: entities.relativeOffsetMinutes
        })
      }

      cancelCapture()
      return true
    } catch (err: any) {
      errorMessage.value = `Error al guardar: ${err.message}`
      return false
    } finally {
      isExecutingAction.value = false
    }
  }

  return {
    captureState,
    interimTranscript,
    resolvedProposal,
    errorMessage,
    isExecutingAction,
    isListening,
    isReviewOpen,
    startCapture,
    stopCapture,
    cancelCapture,
    processTypedText,
    confirmProposal
  }
})

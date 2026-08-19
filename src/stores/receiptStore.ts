import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReceiptScanSession, ExtractedReceiptData } from '../types'
import { useFinanceStore } from './financeStore'

export const useReceiptStore = defineStore('receiptStore', () => {
  const financeStore = useFinanceStore()

  // Estado Principal
  const isScannerOpen = ref<boolean>(false)
  const isReviewSheetOpen = ref<boolean>(false)
  const currentSession = ref<ReceiptScanSession | null>(null)
  const savedReceipts = ref<ReceiptScanSession[]>([
    {
      id: 'rec-101',
      imagePreviewUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300',
      status: 'saved',
      extractedData: {
        merchantName: 'Supermercado Lider',
        merchantConfidence: 98,
        totalAmount: 145000,
        amountConfidence: 99,
        date: '2026-08-18',
        dateConfidence: 96,
        suggestedCategory: 'Supermercado',
        categoryConfidence: 92,
        isPossibleDuplicate: false
      },
      createdAt: '2026-08-18 18:30'
    },
    {
      id: 'rec-102',
      imagePreviewUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300',
      status: 'saved',
      extractedData: {
        merchantName: 'Farmacia Ahumada',
        merchantConfidence: 78,
        totalAmount: 12500,
        amountConfidence: 82,
        date: '2026-08-19',
        dateConfidence: 88,
        suggestedCategory: 'Salud',
        categoryConfidence: 75,
        isPossibleDuplicate: false
      },
      createdAt: '2026-08-19 09:15'
    }
  ])

  function openScanner() {
    isScannerOpen.value = true
    currentSession.value = null
  }

  function closeScanner() {
    isScannerOpen.value = false
  }

  // Simulación de los 4 Casos Reales del Ciclo de Vida OCR (7B)
  async function startScanSimulated(caseType: 'high_confidence' | 'low_confidence' | 'failed' | 'duplicate') {
    isScannerOpen.value = false

    const sessionId = `scan-${Date.now()}`
    const placeholderImage = caseType === 'duplicate' 
      ? 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300' 
      : 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300'

    // 1. Estado CAPTURING
    currentSession.value = {
      id: sessionId,
      imagePreviewUrl: placeholderImage,
      status: 'capturing',
      createdAt: new Date().toLocaleString('es-CL')
    }

    // 2. Estado UPLOADING (0.6s)
    await new Promise(r => setTimeout(r, 600))
    if (currentSession.value) currentSession.value.status = 'uploading'

    // 3. Estado PROCESSING_OCR (0.8s)
    await new Promise(r => setTimeout(r, 800))
    if (currentSession.value) currentSession.value.status = 'processing_ocr'

    await new Promise(r => setTimeout(r, 800))

    if (!currentSession.value) return

    // 4. Resultado según el Caso Simulado
    if (caseType === 'failed') {
      currentSession.value.status = 'ocr_failed'
      currentSession.value.errorMessage = 'No se pudo leer el texto de la boleta. Ingresa los datos manualmente.'
      currentSession.value.extractedData = {
        merchantName: '',
        merchantConfidence: 0,
        totalAmount: 0,
        amountConfidence: 0,
        date: new Date().toISOString().split('T')[0],
        dateConfidence: 0,
        suggestedCategory: 'Supermercado',
        categoryConfidence: 0
      }
    } else if (caseType === 'high_confidence') {
      currentSession.value.status = 'review_ready'
      currentSession.value.extractedData = {
        merchantName: 'Supermercado Jumbo',
        merchantConfidence: 98,
        totalAmount: 42990,
        amountConfidence: 99,
        date: '2026-08-18',
        dateConfidence: 96,
        suggestedCategory: 'Supermercado',
        categoryConfidence: 94,
        isPossibleDuplicate: false
      }
    } else if (caseType === 'low_confidence') {
      currentSession.value.status = 'review_ready'
      currentSession.value.extractedData = {
        merchantName: 'Farmacia Cruz Verde',
        merchantConfidence: 72,
        totalAmount: 15400,
        amountConfidence: 76,
        date: '2026-08-19',
        dateConfidence: 81,
        suggestedCategory: 'Salud',
        categoryConfidence: 70,
        isPossibleDuplicate: false
      }
    } else if (caseType === 'duplicate') {
      currentSession.value.status = 'review_ready'
      currentSession.value.extractedData = {
        merchantName: 'Supermercado Lider',
        merchantConfidence: 98,
        totalAmount: 145000,
        amountConfidence: 99,
        date: '2026-08-18',
        dateConfidence: 96,
        suggestedCategory: 'Supermercado',
        categoryConfidence: 92,
        isPossibleDuplicate: true
      }
    }

    isReviewSheetOpen.value = true
  }

  // Confirmar boleta y canalizar al contrato conceptual de create_financial_movement()
  function confirmReceipt(finalData: ExtractedReceiptData, isFamilyScope: boolean = true) {
    if (!currentSession.value) return

    currentSession.value.status = 'confirmed'

    // Integración conceptual con el motor financiero de la Etapa 6
    financeStore.addMovement({
      title: `${finalData.merchantName} (Boleta Escaneada)`,
      amount: finalData.totalAmount,
      currency: 'CLP',
      type: 'expense',
      scope: isFamilyScope ? 'family' : 'personal',
      categoryId: `cat-ocr-${Date.now()}`,
      categoryName: finalData.suggestedCategory,
      categoryIcon: '🧾',
      categoryColor: '#3b82f6',
      registeredByMemberId: 'm-1', // Papá
      date: finalData.date,
      receiptImageUrl: currentSession.value.imagePreviewUrl
    })

    currentSession.value.status = 'saved'
    savedReceipts.value.unshift({ ...currentSession.value, extractedData: finalData })

    isReviewSheetOpen.value = false
    currentSession.value = null
  }

  function cancelSession() {
    isReviewSheetOpen.value = false
    currentSession.value = null
  }

  return {
    isScannerOpen,
    isReviewSheetOpen,
    currentSession,
    savedReceipts,
    openScanner,
    closeScanner,
    startScanSimulated,
    confirmReceipt,
    cancelSession
  }
})

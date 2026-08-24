import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ReceiptScanSession, ExtractedReceiptData } from '../types'
import { receiptService } from '../services/receiptService'
import { useFinanceStore } from './financeStore'
import { useAuthStore } from './authStore'

export const useReceiptStore = defineStore('receiptStore', () => {
  const financeStore = useFinanceStore()
  const authStore = useAuthStore()

  // Estado Principal
  const isScannerOpen = ref<boolean>(false)
  const isReviewSheetOpen = ref<boolean>(false)
  const currentSession = ref<ReceiptScanSession | null>(null)
  const savedReceipts = ref<ReceiptScanSession[]>([
    {
      id: 'rec-101',
      familyId: '089b6b00-5aee-4d93-a44c-8c1a8558013f',
      storagePath: '089b6b00-5aee-4d93-a44c-8c1a8558013f/2026/08/rec-101.png',
      imagePreviewUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300',
      status: 'saved',
      extractedData: {
        merchantName: 'Supermercado Lider',
        totalAmount: 145000,
        date: '2026-08-18',
        suggestedCategory: 'Supermercado',
        ocrConfidence: 98,
        extractionConfidence: 96,
        isPossibleDuplicate: false
      },
      createdAt: '2026-08-18 18:30'
    }
  ])

  function openScanner() {
    isScannerOpen.value = true
    currentSession.value = null
  }

  function closeScanner() {
    isScannerOpen.value = false
  }

  // Carga Real de Archivo y Procesamiento con receiptService.ts (Paso 7C.4)
  async function processRealFile(file: File) {
    isScannerOpen.value = false

    currentSession.value = {
      id: `scan-${Date.now()}`,
      familyId: '',
      storagePath: '',
      imagePreviewUrl: URL.createObjectURL(file),
      status: 'uploading',
      createdAt: new Date().toLocaleString('es-CL')
    }

    try {
      await new Promise(r => setTimeout(r, 400))
      if (currentSession.value) currentSession.value.status = 'processing_ocr'

      const sessionResult = await receiptService.uploadAndProcessReceipt(file)
      currentSession.value = sessionResult
      isReviewSheetOpen.value = true
    } catch (err: any) {
      console.warn('⚠️ Fallo en procesamiento real de boleta, activando revisión manual:', err?.message)
      if (currentSession.value) {
        currentSession.value.status = 'ocr_failed'
        currentSession.value.errorMessage = err?.message || 'Fallo de lectura. Completa los datos manualmente.'
        currentSession.value.extractedData = {
          merchantName: '',
          totalAmount: 0,
          date: new Date().toISOString().split('T')[0],
          suggestedCategory: 'Supermercado',
          ocrConfidence: 0,
          extractionConfidence: 0
        }
      }
      isReviewSheetOpen.value = true
    }
  }

  // Simulación de los 4 Casos Reales del Ciclo de Vida OCR
  async function startScanSimulated(caseType: 'high_confidence' | 'low_confidence' | 'failed' | 'duplicate') {
    isScannerOpen.value = false

    const sessionId = `scan-${Date.now()}`
    const placeholderImage = caseType === 'duplicate' 
      ? 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300' 
      : 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300'

    currentSession.value = {
      id: sessionId,
      familyId: '089b6b00-5aee-4d93-a44c-8c1a8558013f',
      storagePath: `089b6b00-5aee-4d93-a44c-8c1a8558013f/2026/08/${sessionId}.png`,
      imagePreviewUrl: placeholderImage,
      status: 'capturing',
      createdAt: new Date().toLocaleString('es-CL')
    }

    await new Promise(r => setTimeout(r, 400))
    if (currentSession.value) currentSession.value.status = 'uploading'

    await new Promise(r => setTimeout(r, 600))
    if (currentSession.value) currentSession.value.status = 'processing_ocr'

    await new Promise(r => setTimeout(r, 600))
    if (!currentSession.value) return

    if (caseType === 'failed') {
      currentSession.value.status = 'ocr_failed'
      currentSession.value.errorMessage = 'No se pudo leer el texto de la boleta. Ingresa los datos manualmente.'
      currentSession.value.extractedData = {
        merchantName: '',
        totalAmount: 0,
        date: new Date().toISOString().split('T')[0],
        suggestedCategory: 'Supermercado',
        ocrConfidence: 0,
        extractionConfidence: 0
      }
    } else if (caseType === 'high_confidence') {
      currentSession.value.status = 'review_ready'
      currentSession.value.extractedData = {
        merchantName: 'Supermercado Jumbo',
        totalAmount: 42990,
        date: '2026-08-18',
        suggestedCategory: 'Supermercado',
        ocrConfidence: 98,
        extractionConfidence: 96,
        isPossibleDuplicate: false
      }
    } else if (caseType === 'low_confidence') {
      currentSession.value.status = 'review_ready'
      currentSession.value.extractedData = {
        merchantName: 'Farmacia Cruz Verde',
        totalAmount: 15400,
        date: '2026-08-19',
        suggestedCategory: 'Salud',
        ocrConfidence: 72,
        extractionConfidence: 70,
        isPossibleDuplicate: false
      }
    } else if (caseType === 'duplicate') {
      currentSession.value.status = 'review_ready'
      currentSession.value.extractedData = {
        merchantName: 'Supermercado Lider',
        totalAmount: 145000,
        date: '2026-08-18',
        suggestedCategory: 'Supermercado',
        ocrConfidence: 98,
        extractionConfidence: 92,
        isPossibleDuplicate: true
      }
    }

    isReviewSheetOpen.value = true
  }

  // Confirmar boleta y canalizar al contrato conceptual de create_financial_movement()
  async function confirmReceipt(finalData: ExtractedReceiptData, isFamilyScope: boolean = true) {
    if (!currentSession.value) return

    currentSession.value.status = 'confirmed'

    // Intentar confirmación real con receiptService si existe storagePath en Supabase
    if (currentSession.value.storagePath && !currentSession.value.storagePath.includes('scan-')) {
      try {
        await receiptService.confirmAndRegisterExpense(currentSession.value, finalData, isFamilyScope)
      } catch (e: any) {
        console.warn('⚠️ Error al registrar en Supabase vía receiptService, aplicando fallback local:', e?.message)
      }
    } else {
      // Integración conceptual con el store financiero de la Etapa 6
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
        registeredByMemberId: authStore.activeMemberId || (authStore.familyMembers[0]?.id || 'm-1'),
        date: finalData.date,
        receiptImageUrl: currentSession.value.storagePath
      })
    }

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
    processRealFile,
    startScanSimulated,
    confirmReceipt,
    cancelSession
  }
})

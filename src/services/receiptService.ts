import { supabase } from './supabaseClient'
import { storageService } from './storageService'
import { ocrEngine } from './ocrEngine'
import { receiptParser } from './receiptParser'
import { categoryResolver } from './categoryResolver'
import { financeService } from './financeService'
import type { ReceiptScanSession, ExtractedReceiptData } from '../types'

/**
 * Servicio Orquestador de Boletas y Captura OCR (ETAPA 7C.4)
 * Integra los servicios desacoplados storageService, ocrEngine, receiptParser y categoryResolver.
 */
export const receiptService = {
  /**
   * Procesa la captura completa:
   * 1. Obtiene family_id del contexto de autenticación activo (nunca confía en input UI).
   * 2. Suba a Supabase Storage 'receipts' en path inmutable ({family_id}/{YYYY}/{MM}/{uuid}.{ext}).
   * 3. Genera URL firmada temporal para la interfaz visual.
   * 4. Ejecuta OCR en Web Worker con Tesseract.js Wasm.
   * 5. Ejecuta Parser de texto con confianzas diferenciadas (ocrConfidence vs extractionConfidence).
   * 6. Resuelve categoría sugerida contra las categorías reales de Supabase.
   * 7. Detecta posible duplicado en la base de datos de gastos.
   */
  async uploadAndProcessReceipt(file: File | Blob): Promise<ReceiptScanSession> {
    // 1. Obtener usuario y family_id del contexto autenticado activo
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('Usuario no autenticado para procesar boletas')
    }

    const { data: members } = await supabase.from('family_members').select('*')
    const familyId = members && members.length > 0 ? members[0].family_id : null
    if (!familyId) {
      throw new Error('No se encontró una familia activa para el usuario autenticado')
    }

    // 2. Subida inmutable a Supabase Storage receipts (upsert = false)
    const storagePath = await storageService.uploadReceiptFile(file, familyId, 'png')

    // 3. Generar URL firmada temporal para la interfaz visual
    const imagePreviewUrl = await storageService.getSignedUrl(storagePath, 3600)

    // 4. Ejecutar Reconocimiento OCR en Tesseract.js (Client-side / Web Worker)
    const { rawText, ocrConfidence } = await ocrEngine.recognizeReceiptText(file)

    // 5. Analizar texto y extraer datos estructurados
    const parsedData = receiptParser.parseReceiptText(rawText, ocrConfidence)

    // 6. Resolver categoría contra categorías reales de la familia en Supabase
    const resolvedCat = await categoryResolver.resolveCategoryForMerchant(
      parsedData.merchantName,
      familyId
    )

    parsedData.suggestedCategoryId = resolvedCat.suggestedCategoryId
    parsedData.suggestedCategory = resolvedCat.suggestedCategoryName

    // 7. Chequeo preventivo de duplicidad en la tabla de gastos
    if (parsedData.totalAmount > 0 && parsedData.merchantName) {
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('family_id', familyId)
        .eq('amount', parsedData.totalAmount)
        .limit(1)

      if (existingExpenses && existingExpenses.length > 0) {
        parsedData.isPossibleDuplicate = true
      }
    }

    return {
      id: `session-${Date.now()}`,
      familyId,
      storagePath,        // Fuente de verdad persistente
      imagePreviewUrl,    // Estado temporal de previsualización en UI
      status: 'review_ready',
      extractedData: parsedData,
      createdAt: new Date().toISOString()
    }
  },

  /**
   * Invocación final tras la confirmación táctil del usuario ("Human-in-the-Loop").
   * Delega a financeService.createMovement() reutilizando la RPC transaccional create_financial_movement().
   */
  async confirmAndRegisterExpense(
    session: ReceiptScanSession,
    finalData: ExtractedReceiptData,
    isFamilyScope: boolean,
    belongingToMemberId?: string
  ) {
    if (!session.storagePath) {
      throw new Error('La sesión de boleta no cuenta con un storagePath válido')
    }

    // Obtener categoría de la familia si no viene en finalData
    let validCategoryId = finalData.suggestedCategoryId || session.extractedData?.suggestedCategoryId
    if (!validCategoryId) {
      const { data: cats } = await supabase.from('categories').select('id').limit(1)
      if (cats && cats.length > 0) validCategoryId = cats[0].id
    }

    // Canalización estricta al canal único financiero de la Etapa 6
    return await financeService.createMovement({
      movementType: 'expense',
      title: `${finalData.merchantName} (Boleta Escaneada)`,
      amount: finalData.totalAmount,
      categoryId: validCategoryId,
      isFamilyScope,
      belongingToMemberId: isFamilyScope ? undefined : belongingToMemberId,
      date: finalData.date,
      receiptImageUrl: session.storagePath // Guarda el storagePath inmutable en BD
    })
  }
}

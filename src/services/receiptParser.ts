import type { ExtractedReceiptData } from '../types'

/**
 * Parser desacoplado de Texto OCR a Datos Estructurados de Boletas
 */
export const receiptParser = {
  /**
   * Analiza el texto bruto devuelto por Tesseract.js e identifica Comercio, Monto Total y Fecha.
   * Calcula independientemente el extractionConfidence (certeza del parser sobre el Total).
   */
  parseReceiptText(rawText: string, ocrConfidence: number): ExtractedReceiptData {
    if (!rawText.trim()) {
      return {
        merchantName: '',
        totalAmount: 0,
        date: new Date().toISOString().split('T')[0],
        suggestedCategory: 'Supermercado',
        ocrConfidence: 0,
        extractionConfidence: 0,
        isPossibleDuplicate: false
      }
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

    // 1. Detección del Comercio (Línea inicial relevante)
    let merchantName = lines[0] || 'Comercio General'
    if (merchantName.toLowerCase().includes('jumbo')) merchantName = 'Supermercado Jumbo'
    else if (merchantName.toLowerCase().includes('lider')) merchantName = 'Supermercado Lider'
    else if (merchantName.toLowerCase().includes('ahumada')) merchantName = 'Farmacia Ahumada'
    else if (merchantName.toLowerCase().includes('cruz verde')) merchantName = 'Farmacia Cruz Verde'
    else if (merchantName.toLowerCase().includes('copec')) merchantName = 'Copec Combustibles'

    // 2. Extracción del Monto Total mediante expresiones regulares
    let totalAmount = 0
    let extractionConfidence = 40 // Confianza base por defecto

    // Buscar patrones "$ 42.990", "TOTAL 42990", "TOTAL $42.990"
    const totalRegex = /(?:total|monto|pagar|monto total)[^\d$]*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{3,7})/i
    const matchTotal = rawText.match(totalRegex)

    if (matchTotal && matchTotal[1]) {
      const cleanNum = matchTotal[1].replace(/\./g, '')
      totalAmount = parseInt(cleanNum, 10)
      extractionConfidence = 95 // Alta confianza cuando coincide con palabra "TOTAL"
    } else {
      // Búsqueda secundaria de montos numéricos grandes en el texto
      const amountMatches = rawText.match(/\$?\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,6})/g)
      if (amountMatches && amountMatches.length > 0) {
        const parsedAmounts = amountMatches
          .map(m => parseInt(m.replace(/[^\d]/g, ''), 10))
          .filter(n => !isNaN(n) && n > 100 && n < 10000000)
        
        if (parsedAmounts.length > 0) {
          totalAmount = Math.max(...parsedAmounts)
          extractionConfidence = 70 // Confianza media si se deduce como el valor máximo
        }
      }
    }

    // 3. Extracción de Fecha (formatos DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    let date = new Date().toISOString().split('T')[0]
    const dateRegex = /(\d{2})[-/.](\d{2})[-/.](20\d{2}|\d{2})/
    const matchDate = rawText.match(dateRegex)

    if (matchDate) {
      const day = matchDate[1].padStart(2, '0')
      const month = matchDate[2].padStart(2, '0')
      const year = matchDate[3].length === 2 ? `20${matchDate[3]}` : matchDate[3]
      date = `${year}-${month}-${day}`
    }

    return {
      merchantName,
      totalAmount,
      date,
      suggestedCategory: 'Supermercado',
      ocrConfidence: Math.max(0, Math.min(100, ocrConfidence)),
      extractionConfidence: Math.max(0, Math.min(100, extractionConfidence)),
      isPossibleDuplicate: false
    }
  }
}

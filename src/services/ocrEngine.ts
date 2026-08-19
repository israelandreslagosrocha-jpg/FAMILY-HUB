import { createWorker } from 'tesseract.js'

export interface OCRRawResult {
  rawText: string
  ocrConfidence: number // 0-100% (Reconocimiento del motor Wasm)
}

/**
 * Motor desacoplado de Reconocimiento OCR usando Tesseract.js (Client-side / Web Worker)
 */
export const ocrEngine = {
  /**
   * Reconoce texto e impresiones en una imagen de comprobante en un Web Worker.
   */
  async recognizeReceiptText(imageInput: Blob | File | string): Promise<OCRRawResult> {
    try {
      const worker = await createWorker('spa') // Idioma Español para boletas chilenas/latam
      const ret = await worker.recognize(imageInput)
      await worker.terminate()

      const rawText = ret.data.text || ''
      const ocrConfidence = Math.round(ret.data.confidence || 0)

      return {
        rawText,
        ocrConfidence
      }
    } catch (err: any) {
      console.warn('⚠️ Motor Tesseract.js falló o no pudo procesar la imagen:', err?.message || err)
      // Fallback gracioso para no bloquear el flujo del usuario
      return {
        rawText: '',
        ocrConfidence: 0
      }
    }
  }
}

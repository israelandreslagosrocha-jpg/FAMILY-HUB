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
  async recognizeReceiptText(imageInput: Blob | File | string | Buffer): Promise<OCRRawResult> {
    let worker: any = null
    try {
      let processableInput: any = imageInput

      // Convertir Blob/File a Buffer en entornos Node/Vite si es necesario
      if (typeof Blob !== 'undefined' && imageInput instanceof Blob && typeof (imageInput as any).arrayBuffer === 'function') {
        const arrayBuf = await imageInput.arrayBuffer()
        processableInput = Buffer.from(arrayBuf)
      }

      worker = await createWorker('spa') // Idioma Español para boletas chilenas/latam
      const ret = await worker.recognize(processableInput)
      await worker.terminate()

      const rawText = ret.data.text || ''
      const ocrConfidence = Math.round(ret.data.confidence || 0)

      return {
        rawText: rawText || '',
        ocrConfidence: ocrConfidence || 0
      }
    } catch (err: any) {
      if (worker) {
        try { await worker.terminate() } catch {}
      }
      console.warn('⚠️ Error en motor OCR Tesseract:', err?.message || err)
      return {
        rawText: '',
        ocrConfidence: 0
      }
    }
  }
}

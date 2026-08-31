import { createWorker } from 'tesseract.js'

export interface OCRRawResult {
  rawText: string
  ocrConfidence: number // 0-100% (Reconocimiento del motor Wasm)
}

/**
 * Preprocesa una imagen en un canvas HTML para optimizar el OCR:
 * - Escala a resolución óptima (~1600px max) para reducir uso de memoria RAM en móviles.
 * - Aplica filtro de escala de grises y aumento de contraste para mejorar la nitidez del texto impreso.
 */
async function preprocessImageForOCR(imageInput: Blob | File | string): Promise<string | Blob | File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return imageInput
  }

  try {
    const imageUrl = typeof imageInput === 'string' 
      ? imageInput 
      : URL.createObjectURL(imageInput)

    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para preprocesamiento'))
      img.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return imageInput

    // Redimensionar si es muy grande (máx 1600px en el lado mayor)
    const MAX_DIM = 1600
    let width = img.width
    let height = img.height

    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width)
        width = MAX_DIM
      } else {
        width = Math.round((width * MAX_DIM) / height)
        height = MAX_DIM
      }
    }

    canvas.width = width
    canvas.height = height

    // Dibujar imagen escalada
    ctx.drawImage(img, 0, 0, width, height)

    // Aplicar filtro de escala de grises y contraste para facilitar la lectura de boletas térmicas
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    for (let i = 0; i < data.length; i += 4) {
      // Luminancia estándar (Rec. 601)
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      
      // Aumento de contraste (curva S suave)
      const contrastFactor = 1.3
      const adjusted = Math.min(255, Math.max(0, ((gray - 128) * contrastFactor) + 128))

      data[i] = adjusted     // R
      data[i + 1] = adjusted // G
      data[i + 2] = adjusted // B
    }

    ctx.putImageData(imgData, 0, 0)

    // Retornar Data URL optimizado
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch (err) {
    console.warn('⚠️ Fallback a imagen original sin preprocesamiento:', err)
    return imageInput
  }
}

/**
 * Motor desacoplado de Reconocimiento OCR usando Tesseract.js (Client-side / Web Worker)
 */
export const ocrEngine = {
  /**
   * Reconoce texto e impresiones en una imagen de comprobante en un Web Worker.
   */
  async recognizeReceiptText(imageInput: Blob | File | string): Promise<OCRRawResult> {
    let worker: any = null
    try {
      // 1. Preprocesar imagen en canvas para máxima precisión y menor consumo de memoria
      const optimizedInput = await preprocessImageForOCR(imageInput)

      // 2. Inicializar worker de Tesseract (Español)
      worker = await createWorker('spa')
      
      // 3. Reconocer texto
      const ret = await worker.recognize(optimizedInput)
      await worker.terminate()

      const rawText = ret.data.text || ''
      const ocrConfidence = Math.round(ret.data.confidence || 0)

      return {
        rawText: rawText.trim(),
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

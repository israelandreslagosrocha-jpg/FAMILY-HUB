/**
 * Adaptador Web Speech API para FAMILY-HUB
 * Implementa reconocimiento de voz en navegador con soporte en runtime para processLocally (on-device) y fallback seguro.
 */

import type { SpeechAdapterInterface } from '../../../types/voice'

export class WebSpeechAdapter implements SpeechAdapterInterface {
  private recognition: any = null
  private isListeningActive = false

  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  async isLocalAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const instance = new SpeechRecognitionConstructor()
      // Detección en runtime de la propiedad experimental processLocally (MDN reference)
      return typeof instance.processLocally !== 'undefined'
    } catch {
      return false
    }
  }

  async startListening(options: {
    lang?: string
    continuous?: boolean
    interimResults?: boolean
    onResult: (transcript: string, isFinal: boolean) => void
    onError: (error: string) => void
    onEnd: () => void
  }): Promise<void> {
    if (!this.isSupported()) {
      options.onError('El reconocimiento de voz no está soportado en este navegador.')
      return
    }

    try {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.recognition = new SpeechRecognitionConstructor()

      // 1. Configurar idioma: Preferir es-CL, fallback a es-ES
      this.recognition.lang = options.lang || 'es-CL'
      this.recognition.continuous = options.continuous ?? false
      this.recognition.interimResults = options.interimResults ?? true

      // 2. Detección segura de procesamiento local si está disponible en el navegador
      if ('processLocally' in this.recognition) {
        try {
          this.recognition.processLocally = true
        } catch {
          // Ignorar silenciosamente si no es modificable en este entorno
        }
      }

      this.recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            finalTranscript += item[0].transcript
          } else {
            interimTranscript += item[0].transcript
          }
        }

        if (finalTranscript) {
          options.onResult(finalTranscript.trim(), true)
        } else if (interimTranscript) {
          options.onResult(interimTranscript.trim(), false)
        }
      }

      this.recognition.onerror = (event: any) => {
        let errMsg = 'Error en el reconocimiento de voz.'
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          errMsg = 'Permiso de micrófono denegado. Por favor permite el acceso al micrófono.'
        } else if (event.error === 'no-speech') {
          errMsg = 'No se detectó sonido. Intenta hablar nuevamente.'
        } else if (event.error === 'network') {
          errMsg = 'Error de conexión en el reconocimiento de voz.'
        }
        this.isListeningActive = false
        options.onError(errMsg)
      }

      this.recognition.onend = () => {
        this.isListeningActive = false
        options.onEnd()
      }

      this.isListeningActive = true
      this.recognition.start()
    } catch (err: any) {
      this.isListeningActive = false
      options.onError(err.message || 'No se pudo iniciar el micrófono.')
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListeningActive) {
      try {
        this.recognition.stop()
      } catch {}
      this.isListeningActive = false
    }
  }

  cancelListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {}
      this.isListeningActive = false
    }
  }
}

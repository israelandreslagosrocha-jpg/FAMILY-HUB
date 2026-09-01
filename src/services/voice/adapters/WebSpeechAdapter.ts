/**
 * Adaptador Web Speech API para FAMILY-HUB
 * Implementa reconocimiento de voz en navegador ultra-resiliente:
 * - Desbloqueo y comprobación de permisos con getUserMedia
 * - Watchdog timer anti-cuelgues
 * - Sin forzado de flags experimentales bloqueantes (processLocally)
 * - Cierre sincrónico e instantáneo
 */

import type { SpeechAdapterInterface } from '../../../types/voice'

export class WebSpeechAdapter implements SpeechAdapterInterface {
  private recognition: any = null
  private isListeningActive = false
  private watchdogTimeout: any = null

  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  async isLocalAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const instance = new SpeechRecognitionConstructor()
      return typeof instance.processLocally !== 'undefined'
    } catch {
      return false
    }
  }

  private clearWatchdog() {
    if (this.watchdogTimeout) {
      clearTimeout(this.watchdogTimeout)
      this.watchdogTimeout = null
    }
  }

  private resetWatchdog(onTimeout: () => void) {
    this.clearWatchdog()
    // Si no hay actividad de voz en 7 segundos, finaliza de forma segura sin congelar
    this.watchdogTimeout = setTimeout(() => {
      if (this.isListeningActive) {
        console.warn('⏱️ WebSpeechAdapter: Watchdog timeout (sin actividad detectada)')
        this.stopListening()
        onTimeout()
      }
    }, 7000)
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

    // 1. Pre-flight de micrófono con getUserMedia (despierta el hardware de audio en iOS y valida permisos sin congelar)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Liberar las pistas inmediatamente para que SpeechRecognition tome el control exclusivo
        stream.getTracks().forEach(track => track.stop())
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          this.isListeningActive = false
          options.onError('Permiso de micrófono denegado. Por favor permite el acceso en los ajustes de tu navegador o teléfono.')
          return
        }
        console.warn('⚠️ Advertencia en verificación de micrófono:', err.message)
      }
    }

    try {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      this.recognition = new SpeechRecognitionConstructor()

      this.recognition.lang = options.lang || 'es-CL'
      this.recognition.continuous = options.continuous ?? false
      this.recognition.interimResults = options.interimResults ?? true

      // Iniciar el watchdog de seguridad
      this.resetWatchdog(() => {
        options.onEnd()
      })

      this.recognition.onresult = (event: any) => {
        // Reiniciar watchdog en cada detección de sonido/palabra
        this.resetWatchdog(() => {
          options.onEnd()
        })

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
        this.clearWatchdog()
        this.isListeningActive = false

        // Si el usuario canceló voluntariamente (abort), no mostrar como error
        if (event.error === 'aborted') {
          return
        }

        let errMsg = 'Error en el reconocimiento de voz.'
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          errMsg = 'Permiso de micrófono denegado. Por favor permite el acceso al micrófono.'
        } else if (event.error === 'no-speech') {
          errMsg = 'No se detectó sonido. Habla más cerca del micrófono o escribe tu mensaje.'
        } else if (event.error === 'network') {
          errMsg = 'Error de conexión en el reconocimiento de voz.'
        } else if (event.error === 'audio-capture') {
          errMsg = 'No se encontró ningún micrófono disponible.'
        }

        options.onError(errMsg)
      }

      this.recognition.onend = () => {
        this.clearWatchdog()
        this.isListeningActive = false
        options.onEnd()
      }

      this.isListeningActive = true
      this.recognition.start()
    } catch (err: any) {
      this.clearWatchdog()
      this.isListeningActive = false
      options.onError(err.message || 'No se pudo iniciar el micrófono.')
    }
  }

  stopListening(): void {
    this.clearWatchdog()
    if (this.recognition && this.isListeningActive) {
      try {
        this.recognition.stop()
      } catch {}
      this.isListeningActive = false
    }
  }

  cancelListening(): void {
    this.clearWatchdog()
    if (this.recognition) {
      try {
        // Desactivar listeners para ignorar callbacks residuales asíncronos
        this.recognition.onresult = null
        this.recognition.onerror = null
        this.recognition.onend = null
        this.recognition.abort()
      } catch {}
      this.recognition = null
    }
    this.isListeningActive = false
  }
}

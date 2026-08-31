/**
 * Servicio Central de Voz para FAMILY-HUB
 * Orquesta la captura de micrófono, adaptadores y resolución determinista de intenciones.
 * REGLA: Nunca ejecuta mutaciones a base de datos de forma directa; siempre produce propuestas validadas.
 */

import { WebSpeechAdapter } from './adapters/WebSpeechAdapter'
import { NativeSpeechAdapter } from './adapters/NativeSpeechAdapter'
import { voiceIntentResolver } from './voiceIntentResolver'
import type { SpeechAdapterInterface, VoiceParsedResult } from '../../types/voice'
import type { FamilyMember } from '../../types'

export class VoiceService {
  private adapter: SpeechAdapterInterface

  constructor() {
    // Si estamos en entorno nativo Capacitor, usamos NativeSpeechAdapter; de lo contrario, WebSpeechAdapter
    const native = new NativeSpeechAdapter()
    if (native.isSupported()) {
      this.adapter = native
    } else {
      this.adapter = new WebSpeechAdapter()
    }
  }

  isSupported(): boolean {
    return this.adapter.isSupported()
  }

  async isLocalAvailable(): Promise<boolean> {
    return await this.adapter.isLocalAvailable()
  }

  /**
   * Inicia la captura de voz con callbacks de progreso
   */
  async startListening(callbacks: {
    onInterim: (text: string) => void
    onFinal: (result: VoiceParsedResult) => void
    onError: (err: string) => void
    onEnd: () => void
  }, members: FamilyMember[] = []): Promise<void> {
    await this.adapter.startListening({
      lang: 'es-CL',
      interimResults: true,
      onResult: (transcript: string, isFinal: boolean) => {
        if (isFinal) {
          const resolved = voiceIntentResolver.resolve(transcript, members)
          callbacks.onFinal(resolved)
        } else {
          callbacks.onInterim(transcript)
        }
      },
      onError: (err: string) => {
        callbacks.onError(err)
      },
      onEnd: () => {
        callbacks.onEnd()
      }
    })
  }

  stopListening(): void {
    this.adapter.stopListening()
  }

  cancelListening(): void {
    this.adapter.cancelListening()
  }

  /**
   * Permite resolver directamente un texto escrito sin usar el micrófono
   */
  resolveText(text: string, members: FamilyMember[] = []): VoiceParsedResult {
    return voiceIntentResolver.resolve(text, members)
  }
}

export const voiceService = new VoiceService()

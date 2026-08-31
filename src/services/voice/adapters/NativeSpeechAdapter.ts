/**
 * Adaptador de Voz Nativo para FAMILY-HUB (Capacitor Speech Recognition)
 * Diseñado con Progressive Enhancement: no rompe compilación en Web ni exige dependencias nativas si se ejecuta en browser.
 */

import type { SpeechAdapterInterface } from '../../../types/voice'

export class NativeSpeechAdapter implements SpeechAdapterInterface {
  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return !!(window as any).Capacitor?.isNativePlatform?.() && !!(window as any).SpeechRecognition
  }

  async isLocalAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const plugin = (window as any).Capacitor?.Plugins?.SpeechRecognition
      if (plugin?.isOnDeviceRecognitionAvailable) {
        const res = await plugin.isOnDeviceRecognitionAvailable()
        return !!res.available
      }
      return false
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
      options.onError('Reconocimiento nativo no disponible en esta plataforma.')
      return
    }

    try {
      const plugin = (window as any).Capacitor?.Plugins?.SpeechRecognition
      const hasPermission = await plugin.checkPermissions()
      if (hasPermission.speechRecognition !== 'granted') {
        const req = await plugin.requestPermissions()
        if (req.speechRecognition !== 'granted') {
          options.onError('Permiso de micrófono nativo denegado.')
          return
        }
      }

      await plugin.start({
        language: options.lang || 'es-CL',
        maxResults: 1,
        prompt: 'Habla tu instrucción para FAMILY-HUB',
        partialResults: options.interimResults ?? true,
        popup: false
      })

      // Escuchar eventos si el plugin nativo expone listeners
      plugin.addListener?.('partialResults', (data: any) => {
        if (data.matches && data.matches.length > 0) {
          options.onResult(data.matches[0], false)
        }
      })
    } catch (err: any) {
      options.onError(err.message || 'Error al iniciar reconocimiento de voz nativo.')
    }
  }

  stopListening(): void {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.SpeechRecognition
      plugin?.stop?.()
    } catch {}
  }

  cancelListening(): void {
    try {
      const plugin = (window as any).Capacitor?.Plugins?.SpeechRecognition
      plugin?.stop?.()
    } catch {}
  }
}

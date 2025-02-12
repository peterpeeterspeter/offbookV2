import { DailyProvider } from '@daily-co/daily-react'
import Daily, { DailyCall, DailyEvent, DailyInputSettings } from '@daily-co/daily-js'

interface DailyServiceConfig {
  url: string
  token?: string
  userName: string
  audioConfig?: MediaTrackConstraints
}

interface DailyServiceError extends Error {
  code: string
  details?: unknown
}

export class DailyService {
  private daily: DailyCall | null = null
  private retryCount = 0
  private maxRetries = 3

  async initialize(config: DailyServiceConfig): Promise<void> {
    if (this.daily) {
      throw this.createError('ALREADY_INITIALIZED', 'Daily.co service is already initialized')
    }

    try {
      // Validate configuration
      if (!config.url) throw this.createError('INVALID_CONFIG', 'URL is required')
      if (!config.userName) throw this.createError('INVALID_CONFIG', 'Username is required')

      // Create call object with audio only
      this.daily = Daily.createCallObject({
        audioSource: true,
        videoSource: false
      })

      if (!this.daily) {
        throw this.createError('INITIALIZATION_FAILED', 'Failed to create Daily call object')
      }

      // Join the call with retry logic
      await this.joinWithRetry(config)

      // Apply audio constraints if provided
      if (config.audioConfig) {
        await this.configureAudio(config.audioConfig)
      }

      // Reset retry count on successful initialization
      this.retryCount = 0
    } catch (error) {
      this.destroy()
      throw this.handleError(error)
    }
  }

  private async joinWithRetry(config: DailyServiceConfig): Promise<void> {
    while (this.retryCount < this.maxRetries) {
      try {
        const joinConfig = {
          url: config.url,
          userName: config.userName
        }
        if (config.token) {
          Object.assign(joinConfig, { token: config.token })
        }
        await this.daily?.join(joinConfig)
        return
      } catch (error) {
        this.retryCount++
        if (this.retryCount >= this.maxRetries) {
          throw this.createError(
            'JOIN_FAILED',
            `Failed to join call after ${this.maxRetries} attempts`
          )
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, this.retryCount) * 1000))
      }
    }
  }

  private async configureAudio(audioConfig: MediaTrackConstraints): Promise<void> {
    try {
      const audioTrack = await navigator.mediaDevices.getUserMedia({
        audio: audioConfig
      })

      if (!this.daily) throw this.createError('NOT_INITIALIZED', 'Daily service not initialized')

      const deviceId = audioTrack.getAudioTracks()[0]?.getSettings()?.deviceId
      if (!deviceId) throw this.createError('AUDIO_CONFIG_FAILED', 'Failed to get audio device ID')

      // Set input devices using the correct Daily.co API method
      await this.daily.setInputDevicesAsync({
        audioDeviceId: deviceId,
        videoDeviceId: null
      })
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async setAudioEnabled(enabled: boolean): Promise<boolean> {
    if (!this.daily) {
      throw this.createError('NOT_INITIALIZED', 'Daily.co service is not initialized')
    }

    try {
      await this.daily.setLocalAudio(enabled)
      return enabled
    } catch (error) {
      throw this.handleError(error)
    }
  }

  destroy(): void {
    if (this.daily) {
      try {
        this.daily.destroy()
      } catch (error) {
        console.error('Error destroying Daily.co instance:', this.handleError(error))
      }
      this.daily = null
      this.retryCount = 0
    }
  }

  private createError(code: string, message: string, details?: unknown): DailyServiceError {
    const error = new Error(message) as DailyServiceError
    error.code = code
    if (details) error.details = details
    return error
  }

  private handleError(error: unknown): DailyServiceError {
    if (error instanceof Error) {
      return this.createError(
        'DAILY_ERROR',
        error.message,
        error
      )
    }
    return this.createError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      error
    )
  }
}

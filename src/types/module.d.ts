declare module '@tabler/icons-react' {
  import { ComponentType, SVGProps } from 'react'
  export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
  export const IconMicrophone: IconComponent
  export const IconMicrophoneOff: IconComponent
  export const IconDevices: IconComponent
  export const IconVolume: IconComponent
  export const IconVolumeOff: IconComponent
  export const IconChevronDown: IconComponent
  export const IconChevronUp: IconComponent
  // Add other icons as needed
}

declare module 'next-themes/dist/types' {
  export interface UseThemeProps {
    themes: string[]
    setTheme: (theme: string) => void
    theme?: string
    systemTheme?: string
    forcedTheme?: string
    resolvedTheme?: string
    isSystemTheme: boolean
  }
}

declare module '@/components/ui/use-toast' {
  export interface ToastProps {
    id: string
    title?: string
    description?: string
    action?: React.ReactNode
    duration?: number
    variant?: 'default' | 'destructive'
  }

  export interface ToastActionElement {
    altText: string
    onClick: () => void
    children: React.ReactNode
  }

  export function useToast(): {
    toast: (props: ToastProps) => void
    dismiss: (toastId?: string) => void
    toasts: ToastProps[]
  }
}

declare module '@/lib/api' {
  export interface ApiResponse<T> {
    data?: T
    error?: string
    status: number
  }

  export function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>
}

declare module '@/lib/hooks/use-scripts' {
  import { Script } from '@/types'

  export function useScripts(): {
    scripts: Script[]
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
  }
}

declare module '@/lib/constants/voices' {
  export interface Voice {
    id: string
    name: string
    language: string
    gender: string
    preview?: string
  }

  export const voices: Voice[]
}

declare module '@/lib/stt/use-speech-recognition' {
  export interface SpeechRecognitionHook {
    transcript: string
    listening: boolean
    error: Error | null
    start: () => void
    stop: () => void
    reset: () => void
  }

  export function useSpeechRecognition(): SpeechRecognitionHook
}

declare module '@/lib/tts/use-tts' {
  export interface TTSHook {
    speak: (text: string, options?: TTSOptions) => Promise<void>
    stop: () => void
    pause: () => void
    resume: () => void
    speaking: boolean
    paused: boolean
    error: Error | null
  }

  export interface TTSOptions {
    voice?: string
    rate?: number
    pitch?: number
    volume?: number
  }

  export function useTTS(): TTSHook
}

declare module '@/lib/tts/elevenlabs-types' {
  export interface Voice {
    id: string
    name: string
    preview_url: string
    settings?: VoiceSettings
  }

  export interface VoiceSettings {
    stability: number
    similarity_boost: number
  }
}

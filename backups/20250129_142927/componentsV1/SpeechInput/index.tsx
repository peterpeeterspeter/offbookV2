import React, { useState, useCallback, useEffect, useRef } from 'react'
import { startRecording, stopRecording } from '../../services/whisper'
import { VAD } from '../../services/vad'
import type { WhisperResponse, WhisperError } from '../../services/whisper'

interface SpeechInputProps {
  onTranscriptionComplete: (text: string) => void
  onError: (error: string) => void
  className?: string
  vadOptions?: {
    threshold?: number
    silenceTimeout?: number
    maxSilentFrames?: number
  }
}

export const SpeechInput: React.FC<SpeechInputProps> = ({
  onTranscriptionComplete,
  onError,
  className,
  vadOptions = {}
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const vadRef = useRef<VAD | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize VAD
  useEffect(() => {
    vadRef.current = new VAD({
      threshold: vadOptions.threshold,
      silenceTimeout: vadOptions.silenceTimeout,
      maxSilentFrames: vadOptions.maxSilentFrames,
      onSpeechStart: () => setIsSpeaking(true),
      onSpeechEnd: () => setIsSpeaking(false)
    })

    return () => {
      if (vadRef.current) {
        vadRef.current.stop()
      }
    }
  }, [vadOptions])

  // Draw audio visualization
  useEffect(() => {
    if (!isRecording || !canvasRef.current || !vadRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = vadRef.current.getAnalyser()
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    const barWidth = (canvasWidth / dataArray.length) * 2.5
    let animationFrame: number

    const draw = () => {
      animationFrame = requestAnimationFrame(draw)
      
      analyser.getByteFrequencyData(dataArray)
      
      ctx.fillStyle = 'rgb(20, 20, 20)'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      
      let x = 0
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvasHeight

        const gradient = ctx.createLinearGradient(0, canvasHeight, 0, 0)
        gradient.addColorStop(0, isSpeaking ? '#3B82F6' : '#9CA3AF')
        gradient.addColorStop(1, isSpeaking ? '#60A5FA' : '#D1D5DB')
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight)
        
        x += barWidth + 1
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [isRecording, isSpeaking])

  // Handle transcription complete event
  useEffect(() => {
    const handleTranscriptionComplete = (event: CustomEvent<WhisperResponse | WhisperError>) => {
      const result = event.detail
      if ('error' in result) {
        onError(result.error)
      } else {
        onTranscriptionComplete(result.text)
      }
    }

    document.addEventListener('transcription_complete', handleTranscriptionComplete as EventListener)
    return () => {
      document.removeEventListener('transcription_complete', handleTranscriptionComplete as EventListener)
    }
  }, [onTranscriptionComplete, onError])

  // Start recording
  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Start VAD
      if (vadRef.current) {
        await vadRef.current.start(stream)
      }
      
      // Start recording
      const recorder = await startRecording()
      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to start recording')
    }
  }, [onError])

  // Stop recording
  const handleStopRecording = useCallback(() => {
    if (mediaRecorder) {
      stopRecording(mediaRecorder)
      setMediaRecorder(null)
      setIsRecording(false)
    }
    if (vadRef.current) {
      vadRef.current.stop()
    }
    setIsSpeaking(false)
  }, [mediaRecorder])

  return (
    <div className={`flex flex-col items-start gap-4 ${className || ''}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`px-4 py-2 rounded-full font-medium transition-colors ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Stop Recording
            </div>
          ) : (
            'Start Recording'
          )}
        </button>
        {isRecording && (
          <div className="text-sm text-gray-600">
            {isSpeaking ? 'Speech detected' : 'Waiting for speech...'}
          </div>
        )}
      </div>
      
      {isRecording && (
        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          className="w-full h-24 rounded bg-gray-900"
        />
      )}
    </div>
  )
} 
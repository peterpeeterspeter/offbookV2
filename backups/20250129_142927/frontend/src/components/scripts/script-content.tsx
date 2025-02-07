"use client"

import { cn } from "@/lib/utils"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react"
import { useGenerateSpeech } from "@/lib/hooks/use-scripts"
import { characterVoices, emotionVoiceSettings, defaultVoiceSettings } from "@/lib/constants/voices"
import { useToast } from "@/components/ui/use-toast"

interface Line {
  id: string
  character: string
  text: string
  emotion?: string
  timing?: number
}

interface ScriptContentProps {
  lines: Line[]
  currentLine?: string
  onLineSelect?: (lineId: string) => void
  characterColors: Record<string, string>
}

export function ScriptContent({
  lines,
  currentLine,
  onLineSelect,
  characterColors
}: ScriptContentProps) {
  const [playingLineId, setPlayingLineId] = useState<string | null>(null)
  const [loadingLineId, setLoadingLineId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()
  const generateSpeech = useGenerateSpeech()

  const getVoiceSettings = (line: Line) => {
    const baseSettings = { ...defaultVoiceSettings }
    
    if (line.emotion && emotionVoiceSettings[line.emotion]) {
      return {
        ...baseSettings,
        ...emotionVoiceSettings[line.emotion]
      }
    }
    
    return baseSettings
  }

  const handlePlayLine = async (line: Line) => {
    try {
      if (playingLineId === line.id) {
        audioRef.current?.pause()
        setPlayingLineId(null)
        return
      }

      setLoadingLineId(line.id)
      const voiceId = characterVoices[line.character] || characterVoices.default
      const voiceSettings = getVoiceSettings(line)
      
      const result = await generateSpeech.mutateAsync({
        text: line.text,
        voiceId,
        ...voiceSettings
      })

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const audio = new Audio(result.audioUrl)
      audio.volume = isMuted ? 0 : volume
      audioRef.current = audio
      await audio.play()

      setPlayingLineId(line.id)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error playing line",
        description: error instanceof Error ? error.message : "Failed to generate speech"
      })
    } finally {
      setLoadingLineId(null)
    }
  }

  const handleVolumeToggle = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
      } else {
        audioRef.current.volume = 0
      }
    }
    setIsMuted(!isMuted)
  }

  return (
    <div className="space-y-4 p-4">
      {lines.map((line) => (
        <div
          key={line.id}
          className={cn(
            "p-3 rounded-lg transition-colors",
            currentLine === line.id && "bg-accent"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: characterColors[line.character] }}
            >
              {line.character}
            </span>
            {line.emotion && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {line.emotion}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handlePlayLine(line)}
                disabled={loadingLineId === line.id}
              >
                {loadingLineId === line.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : playingLineId === line.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleVolumeToggle}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              {line.timing && (
                <span className="text-xs text-muted-foreground">
                  {line.timing}s
                </span>
              )}
            </div>
          </div>
          <p 
            className="text-sm leading-relaxed cursor-pointer"
            onClick={() => onLineSelect?.(line.id)}
          >
            {line.text}
          </p>
        </div>
      ))}
    </div>
  )
} 
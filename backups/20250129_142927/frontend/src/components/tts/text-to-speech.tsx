import React, { useState } from 'react';
import { useTTS } from '@/lib/tts/use-tts';
import { TTSOptions, Voice, VoiceSettings } from '@/lib/tts/elevenlabs-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Play, Square } from 'lucide-react';

interface TextToSpeechProps {
  apiKey: string;
  className?: string;
  defaultText?: string;
  defaultOptions?: TTSOptions;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({
  apiKey,
  className,
  defaultText = '',
  defaultOptions,
  onStart,
  onComplete,
  onError,
}) => {
  const { toast } = useToast();
  const [text, setText] = useState(defaultText);
  const [options, setOptions] = useState<TTSOptions>(defaultOptions ?? {});

  const {
    isLoading,
    isPlaying,
    error,
    progress,
    currentText,
    voices,
    isLoadingVoices,
    speak,
    stop,
  } = useTTS({
    apiKey,
    defaultOptions,
    onStart,
    onComplete,
    onError: (error) => {
      toast({
        title: 'TTS Error',
        description: error.message,
        variant: 'destructive',
      });
      onError?.(error);
    },
  });

  const handleVoiceChange = (voiceId: string) => {
    const voice = voices?.find((v: Voice) => v.voice_id === voiceId);
    if (voice) {
      setOptions(prev => ({
        ...prev,
        voice: voiceId,
        settings: voice.settings,
      }));
    }
  };

  const handleSettingChange = (
    key: keyof VoiceSettings,
    value: number | boolean
  ) => {
    setOptions(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  const handleSpeak = () => {
    if (!text.trim()) return;
    speak({ text, options });
  };

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Text to Speech</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={isPlaying ? 'destructive' : 'default'}
              size="icon"
              onClick={isPlaying ? stop : handleSpeak}
              disabled={isLoading || !text.trim()}
            >
              {isPlaying ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            className="w-full h-24 p-2 border rounded-md resize-none"
            placeholder="Enter text to speak..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading || isPlaying}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Voice</label>
            <Select
              value={options.voice}
              onValueChange={handleVoiceChange}
              disabled={isLoading || isPlaying || isLoadingVoices}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices?.map((voice: Voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stability</label>
              <Slider
                value={[options.settings?.stability ?? 0.5]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([value]: [number]) => handleSettingChange('stability', value)}
                disabled={isLoading || isPlaying}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Similarity Boost</label>
              <Slider
                value={[options.settings?.similarity_boost ?? 0.75]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([value]: [number]) => handleSettingChange('similarity_boost', value)}
                disabled={isLoading || isPlaying}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Style</label>
              <Slider
                value={[options.settings?.style ?? 0.5]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([value]: [number]) => handleSettingChange('style', value)}
                disabled={isLoading || isPlaying}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Speaker Boost</label>
              <Switch
                checked={options.settings?.use_speaker_boost ?? true}
                onCheckedChange={(checked: boolean) => handleSettingChange('use_speaker_boost', checked)}
                disabled={isLoading || isPlaying}
              />
            </div>
          </div>

          {(isLoading || isPlaying) && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {isLoading ? 'Generating speech...' : `Speaking: ${currentText}`}
              </div>
              <Progress value={progress * 100} />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}; 
import React, { useState } from 'react';
import { useSpeechRecognition } from '@/lib/stt/use-speech-recognition';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, Pause, Play, Trash } from 'lucide-react';

interface SpeechRecognitionProps {
  apiKey: string;
  className?: string;
  maxDuration?: number;
  language?: string;
  realtime?: boolean;
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
}

export const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  apiKey,
  className,
  maxDuration = 300,
  language,
  realtime = false,
  onTranscription,
  onError,
}) => {
  const { toast } = useToast();
  const [text, setText] = useState('');

  const {
    isRecording,
    isPaused,
    isProcessing,
    error,
    text: transcription,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clear,
  } = useSpeechRecognition({
    apiKey,
    maxDuration,
    language,
    realtime,
    onError: (error) => {
      toast({
        title: 'Speech Recognition Error',
        description: error.message,
        variant: 'destructive',
      });
      onError?.(error);
    },
  });

  // Update text when transcription changes
  React.useEffect(() => {
    if (transcription) {
      setText(prev => prev + (prev ? ' ' : '') + transcription);
      onTranscription?.(transcription);
    }
  }, [transcription, onTranscription]);

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Speech Recognition</h3>
          <div className="flex items-center space-x-2">
            {isRecording ? (
              <>
                {isPaused ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resumeRecording}
                    disabled={isProcessing}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={pauseRecording}
                    disabled={isProcessing}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={stopRecording}
                  disabled={isProcessing}
                >
                  <MicOff className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="icon"
                onClick={startRecording}
                disabled={isProcessing}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setText('');
                clear();
              }}
              disabled={isProcessing || (!text && !transcription)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            className="w-full h-48 p-2 border rounded-md resize-none"
            placeholder="Transcribed text will appear here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isProcessing}
          />

          {(isRecording || isProcessing) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {isProcessing ? 'Processing...' : isPaused ? 'Paused' : 'Recording...'}
                </span>
                <span>{Math.floor(duration)}s</span>
              </div>
              <Progress value={(duration / maxDuration) * 100} />
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
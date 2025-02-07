"use client"

import React, { useState, useEffect } from 'react';
import { PracticeSession } from '@/components/practice/practice-session';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { ScrollText, Loader2, Share2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDaily } from '@/lib/webrtc/use-daily';
import { useTTS } from '@/lib/tts/use-tts';
import { saveScript, Script } from '@/lib/db/supabase-client';
import { useRealtime } from '@/lib/db/use-realtime';

interface ApiKeyResponse {
  openai: string;
  deepseek: string;
  elevenlabs: string;
}

export default function PracticePage() {
  const [script, setScript] = useState('');
  const [roomUrl, setRoomUrl] = useState('');
  const [scriptId, setScriptId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch API keys
  const { data: apiKeys, isLoading: isLoadingKeys, error: keysError } = useQuery<ApiKeyResponse>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await fetch('/api/keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      return response.json();
    },
  });

  // WebRTC integration
  const {
    isLoading: isLoadingCall,
    error: callError,
    isInCall,
    audioLevel,
    joinCall,
    leaveCall,
  } = useDaily({
    onJoined: () => {
      toast({
        title: 'Joined Practice Room',
        description: 'You are now connected to the practice room.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Text-to-speech integration
  const {
    isLoading: isLoadingTTS,
    error: ttsError,
    generateSpeech,
    playAudio,
    stopAudio,
  } = useTTS({
    apiKey: apiKeys?.elevenlabs || '',
    onComplete: (audio) => {
      playAudio(audio);
    },
    onError: (error) => {
      toast({
        title: 'TTS Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save script mutation
  const { mutate: saveScriptMutation } = useMutation({
    mutationFn: async (scriptData: Partial<Script>) => {
      return saveScript(scriptData);
    },
    onSuccess: (savedScript) => {
      setScriptId(savedScript.id);
      toast({
        title: 'Script Saved',
        description: 'Your script has been saved successfully.',
      });
      // Create a practice room
      createPracticeRoom(savedScript.id);
    },
    onError: (error) => {
      toast({
        title: 'Save Error',
        description: 'Failed to save script.',
        variant: 'destructive',
      });
    },
  });

  // Realtime subscriptions
  useRealtime({
    scriptId: scriptId || '',
    onScriptUpdate: (updatedScript) => {
      if (updatedScript.content !== script) {
        setScript(updatedScript.content);
        toast({
          title: 'Script Updated',
          description: 'The script has been updated by another user.',
        });
      }
    },
    onAnalysisUpdate: (analysis) => {
      toast({
        title: 'Analysis Updated',
        description: 'New script analysis is available.',
      });
    },
    onPerformanceUpdate: (performance) => {
      toast({
        title: 'New Performance',
        description: 'A new performance has been recorded.',
      });
    },
  });

  // Create practice room
  const createPracticeRoom = async (scriptId: string) => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId }),
      });
      
      if (!response.ok) throw new Error('Failed to create room');
      
      const { url } = await response.json();
      setRoomUrl(url);
    } catch (error) {
      toast({
        title: 'Room Creation Error',
        description: 'Failed to create practice room.',
        variant: 'destructive',
      });
    }
  };

  const handleStartPractice = () => {
    if (!script.trim()) {
      toast({
        title: 'Empty Script',
        description: 'Please enter a script to practice.',
        variant: 'destructive',
      });
      return;
    }

    if (!apiKeys) {
      toast({
        title: 'API Keys Missing',
        description: 'Please configure your API keys.',
        variant: 'destructive',
      });
      return;
    }

    // Save script and create room
    saveScriptMutation({
      title: 'Untitled Script',
      content: script,
      is_public: false,
    });
  };

  const handleJoinRoom = async () => {
    if (roomUrl) {
      await joinCall(roomUrl);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Practice Session</h1>
        <div className="flex items-center gap-4">
          {roomUrl && (
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(roomUrl);
                toast({
                  title: 'Room Link Copied',
                  description: 'Share this link with others to practice together.',
                });
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Room
            </Button>
          )}
          <Button
            onClick={isInCall ? leaveCall : handleStartPractice}
            disabled={isLoadingKeys || isLoadingCall || (!script.trim() && !isInCall)}
            variant={isInCall ? 'destructive' : 'default'}
          >
            {isLoadingKeys || isLoadingCall ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ScrollText className="h-4 w-4" />
            )}
            {isInCall ? 'Leave Room' : 'Start Practice'}
          </Button>
        </div>
      </div>

      {(keysError || callError || ttsError) && (
        <Card className="p-6 bg-destructive/10 text-destructive">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>
            {keysError instanceof Error
              ? keysError.message
              : callError instanceof Error
              ? callError.message
              : ttsError instanceof Error
              ? ttsError.message
              : 'An unknown error occurred'}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Enter Your Script</h2>
          <Textarea
            placeholder="Paste or type your script here..."
            value={script}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScript(e.target.value)}
            className="min-h-[200px]"
            disabled={isLoadingKeys || isInCall}
          />
        </Card>

        {script.trim() && apiKeys && (
          <PracticeSession
            apiKey={apiKeys.openai}
            script={script}
            onAnalysis={(analysis) => {
              toast({
                title: 'Analysis Complete',
                description: 'Your script has been analyzed successfully.',
              });
              // Generate TTS for the script
              generateSpeech({
                text: script,
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                  style: 1,
                  use_speaker_boost: true,
                },
              });
            }}
            onTranscription={(text) => {
              toast({
                title: 'Transcription Complete',
                description: 'Your performance has been transcribed.',
              });
            }}
          />
        )}
      </div>
    </div>
  );
} 
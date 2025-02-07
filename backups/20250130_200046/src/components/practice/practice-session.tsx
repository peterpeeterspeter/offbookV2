import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpeechRecognition } from '@/components/stt/speech-recognition';
import { ScriptAnalysis } from '@/components/llm/script-analysis';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ScriptAnalysis as ScriptAnalysisType } from '@/lib/llm/deepseek-types';
import { CheckSquare, Mic, ScrollText } from 'lucide-react';

interface PracticeSessionProps {
  apiKey: string;
  script: string;
  className?: string;
  onAnalysis?: (analysis: ScriptAnalysisType) => void;
  onTranscription?: (text: string) => void;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  apiKey,
  script,
  className,
  onAnalysis,
  onTranscription,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('script');
  const [recordedText, setRecordedText] = useState('');
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysisType | null>(null);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<ScriptAnalysisType | null>(null);

  const handleScriptAnalysis = (analysis: ScriptAnalysisType) => {
    setScriptAnalysis(analysis);
    onAnalysis?.(analysis);
  };

  const handleTranscription = (text: string) => {
    setRecordedText(text);
    onTranscription?.(text);
  };

  const comparePerformance = async () => {
    if (!recordedText || !scriptAnalysis) {
      toast({
        title: 'Cannot Compare',
        description: 'Please record your performance and analyze the script first.',
        variant: 'destructive',
      });
      return;
    }

    setActiveTab('comparison');
  };

  return (
    <Card className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="script" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Script
          </TabsTrigger>
          <TabsTrigger value="practice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Compare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="space-y-4">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Script Analysis</h3>
            <div className="mb-4">
              <h4 className="font-medium mb-2">Script Text</h4>
              <div className="p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap text-sm">{script}</pre>
              </div>
            </div>
            <ScriptAnalysis
              apiKey={apiKey}
              script={script}
              onAnalysis={handleScriptAnalysis}
            />
          </div>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Practice Session</h3>
            <div className="mb-4">
              <h4 className="font-medium mb-2">Reference Script</h4>
              <div className="p-4 bg-muted rounded-md">
                <pre className="whitespace-pre-wrap text-sm">{script}</pre>
              </div>
            </div>
            <SpeechRecognition
              apiKey={apiKey}
              onTranscription={handleTranscription}
            />
            {recordedText && (
              <Button
                className="mt-4"
                onClick={comparePerformance}
                disabled={!scriptAnalysis}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Compare with Script
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Original Script</h4>
                <div className="p-4 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">{script}</pre>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Your Performance</h4>
                <div className="p-4 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">{recordedText}</pre>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-4">Script Analysis</h4>
                {scriptAnalysis && (
                  <div className="space-y-4">
                    <section>
                      <h5 className="text-sm font-medium mb-2">Emotions</h5>
                      {scriptAnalysis.emotions.map((emotion, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{emotion.name}</span>: {emotion.description}
                        </div>
                      ))}
                    </section>
                    <section>
                      <h5 className="text-sm font-medium mb-2">Pacing</h5>
                      <div className="text-sm">Speed: {scriptAnalysis.pacing.speed}</div>
                    </section>
                    <section>
                      <h5 className="text-sm font-medium mb-2">Technical Notes</h5>
                      <ul className="list-disc list-inside text-sm">
                        {scriptAnalysis.technicalNotes.emphasis.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-4">Performance Analysis</h4>
                <ScriptAnalysis
                  apiKey={apiKey}
                  script={recordedText}
                  onAnalysis={setPerformanceAnalysis}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}; 
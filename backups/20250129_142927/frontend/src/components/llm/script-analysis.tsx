import React from 'react';
import { useScriptAnalysis } from '@/lib/llm/use-script-analysis';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

interface ScriptAnalysisProps {
  apiKey: string;
  script: string;
  className?: string;
  onAnalysis?: (analysis: any) => void;
}

export const ScriptAnalysis: React.FC<ScriptAnalysisProps> = ({
  apiKey,
  script,
  className,
  onAnalysis,
}) => {
  const { toast } = useToast();
  
  const {
    isAnalyzing,
    error,
    analysis,
    analyze,
  } = useScriptAnalysis({
    apiKey,
    onSuccess: (analysis) => {
      toast({
        title: 'Analysis Complete',
        description: 'Script analysis has been completed successfully.',
      });
      onAnalysis?.(analysis);
    },
    onError: (error) => {
      toast({
        title: 'Analysis Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAnalyze = () => {
    if (script.trim()) {
      analyze(script);
    } else {
      toast({
        title: 'Empty Script',
        description: 'Please provide a script to analyze.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Script Analysis</h3>
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !script.trim()}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>

        {isAnalyzing && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Analyzing script...
            </div>
            <Progress value={undefined} />
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            {error.message}
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            {/* Emotions */}
            <section>
              <h4 className="font-medium mb-2">Emotions</h4>
              <div className="grid gap-4">
                {analysis.emotions.map((emotion, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{emotion.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {emotion.intensity}%
                      </span>
                    </div>
                    <Progress value={emotion.intensity} />
                    <p className="text-sm text-muted-foreground">
                      {emotion.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Pacing */}
            <section>
              <h4 className="font-medium mb-2">Pacing</h4>
              <div className="space-y-2">
                <div className="text-sm">Speed: {analysis.pacing.speed}</div>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.pacing.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Characterization */}
            <section>
              <h4 className="font-medium mb-2">Characterization</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Tone: </span>
                  <span className="text-sm text-muted-foreground">
                    {analysis.characterization.tone}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Subtext: </span>
                  <span className="text-sm text-muted-foreground">
                    {analysis.characterization.subtext}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">Motivation: </span>
                  <span className="text-sm text-muted-foreground">
                    {analysis.characterization.motivation}
                  </span>
                </div>
              </div>
            </section>

            {/* Technical Notes */}
            <section>
              <h4 className="font-medium mb-2">Technical Notes</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium mb-1">Emphasis</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.technicalNotes.emphasis.map((note, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-medium mb-1">Pauses</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.technicalNotes.pauses.map((note, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-medium mb-1">Dynamics</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.technicalNotes.dynamics.map((note, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </Card>
  );
}; 
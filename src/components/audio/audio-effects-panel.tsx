import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { AudioEffectsConfig } from "@/lib/audio/types";

interface AudioEffectsPanelProps {
  isProcessing: boolean;
  onToggleProcessing: () => void;
  onUpdateEffects: (effects: Partial<AudioEffectsConfig>) => void;
  effects: AudioEffectsConfig;
}

export function AudioEffectsPanel({
  isProcessing,
  onToggleProcessing,
  onUpdateEffects,
  effects,
}: AudioEffectsPanelProps) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Gain</Label>
          <Slider
            value={[effects.gain]}
            min={0}
            max={2}
            step={0.1}
            onValueChange={([value]) => onUpdateEffects({ gain: value })}
          />
        </div>

        <div className="space-y-4">
          <Label>Echo</Label>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Delay Time</Label>
            <Slider
              value={[effects.echo.delay]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([value]) =>
                onUpdateEffects({
                  echo: { ...effects.echo, delay: value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Feedback</Label>
            <Slider
              value={[effects.echo.feedback]}
              min={0}
              max={0.9}
              step={0.05}
              onValueChange={([value]) =>
                onUpdateEffects({
                  echo: { ...effects.echo, feedback: value },
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reverb</Label>
          <Slider
            value={[effects.reverb]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={([value]) => onUpdateEffects({ reverb: value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

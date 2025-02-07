import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AudioEffectsConfig } from '@/lib/webrtc/audio-processor';
import { cn } from '@/lib/utils';

interface AudioEffectsPanelProps {
  effects: Partial<AudioEffectsConfig>;
  onEffectChange: (key: keyof AudioEffectsConfig, value: number | boolean) => void;
  className?: string;
}

export const AudioEffectsPanel: React.FC<AudioEffectsPanelProps> = ({
  effects,
  onEffectChange,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <Tabs defaultValue="eq">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="eq">EQ</TabsTrigger>
          <TabsTrigger value="dynamics">Dynamics</TabsTrigger>
          <TabsTrigger value="reverb">Reverb</TabsTrigger>
          <TabsTrigger value="delay">Delay</TabsTrigger>
        </TabsList>

        <TabsContent value="eq" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Low</Label>
              <Slider
                value={[effects.lowGain ?? 0]}
                min={-12}
                max={12}
                step={1}
                onValueChange={([value]) => onEffectChange('lowGain', value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Mid</Label>
              <Slider
                value={[effects.midGain ?? 0]}
                min={-12}
                max={12}
                step={1}
                onValueChange={([value]) => onEffectChange('midGain', value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">High</Label>
              <Slider
                value={[effects.highGain ?? 0]}
                min={-12}
                max={12}
                step={1}
                onValueChange={([value]) => onEffectChange('highGain', value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dynamics" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Threshold</Label>
              <Slider
                value={[effects.threshold ?? -24]}
                min={-60}
                max={0}
                step={1}
                onValueChange={([value]) => onEffectChange('threshold', value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ratio</Label>
              <Slider
                value={[effects.ratio ?? 12]}
                min={1}
                max={20}
                step={0.5}
                onValueChange={([value]) => onEffectChange('ratio', value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reverb" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Reverb</Label>
            <Switch
              checked={effects.reverbEnabled}
              onCheckedChange={(checked) => onEffectChange('reverbEnabled', checked)}
            />
          </div>
          {effects.reverbEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Mix</Label>
                <Slider
                  value={[effects.reverbMix ?? 0.3]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([value]) => onEffectChange('reverbMix', value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Decay</Label>
                <Slider
                  value={[effects.reverbDecay ?? 2.0]}
                  min={0.1}
                  max={10}
                  step={0.1}
                  onValueChange={([value]) => onEffectChange('reverbDecay', value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pre-Delay</Label>
                <Slider
                  value={[effects.reverbPreDelay ?? 0.1]}
                  min={0}
                  max={0.5}
                  step={0.01}
                  onValueChange={([value]) => onEffectChange('reverbPreDelay', value)}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="delay" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Enable Delay</Label>
            <Switch
              checked={effects.delayEnabled}
              onCheckedChange={(checked) => onEffectChange('delayEnabled', checked)}
            />
          </div>
          {effects.delayEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Mix</Label>
                <Slider
                  value={[effects.delayMix ?? 0.3]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([value]) => onEffectChange('delayMix', value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Time</Label>
                <Slider
                  value={[effects.delayTime ?? 0.25]}
                  min={0.05}
                  max={1}
                  step={0.05}
                  onValueChange={([value]) => onEffectChange('delayTime', value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Feedback</Label>
                <Slider
                  value={[effects.delayFeedback ?? 0.3]}
                  min={0}
                  max={0.9}
                  step={0.01}
                  onValueChange={([value]) => onEffectChange('delayFeedback', value)}
                />
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Stereo Enhancement</Label>
              <Switch
                checked={effects.stereoEnabled}
                onCheckedChange={(checked) => onEffectChange('stereoEnabled', checked)}
              />
            </div>
            {effects.stereoEnabled && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs">Width</Label>
                <Slider
                  value={[effects.stereoWidth ?? 0.5]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([value]) => onEffectChange('stereoWidth', value)}
                />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 
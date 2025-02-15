import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmotionIntensity = 0 | 0.25 | 0.5 | 0.75 | 1;

interface EmotionProfile {
  [emotion: string]: EmotionIntensity;
}

interface Character {
  name: string;
  lines: number;
  emotions: EmotionProfile;
}

interface Scene {
  number: number;
  duration: number;
  characters: string[];
}

interface Complexity {
  vocabulary: number;
  emotionalRange: number;
  dialogueIntensity: number;
}

export interface ScriptAnalysis {
  characters: Character[];
  scenes: Scene[];
  complexity: Complexity;
}

interface ScriptAnalysisProps {
  analysis: ScriptAnalysis;
}

export function ScriptAnalysis({ analysis }: ScriptAnalysisProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Characters</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.characters.map((character) => (
              <li key={character.name} className="flex justify-between">
                <span>{character.name}</span>
                <span className="text-muted-foreground">
                  {character.lines} lines
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.scenes.map((scene) => (
              <li key={scene.number} className="flex justify-between">
                <span>Scene {scene.number}</span>
                <span className="text-muted-foreground">
                  {Math.round(scene.duration / 60)}m {scene.duration % 60}s
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complexity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Vocabulary</span>
              <span className="text-muted-foreground">
                {analysis.complexity.vocabulary}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Emotional Range</span>
              <span className="text-muted-foreground">
                {analysis.complexity.emotionalRange}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Dialogue Intensity</span>
              <span className="text-muted-foreground">
                {analysis.complexity.dialogueIntensity}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

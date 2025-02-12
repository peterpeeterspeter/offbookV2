export interface Line {
  id: string;
  character: string;
  text: string;
  emotion: string;
  timing: number;
  confidence: number;
}

export interface ScriptContentProps {
  lines: Line[];
  characterColors: Record<string, string>;
  onLineSelect: (line: Line) => void;
}

export interface EmotionIndicatorProps {
  emotion: string;
  confidence: number;
}

export interface CharacterBadgeProps {
  character: string;
  color: string;
}

export interface ScriptNavigationProps {
  scenes: Scene[];
  currentSceneId: string;
  onSceneSelect: (sceneId: string) => void;
}

export interface Scene {
  id: string;
  title: string;
  lines: Line[];
}

export interface ScriptUploadProps {
  onScriptLoad: (scenes: Scene[]) => void;
  onError: (error: Error) => void;
}

export interface ScriptAnalysisResult {
  scenes: Scene[];
  characters: string[];
  emotions: Record<string, number>;
  timing: {
    totalDuration: number;
    averageLineTime: number;
  };
}

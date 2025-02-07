export interface Line {
  text: string;
  lineNumber: number;
  emotion?: string;
  direction?: string;
  speaker: string;
  isUserLine: boolean;
}

export interface Role {
  id: string;
  name: string;
  type: 'main' | 'supporting' | 'extra';
  lines: number;
  scenes: string[];
  voiceId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  metadata?: {
    age?: string;
    gender?: string;
    personality?: string[];
    relationships?: Record<string, string>;
  };
}

export interface Scene {
  id: string;
  title: string;
  description?: string;
  roles: string[];
  characters: string[];
  startLine: number;
  endLine: number;
  metadata?: {
    location?: string;
    time?: string;
    mood?: string;
  };
}

export interface Note {
  id: string;
  lineNumber: number;
  text: string;
  type: 'cue' | 'emotion' | 'direction';
  createdAt: string;
}

export interface Script {
  id: string;
  title: string;
  description?: string;
  roles: Role[];
  scenes: Scene[];
  content: string;
  metadata: {
    author?: string;
    version?: string;
    lastModified: Date;
  };
}

export type LineHighlightType = 'current' | 'upcoming' | 'completed' | 'flagged';

export interface LineHighlight {
  lineId: string;
  type: LineHighlightType;
  note: string;
  emotion: string;
  intensity: number;
}

export interface LineProgress {
  lineId: string;
  attempts: number;
  bestAccuracy: number;
  lastAttempt: Date;
  notes: Array<{
    text: string;
    timestamp: Date;
    type: 'system' | 'user';
  }>;
}

export interface DeepSeekAnalysis {
  roles: Array<{
    name: string;
    characterDescription: string;
    characteristics: string[];
    lineCount: number;
  }>;
  scenes: Array<{
    number: number;
    title: string;
    description: string;
    location: string;
    startLine: number;
    endLine: number;
    characters: string[];
  }>;
  emotions: Record<number, string>;
  directions: Record<number, string>;
  dialogueMap: Record<number, {
    speaker: string;
    text: string;
    emotion?: string;
    direction?: string;
  }>;
}

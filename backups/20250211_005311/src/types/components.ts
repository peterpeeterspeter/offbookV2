import type { LucideProps } from "lucide-react";
import type { RefAttributes } from "react";

export interface Line {
  id: string;
  character: string;
  text: string;
  emotion: string;
  timing: number;
}

export type IconComponent = React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
>;

export interface TeleprompterProps {
  lines: Line[];
  currentLine: string | null;
  onLineComplete: (lineId: string) => void;
  getCharacterColor: (character: string) => string;
  autoScroll?: boolean;
  scrollSpeed?: number;
  testMode?: boolean;
  disableAnimations?: boolean;
}

export interface ScriptContentProps {
  lines: Line[];
  currentLine?: string | null;
  onLineSelect: (lineId: string) => void;
  characterColors: Record<string, string>;
  testMode?: boolean;
  disableAnimations?: boolean;
}

// Re-export audio types that components need
export type {
  AudioServiceState,
  AudioServiceError,
  AudioErrorCategory,
  AudioErrorDetails,
  AudioServiceEvent
} from './audio';

// Re-export emotion types
export type Emotion =
  | 'joy'
  | 'surprise'
  | 'anger'
  | 'fear'
  | 'sadness'
  | 'disgust'
  | 'neutral';

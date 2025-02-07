import { ScriptLine } from './script-display';
interface PracticeModeManagerProps {
    mode: string;
    currentLine: ScriptLine;
    onTimeExpired?: () => void;
    onMemoryPhaseChange?: (isMemoryPhase: boolean) => void;
    className?: string;
}
export declare function PracticeModeManager({ mode, currentLine, onTimeExpired, onMemoryPhaseChange, className }: PracticeModeManagerProps): import("react/jsx-runtime").JSX.Element;
export {};

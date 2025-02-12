import * as React from "react";
interface Line {
    id: string;
    character: string;
    text: string;
    emotion: string;
    timing: number;
}
interface TeleprompterProps {
    lines: Line[];
    currentLine?: string;
    onLineComplete: (lineId: string) => void;
    getCharacterColor: (character: string) => string;
    autoScroll?: boolean;
    scrollSpeed?: number;
    testMode?: boolean;
    disableAnimations?: boolean;
}
export declare function Teleprompter({ lines, currentLine, onLineComplete, getCharacterColor, autoScroll, scrollSpeed, testMode, disableAnimations, }: TeleprompterProps): React.JSX.Element;
export {};

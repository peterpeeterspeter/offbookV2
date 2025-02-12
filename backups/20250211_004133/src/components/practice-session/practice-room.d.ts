import React from 'react';
interface PracticeRoomProps {
    roomUrl: string;
    userName: string;
    onAudioData?: (audioData: Float32Array) => void;
}
export declare function PracticeRoom({ roomUrl, userName, onAudioData }: PracticeRoomProps): React.JSX.Element;
export {};

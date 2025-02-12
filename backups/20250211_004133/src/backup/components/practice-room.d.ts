import React from 'react';
interface PracticeRoomProps {
    userName: string;
    onError?: (error: Error) => void;
}
export declare function PracticeRoom({ userName, onError }: PracticeRoomProps): React.JSX.Element;
export {};

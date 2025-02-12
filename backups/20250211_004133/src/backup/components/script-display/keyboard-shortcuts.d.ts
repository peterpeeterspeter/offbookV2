import React from 'react';
interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}
export declare function KeyboardShortcuts({ isOpen, onClose, className }: KeyboardShortcutsProps): React.JSX.Element | null;
export {};

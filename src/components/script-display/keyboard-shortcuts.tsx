import React from 'react';
import { cn } from '../../lib/utils';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    key: string;
    description: string;
  }[];
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: '↑', description: 'Previous line' },
      { key: '↓', description: 'Next line' },
      { key: 'Space', description: 'Complete current line' },
    ]
  },
  {
    title: 'Annotations',
    shortcuts: [
      { key: 'N', description: 'Add note to current line' },
      { key: 'Esc', description: 'Cancel note' },
    ]
  },
  {
    title: 'Practice Modes',
    shortcuts: [
      { key: '1-4', description: 'Switch practice mode' },
      { key: 'T', description: 'Toggle timer' },
      { key: 'H', description: 'Hide/show next lines' },
    ]
  }
];

export function KeyboardShortcuts({
  isOpen,
  onClose,
  className
}: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          'bg-white rounded-lg shadow-xl w-full max-w-lg p-6',
          'transform transition-all',
          className
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((group, index) => (
            <div key={index}>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <div
                    key={shortcutIndex}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500">
            Tip: Press <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">?</kbd> anytime to show/hide shortcuts
          </p>
        </div>
      </div>
    </div>
  );
} 


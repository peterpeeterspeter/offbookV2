import { useRef, useEffect, useCallback } from 'react';
import { useAccessibility } from '../providers/AccessibilityProvider';

interface UseKeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
}

export const useKeyboardNavigation = (options: UseKeyboardNavigationOptions) => {
  const { registerKeyboardShortcut } = useAccessibility();

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const registerHandler = (
      key: string,
      handler: () => void,
      options?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
    ) => {
      const cleanup = registerKeyboardShortcut(key, (e: KeyboardEvent) => {
        e.preventDefault();
        handler();
      }, options);
      if (cleanup) cleanups.push(cleanup);
    };

    if (options.onArrowUp) {
      registerHandler('ArrowUp', options.onArrowUp);
    }

    if (options.onArrowDown) {
      registerHandler('ArrowDown', options.onArrowDown);
    }

    if (options.onArrowLeft) {
      registerHandler('ArrowLeft', options.onArrowLeft);
    }

    if (options.onArrowRight) {
      registerHandler('ArrowRight', options.onArrowRight);
    }

    if (options.onEnter) {
      registerHandler('Enter', options.onEnter);
    }

    if (options.onEscape) {
      registerHandler('Escape', options.onEscape);
    }

    if (options.onSpace) {
      registerHandler(' ', options.onSpace);
    }

    if (options.onTab) {
      registerHandler('Tab', options.onTab);
    }

    if (options.onShiftTab) {
      registerHandler('Tab', options.onShiftTab, { shift: true });
    }

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [registerKeyboardShortcut, options]);
};

interface UseFocusTrapOptions {
  enabled?: boolean;
  onEscape?: () => void;
}

export const useFocusTrap = (options: UseFocusTrapOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const { enabled = true } = options;

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        options.onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      // Focus first element when trap is enabled
      getFocusableElements()[0]?.focus();
    }

    return () => {
      container?.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, getFocusableElements, options]);

  return containerRef;
};

interface UseAnnouncementOptions {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export const useAnnouncement = (options: UseAnnouncementOptions) => {
  const { announce } = useAccessibility();
  const { message, priority = 'polite', delay = 0 } = options;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      announce(message, priority);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [announce, message, priority, delay]);
};

interface UseLiveRegionOptions {
  id: string;
  initialContent?: string;
  priority?: 'polite' | 'assertive';
}

export const useLiveRegion = (options: UseLiveRegionOptions) => {
  const { setLiveRegion } = useAccessibility();
  const { id, initialContent = '', priority = 'polite' } = options;

  const updateContent = useCallback((content: string) => {
    setLiveRegion(id, content, priority);
  }, [id, priority, setLiveRegion]);

  useEffect(() => {
    if (initialContent) {
      updateContent(initialContent);
    }
  }, [initialContent, updateContent]);

  return updateContent;
};

export const usePreferredReducedMotion = () => {
  const { preferences } = useAccessibility();
  return preferences.reduceMotion;
};

export const usePreferredHighContrast = () => {
  const { preferences } = useAccessibility();
  return preferences.highContrast;
};

export const usePreferredLargeText = () => {
  const { preferences } = useAccessibility();
  return preferences.largeText;
};

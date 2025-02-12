import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

interface FocusState {
  activeId: string | null;
  history: string[];
}

interface AccessibilityContextType {
  // Focus Management
  focusState: FocusState;
  setFocus: (id: string) => void;
  returnFocus: () => void;
  registerFocusable: (
    id: string,
    ref: React.RefObject<HTMLElement>
  ) => () => void;

  // Screen Reader
  announce: (message: string, priority?: "polite" | "assertive") => void;

  // Keyboard Navigation
  registerKeyboardShortcut: (
    key: string,
    callback: (event: KeyboardEvent) => void,
    options?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
  ) => () => void;

  // ARIA Live Regions
  setLiveRegion: (
    id: string,
    content: string,
    priority?: "polite" | "assertive"
  ) => void;

  // Preferences
  preferences: {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
  };
  updatePreference: (
    key: keyof AccessibilityContextType["preferences"],
    value: boolean
  ) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null
);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
}) => {
  // Focus Management State
  const [focusState, setFocusState] = useState<FocusState>({
    activeId: null,
    history: [],
  });
  const focusableElements = useRef<Map<string, React.RefObject<HTMLElement>>>(
    new Map()
  );

  // Screen Reader Announcements
  const announcer = useRef<HTMLDivElement | null>(null);
  const [announcement, setAnnouncement] = useState<{
    message: string;
    priority: "polite" | "assertive";
  } | null>(null);

  // Keyboard Navigation
  const shortcuts = useRef<
    Map<
      string,
      {
        callback: (event: KeyboardEvent) => void;
        options?: { ctrl?: boolean; shift?: boolean; alt?: boolean };
      }
    >
  >(new Map());

  // ARIA Live Regions
  const liveRegions = useRef<Map<string, HTMLDivElement>>(new Map());

  // Accessibility Preferences
  const [preferences, setPreferences] = useState({
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    highContrast: window.matchMedia("(prefers-contrast: more)").matches,
    largeText: window.matchMedia("(prefers-larger-text)").matches,
  });

  // Focus Management
  const setFocus = useCallback((id: string) => {
    setFocusState((prev) => ({
      activeId: id,
      history: [...prev.history, id],
    }));
    focusableElements.current.get(id)?.current?.focus();
  }, []);

  const returnFocus = useCallback(() => {
    setFocusState((prev) => {
      const history = [...prev.history];
      history.pop(); // Remove current focus
      const lastId = history[history.length - 1];
      if (lastId) {
        focusableElements.current.get(lastId)?.current?.focus();
      }
      return {
        activeId: lastId || null,
        history,
      };
    });
  }, []);

  const registerFocusable = useCallback(
    (id: string, ref: React.RefObject<HTMLElement>) => {
      focusableElements.current.set(id, ref);
      return () => {
        focusableElements.current.delete(id);
      };
    },
    []
  );

  // Screen Reader Announcements
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      setAnnouncement({ message, priority });
    },
    []
  );

  useEffect(() => {
    if (announcement && announcer.current) {
      announcer.current.textContent = announcement.message;
      setTimeout(() => {
        setAnnouncement(null);
      }, 3000);
    }
  }, [announcement]);

  // Keyboard Navigation
  const registerKeyboardShortcut = useCallback(
    (
      key: string,
      callback: (event: KeyboardEvent) => void,
      options?: { ctrl?: boolean; shift?: boolean; alt?: boolean }
    ) => {
      shortcuts.current.set(key, { callback, options });
      return () => {
        shortcuts.current.delete(key);
      };
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.current.get(event.key);
      if (shortcut) {
        const { callback, options } = shortcut;
        if (
          (!options?.ctrl || event.ctrlKey) &&
          (!options?.shift || event.shiftKey) &&
          (!options?.alt || event.altKey)
        ) {
          callback(event);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ARIA Live Regions
  const setLiveRegion = useCallback(
    (
      id: string,
      content: string,
      priority: "polite" | "assertive" = "polite"
    ) => {
      const region = liveRegions.current.get(id);
      if (region) {
        region.textContent = content;
        region.setAttribute("aria-live", priority);
      }
    },
    []
  );

  // Preference Management
  const updatePreference = useCallback(
    (key: keyof typeof preferences, value: boolean) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Media Query Listeners
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    const textSizeQuery = window.matchMedia("(prefers-larger-text)");

    const updatePreferences = () => {
      setPreferences({
        reduceMotion: motionQuery.matches,
        highContrast: contrastQuery.matches,
        largeText: textSizeQuery.matches,
      });
    };

    motionQuery.addEventListener("change", updatePreferences);
    contrastQuery.addEventListener("change", updatePreferences);
    textSizeQuery.addEventListener("change", updatePreferences);

    return () => {
      motionQuery.removeEventListener("change", updatePreferences);
      contrastQuery.removeEventListener("change", updatePreferences);
      textSizeQuery.removeEventListener("change", updatePreferences);
    };
  }, []);

  const value: AccessibilityContextType = {
    focusState,
    setFocus,
    returnFocus,
    registerFocusable,
    announce,
    registerKeyboardShortcut,
    setLiveRegion,
    preferences,
    updatePreference,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      <div
        ref={announcer}
        role="status"
        aria-live={announcement?.priority || "polite"}
        aria-atomic="true"
        className="sr-only"
      />
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider"
    );
  }
  return context;
};

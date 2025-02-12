declare module '@jest/globals';
declare module 'openai';
declare module '@/components/ui/use-toast';
declare module '@/components/EmotionHighlighter';
declare module 'next-themes/dist/types' {
  export interface ThemeProviderProps {
    attribute?: string
    defaultTheme?: string
    enableSystem?: boolean
    storageKey?: string
    children?: React.ReactNode
  }
}

// Extend window for any global types
declare global {
  interface Window {
    // Add any window extensions here
  }
}

export {};

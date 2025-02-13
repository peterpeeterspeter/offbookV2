declare module 'mammoth' {
  interface ConversionResult {
    value: string;
    messages: any[];
  }

  interface Options {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: (image: any) => Promise<any>;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
  }

  function convertToHtml(input: Buffer | string, options?: Options): Promise<ConversionResult>;

  export default {
    convertToHtml
  };
}

declare module '@daily-co/daily-react' {
  import { ReactNode } from 'react';

  interface DailyProviderProps {
    children: ReactNode;
  }

  export function DailyProvider(props: DailyProviderProps): JSX.Element;
}

declare module '@daily-co/daily-js' {
  interface DailyCall {
    join(options?: any): Promise<void>;
    leave(): Promise<void>;
    setLocalAudio(enabled: boolean): void;
    setLocalVideo(enabled: boolean): void;
    participants(): Record<string, any>;
    on(event: string, callback: (event?: any) => void): void;
    off(event: string, callback: (event?: any) => void): void;
  }

  interface DailyEvent {
    action: string;
    participant?: any;
  }

  interface DailyInputSettings {
    audio: boolean;
    video: boolean;
  }

  interface DailyFactory {
    createCallObject(options?: any): DailyCall;
  }

  const Daily: DailyFactory;
  export default Daily;
  export { DailyCall, DailyEvent, DailyInputSettings };
}

declare module 'pdfjs-dist' {
  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<PDFTextContent>;
  }

  interface PDFTextContent {
    items: PDFTextItem[];
  }

  interface PDFTextItem {
    str: string;
  }

  function getDocument(source: string | Uint8Array): Promise<PDFDocumentProxy>;

  export { getDocument, PDFDocumentProxy, PDFPageProxy, PDFTextContent, PDFTextItem };
}

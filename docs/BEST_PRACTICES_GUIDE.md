# Best Practices Guide

## Overview

This guide outlines best practices for OFFbook v2 development, covering TypeScript, React, mobile development, testing, and performance optimization.

## Table of Contents

1. [TypeScript Best Practices](#typescript-best-practices)
2. [React Development](#react-development)
3. [Mobile Development](#mobile-development)
4. [Testing Guidelines](#testing-guidelines)
5. [Performance Optimization](#performance-optimization)
6. [Security Considerations](#security-considerations)

## TypeScript Best Practices

### 1. Type Safety

```typescript
// Use strict types, avoid 'any'
type ScriptData = {
  id: string;
  title: string;
  content: string;
  metadata: {
    author: string;
    lastModified: Date;
    version: number;
  };
};

// Use type guards for runtime checks
function isScriptData(data: unknown): data is ScriptData {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "title" in data &&
    "content" in data
  );
}

// Use branded types for type safety
type UserId = string & { readonly brand: unique symbol };
function createUserId(id: string): UserId {
  return id as UserId;
}
```

### 2. Error Handling

```typescript
// Define custom error types
class AudioServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AudioServiceError";
  }
}

// Use Result type for operations that can fail
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function processAudio(): Promise<Result<AudioBuffer, AudioServiceError>> {
  try {
    const buffer = await audioContext.decodeAudioData(/* ... */);
    return { success: true, data: buffer };
  } catch (error) {
    return {
      success: false,
      error: new AudioServiceError(
        "Failed to process audio",
        "DECODE_ERROR",
        error
      ),
    };
  }
}
```

### 3. Code Organization

```typescript
// Use barrel exports
// index.ts
export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./hooks";

// Organize related functionality
// audio/index.ts
export interface AudioService {
  initialize(): Promise<void>;
  play(buffer: AudioBuffer): void;
  stop(): void;
}

// audio/web-audio-service.ts
export class WebAudioService implements AudioService {
  // Implementation
}
```

## React Development

### 1. Component Structure

```typescript
// Use functional components with TypeScript
interface Props {
  scriptId: string;
  onLoad?: () => void;
  children: React.ReactNode;
}

export function ScriptViewer({ scriptId, onLoad, children }: Props) {
  // Implementation
}

// Use composition over inheritance
function Button({ variant = "primary", ...props }: ButtonProps) {
  return <button className={`btn-${variant}`} {...props} />;
}

function IconButton({ icon, ...props }: IconButtonProps) {
  return (
    <Button {...props}>
      <Icon name={icon} />
    </Button>
  );
}
```

### 2. State Management

```typescript
// Use hooks for state management
function useScript(scriptId: string) {
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadScript() {
      setIsLoading(true);
      try {
        const data = await fetchScript(scriptId);
        if (mounted) {
          setScript(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setScript(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadScript();
    return () => {
      mounted = false;
    };
  }, [scriptId]);

  return { script, error, isLoading };
}
```

### 3. Performance Optimization

```typescript
// Use memo for expensive computations
const memoizedValue = useMemo(
  () => expensiveComputation(props.data),
  [props.data]
);

// Use callback for event handlers
const handleClick = useCallback(
  (event: React.MouseEvent) => {
    // Handle click
  },
  [] // Dependencies
);

// Use lazy loading for components
const LazyComponent = lazy(() => import("./HeavyComponent"));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```

## Mobile Development

### 1. Touch Interactions

```typescript
// Implement touch-friendly interactions
function TouchableArea({ onPress, children }: TouchableProps) {
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    // Handle touch start
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      style={{ minHeight: "44px", minWidth: "44px" }}
      onTouchStart={handleTouchStart}
    >
      {children}
    </div>
  );
}
```

### 2. Responsive Design

```typescript
// Use responsive design patterns
const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1rem",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    margin: "0 auto",
  },
};

// Use media queries effectively
const useBreakpoint = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
};
```

### 3. Performance Optimization

```typescript
// Implement progressive loading
function ProgressiveImage({ src, placeholder, alt }: ImageProps) {
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setCurrentSrc(src);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      style={{ transition: "opacity 0.3s" }}
      loading="lazy"
    />
  );
}
```

## Testing Guidelines

### 1. Unit Testing

```typescript
// Test React components
describe("ScriptViewer", () => {
  it("renders script content", async () => {
    const { getByText } = render(<ScriptViewer scriptId="123" />);

    await waitFor(() => {
      expect(getByText("Script Title")).toBeInTheDocument();
    });
  });

  it("handles errors gracefully", async () => {
    server.use(
      rest.get("/api/scripts/:id", (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { getByText } = render(<ScriptViewer scriptId="123" />);

    await waitFor(() => {
      expect(getByText("Error loading script")).toBeInTheDocument();
    });
  });
});
```

### 2. Integration Testing

```typescript
// Test service integration
describe("AudioService Integration", () => {
  it("processes audio correctly", async () => {
    const service = new AudioService();
    const result = await service.processAudio(testBuffer);

    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(AudioBuffer);
  });
});
```

### 3. E2E Testing

```typescript
// Test user flows
describe("Script Recording Flow", () => {
  it("completes recording session", async () => {
    await page.goto("/record");
    await page.click('[data-testid="start-recording"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="stop-recording"]');

    const audioElement = await page.waitForSelector("audio");
    expect(audioElement).toBeTruthy();
  });
});
```

## Performance Optimization

### 1. Code Splitting

```typescript
// Split code by routes
const routes = {
  home: lazy(() => import("./pages/Home")),
  record: lazy(() => import("./pages/Record")),
  practice: lazy(() => import("./pages/Practice")),
};

// Split by features
const AudioRecorder = lazy(() => import("./features/AudioRecorder"));
const ScriptEditor = lazy(() => import("./features/ScriptEditor"));
```

### 2. Caching

```typescript
// Implement caching strategies
const cache = new Map<string, CacheEntry>();

async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAge: number
): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

### 3. Resource Loading

```typescript
// Optimize resource loading
function optimizeResources() {
  // Preload critical resources
  const preloadLink = document.createElement("link");
  preloadLink.rel = "preload";
  preloadLink.as = "style";
  preloadLink.href = "/critical.css";
  document.head.appendChild(preloadLink);

  // Lazy load non-critical resources
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || "";
        imageObserver.unobserve(img);
      }
    });
  });
  lazyImages.forEach((img) => imageObserver.observe(img));
}
```

## Security Considerations

### 1. Input Validation

```typescript
// Validate user input
function validateScript(input: unknown): Result<Script, ValidationError> {
  if (!isScriptData(input)) {
    return {
      success: false,
      error: new ValidationError("Invalid script data"),
    };
  }

  // Additional validation
  return { success: true, data: input };
}
```

### 2. Authentication

```typescript
// Implement secure authentication
async function authenticateUser(
  credentials: Credentials
): Promise<Result<Session, AuthError>> {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new AuthError("Authentication failed");
    }

    const session = await response.json();
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof AuthError ? error : new AuthError("Unknown error"),
    };
  }
}
```

### 3. Data Protection

```typescript
// Implement data protection
const securityConfig = {
  encryption: {
    algorithm: "AES-GCM",
    keyLength: 256,
  },
  storage: {
    sensitive: new SecureStorage(),
    regular: localStorage,
  },
};

async function protectData(data: sensitive): Promise<EncryptedData> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );

  return {
    data: encrypted,
    iv,
    key: await crypto.subtle.exportKey("jwk", key),
  };
}
```

# API Documentation

## Table of Contents

- [Core Services](#core-services)
  - [DeviceDetector](#devicedetector)
  - [AccessibilityTester](#accessibilitytester)
  - [BrowserCompatibilityTester](#browsercompatibilitytester)
  - [PerformanceProfiler](#performanceprofiler)
- [Security Services](#security-services)
  - [EncryptionService](#encryptionservice)
  - [AccessControlService](#accesscontrolservice)
  - [PrivacyService](#privacyservice)
  - [DataCleanupService](#datacleanupservice)

## Core Services

### DeviceDetector

Service for detecting and monitoring device capabilities and characteristics.

#### Methods

##### `constructor()`

Creates a new instance of the device detector.

```typescript
const detector = new DeviceDetector();
```

##### `async getDeviceInfo(): Promise<DeviceInfo>`

Returns comprehensive information about the current device.

```typescript
const info = await detector.getDeviceInfo();
```

- **Returns**
  ```typescript
  interface DeviceInfo {
    os: {
      name: string;
      version: string;
    };
    type: "mobile" | "tablet" | "desktop";
    screen: {
      width: number;
      height: number;
      orientation: "portrait" | "landscape";
      dpr: number;
    };
    capabilities: {
      touch: boolean;
      accelerometer: boolean;
      gyroscope: boolean;
      vibration: boolean;
      webgl: boolean;
    };
    browser: {
      name: string;
      version: string;
      engine: string;
    };
  }
  ```

### AccessibilityTester

Service for testing and validating accessibility compliance.

#### Methods

##### `constructor(root?: HTMLElement)`

Creates a new instance of the accessibility tester.

```typescript
const tester = new AccessibilityTester();
```

- **Parameters**
  - `root` (optional): The root element to test. Defaults to document.body

##### `async test(): Promise<AccessibilityReport>`

Performs comprehensive accessibility testing.

```typescript
const report = await tester.test();
```

- **Returns**
  ```typescript
  interface AccessibilityReport {
    aria: {
      missingLabels: string[];
      invalidRoles: string[];
      missingDescriptions: string[];
    };
    contrast: {
      failures: Array<{
        element: string;
        ratio: number;
        required: number;
      }>;
    };
    touch: {
      smallTargets: string[];
      overlapping: string[];
    };
    focus: {
      order: string[];
      trapped: string[];
    };
    media: {
      missingAlt: string[];
      missingCaptions: string[];
    };
  }
  ```

### BrowserCompatibilityTester

Service for testing browser feature support and compatibility.

#### Methods

##### `constructor()`

Creates a new instance of the browser compatibility tester.

```typescript
const tester = new BrowserCompatibilityTester();
```

##### `async test(): Promise<CompatibilityReport>`

Tests browser compatibility and feature support.

```typescript
const report = await tester.test();
```

- **Returns**
  ```typescript
  interface CompatibilityReport {
    features: BrowserFeatures;
    issues: Array<{
      feature: string;
      severity: "high" | "medium" | "low";
      message: string;
    }>;
    recommendations: string[];
  }
  ```

### PerformanceProfiler

Service for monitoring and analyzing application performance.

#### Methods

##### `constructor()`

Creates a new instance of the performance profiler.

```typescript
const profiler = new PerformanceProfiler();
```

##### `async startProfiling(): Promise<void>`

Starts performance profiling session.

```typescript
await profiler.startProfiling();
```

##### `async stopProfiling(): Promise<PerformanceProfile>`

Stops profiling and returns performance data.

```typescript
const profile = await profiler.stopProfiling();
```

- **Returns**
  ```typescript
  interface PerformanceProfile {
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      leaks: Array<{
        type: string;
        size: number;
        stack: string;
      }>;
    };
    fps: {
      current: number;
      min: number;
      max: number;
      drops: number;
    };
    network: {
      requests: Array<{
        url: string;
        duration: number;
        size: number;
        type: string;
      }>;
      metrics: {
        ttfb: number;
        fcp: number;
        lcp: number;
      };
    };
    battery: {
      level: number;
      charging: boolean;
      dischargingTime: number;
      impact: {
        cpu: number;
        network: number;
        memory: number;
      };
    };
  }
  ```

##### `on(event: string, callback: Function): void`

Subscribes to performance events.

```typescript
profiler.on("memory", (stats) => {
  console.log("Memory usage:", stats);
});
```

- **Parameters**
  - `event`: Event name ('memory' | 'fps' | 'network' | 'battery')
  - `callback`: Function to call when event occurs

##### `async generateReport(options?: ReportOptions): Promise<PerformanceReport>`

Generates a comprehensive performance report.

```typescript
const report = await profiler.generateReport({
  timeframe: "7d",
  metrics: ["memory", "fps", "network"],
});
```

- **Parameters**
  ```typescript
  interface ReportOptions {
    timeframe?: string;
    metrics?: string[];
    aggregation?: "avg" | "p95" | "p99";
    breakdown?: string[];
  }
  ```

## Security Services

### EncryptionService

Service for handling data encryption and decryption with integrity checks.

#### Methods

##### `constructor(masterKey?: string)`

Creates a new instance of the encryption service.

```typescript
const encryption = new EncryptionService("your-encryption-key");
```

- **Parameters**
  - `masterKey` (optional): The master encryption key. Defaults to `process.env.NEXT_PUBLIC_ENCRYPTION_KEY`
- **Throws**
  - `Error` if no encryption key is provided

##### `async encrypt(data: any): Promise<string>`

Encrypts data using AES-256-GCM with integrity check.

```typescript
const encrypted = await encryption.encrypt({ id: 1, name: "test" });
```

- **Parameters**
  - `data`: Any JSON-serializable data
- **Returns**
  - Encrypted data string containing:
    - Encrypted data
    - Initialization vector
    - Salt
    - Version
    - Integrity hash
- **Throws**
  - `Error` if encryption fails

##### `async decrypt(encryptedStr: string): Promise<any>`

Decrypts data and verifies integrity.

```typescript
const decrypted = await encryption.decrypt(encrypted);
```

- **Parameters**
  - `encryptedStr`: Previously encrypted data string
- **Returns**
  - Original decrypted data
- **Throws**
  - `Error` if decryption fails or integrity check fails

##### `async rotateKey(data: string, newKey: string): Promise<string>`

Re-encrypts data with a new key.

```typescript
const reEncrypted = await encryption.rotateKey(encrypted, "new-key");
```

- **Parameters**
  - `data`: Previously encrypted data
  - `newKey`: New encryption key
- **Returns**
  - Data re-encrypted with new key
- **Throws**
  - `Error` if key rotation fails

### AccessControlService

Service for managing access control and permissions.

#### Methods

##### `setUser(userId: string, role: UserRole)`

Sets the current user context.

```typescript
accessControl.setUser("user123", "admin");
```

- **Parameters**
  - `userId`: Unique user identifier
  - `role`: User role ('admin' | 'user' | 'guest')

##### `clearUser()`

Clears the current user context.

```typescript
accessControl.clearUser();
```

##### `async canAccess(resourceId: string, metadata: SecurityMetadata, options?: AccessControlOptions): Promise<boolean>`

Checks if current user can access the resource.

```typescript
const canAccess = await accessControl.canAccess("resource123", metadata, {
  requiredRole: "user",
  allowedUsers: ["user123"],
  logAccess: true,
});
```

- **Parameters**
  - `resourceId`: Resource identifier
  - `metadata`: Security metadata
  - `options`: Access control options
- **Returns**
  - `true` if access is allowed, `false` otherwise

##### `getAccessLogs(options?: { userId?: string; resourceId?: string; startTime?: number; endTime?: number }): AccessLog[]`

Gets filtered access logs.

```typescript
const logs = accessControl.getAccessLogs({
  userId: "user123",
  startTime: Date.now() - 86400000, // Last 24 hours
});
```

- **Parameters**
  - `options`: Filter options
- **Returns**
  - Array of access log entries

### PrivacyService

Service for managing privacy compliance and data protection.

#### Methods

##### `recordConsent(userId: string, purpose: string)`

Records user consent for data processing.

```typescript
privacy.recordConsent("user123", "data_storage");
```

- **Parameters**
  - `userId`: User identifier
  - `purpose`: Purpose of consent

##### `withdrawConsent(userId: string, purpose: string)`

Withdraws user consent.

```typescript
privacy.withdrawConsent("user123", "data_storage");
```

- **Parameters**
  - `userId`: User identifier
  - `purpose`: Purpose to withdraw

##### `hasConsent(userId: string, purpose: string): boolean`

Checks if user has given consent.

```typescript
const hasConsent = privacy.hasConsent("user123", "data_storage");
```

- **Parameters**
  - `userId`: User identifier
  - `purpose`: Purpose to check
- **Returns**
  - `true` if consent exists, `false` otherwise

##### `async canStoreData(userId: string, metadata: SecurityMetadata, options?: PrivacyOptions): Promise<{ allowed: boolean; reason?: string }>`

Checks if data can be stored based on privacy rules.

```typescript
const result = await privacy.canStoreData("user123", metadata, {
  isPersonalData: true,
  legalBasis: "consent",
  specialCategories: ["health"],
});
```

- **Parameters**
  - `userId`: User identifier
  - `metadata`: Security metadata
  - `options`: Privacy options
- **Returns**
  - Object with allowed status and reason if not allowed

### DataCleanupService

Service for managing secure data deletion and cleanup.

#### Methods

##### `constructor(deleteData: (resourceId: string) => Promise<void>, archiveData: (resourceId: string) => Promise<void>)`

Creates a new instance of the cleanup service.

```typescript
const cleanup = new DataCleanupService(
  async (id) => storage.delete(id),
  async (id) => archive.store(id)
);
```

##### `start(intervalMs = 60000)`

Starts the cleanup service.

```typescript
cleanup.start(300000); // Run every 5 minutes
```

- **Parameters**
  - `intervalMs`: Cleanup interval in milliseconds

##### `stop()`

Stops the cleanup service.

```typescript
cleanup.stop();
```

##### `scheduleCleanup(resourceId: string, metadata: SecurityMetadata, policy: RetentionPolicy)`

Schedules data for cleanup.

```typescript
cleanup.scheduleCleanup("resource123", metadata, {
  duration: 30 * 24 * 60 * 60 * 1000, // 30 days
  archive: true,
});
```

- **Parameters**
  - `resourceId`: Resource identifier
  - `metadata`: Security metadata
  - `policy`: Retention policy

##### `async forceCleanup(resourceId: string): Promise<void>`

Immediately runs cleanup for a resource.

```typescript
await cleanup.forceCleanup("resource123");
```

- **Parameters**
  - `resourceId`: Resource identifier
- **Throws**
  - `Error` if cleanup fails

## Types

### SecurityMetadata

```typescript
interface SecurityMetadata {
  accessLevel: "public" | "protected" | "private" | "sensitive";
  createdBy: string;
  createdAt: number;
  retentionDate?: number;
  hasConsent?: boolean;
  encryptionVersion: number;
  integrityHash: string;
}
```

### AccessControlOptions

```typescript
interface AccessControlOptions {
  requiredRole?: "admin" | "user" | "guest";
  allowedUsers?: string[];
  logAccess?: boolean;
}
```

### PrivacyOptions

```typescript
interface PrivacyOptions {
  isPersonalData?: boolean;
  legalBasis?:
    | "consent"
    | "contract"
    | "legal_obligation"
    | "vital_interests"
    | "public_task"
    | "legitimate_interests";
  specialCategories?: string[];
  geoRestrictions?: string[];
}
```

### RetentionPolicy

```typescript
interface RetentionPolicy {
  duration: number;
  archive?: boolean;
  requiresConsent?: boolean;
}
```

## Error Handling

All services use TypeScript for type safety and include comprehensive error handling:

1. **Input Validation**

   - All methods validate input parameters
   - TypeScript interfaces ensure type safety
   - Runtime checks for required values

2. **Async Operations**

   - All async operations properly handle errors
   - Promises include error handling
   - Detailed error messages provided

3. **Security Checks**

   - Encryption failures handled gracefully
   - Access control violations logged
   - Privacy violations prevented

4. **Resource Cleanup**
   - Failed operations properly cleaned up
   - Resources released appropriately
   - Retry mechanisms implemented

### Security-Related Errors

```typescript
export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SecurityError";
  }
}

// Usage examples:
throw new SecurityError("Invalid encryption key", "INVALID_KEY");
throw new SecurityError("Access denied", "ACCESS_DENIED");
throw new SecurityError("Data integrity check failed", "INTEGRITY_FAILED");
```

### Privacy-Related Errors

```typescript
export class PrivacyError extends Error {
  constructor(message: string, public requirement: string) {
    super(message);
    this.name = "PrivacyError";
  }
}

// Usage examples:
throw new PrivacyError("Consent required", "USER_CONSENT");
throw new PrivacyError("Geographic restriction", "GEO_RESTRICTION");
```

### Storage-Related Errors

```typescript
export class StorageError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
    this.name = "StorageError";
  }
}

// Usage examples:
throw new StorageError("Quota exceeded", "WRITE");
throw new StorageError("Item not found", "READ");
```

## Rate Limiting

New section on rate limiting:

```typescript
interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  errorMessage?: string;
}

const defaultOptions: RateLimitOptions = {
  maxRequests: 100,
  windowMs: 60000,
  errorMessage: "Too many requests",
};

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(userId: string, options = defaultOptions): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Clean old requests
    const validRequests = userRequests.filter(
      (time) => now - time < options.windowMs
    );

    if (validRequests.length >= options.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}
```

## Monitoring and Logging

New section on monitoring:

```typescript
interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

class SecurityMonitor {
  private logs: LogEntry[] = [];

  log(entry: Omit<LogEntry, "timestamp">): void {
    this.logs.push({
      ...entry,
      timestamp: Date.now(),
    });

    if (entry.level === "error") {
      this.alertAdmins(entry);
    }
  }

  private alertAdmins(entry: LogEntry): void {
    // Implementation for alerting administrators
  }

  getRecentLogs(minutes: number): LogEntry[] {
    const cutoff = Date.now() - minutes * 60000;
    return this.logs.filter((log) => log.timestamp >= cutoff);
  }
}
```

## Best Practices

1. **Security**

   - Always use strong encryption keys
   - Rotate keys regularly
   - Log all access attempts
   - Implement rate limiting

2. **Privacy**

   - Always check consent before processing
   - Implement data minimization
   - Regular privacy audits
   - Document all processing

3. **Performance**

   - Use appropriate cleanup intervals
   - Implement caching where appropriate
   - Monitor resource usage
   - Optimize bulk operations

4. **Compliance**
   - Regular GDPR compliance checks
   - Maintain audit logs
   - Document all processes
   - Regular security reviews

### Key Rotation

```typescript
interface KeyRotationConfig {
  interval: number; // Rotation interval in milliseconds
  gracePeriod: number; // Time to keep old keys for decryption
  keyVersions: number; // Number of previous keys to retain
}

class KeyRotationManager {
  private keys: Map<number, string> = new Map();
  private currentVersion = 1;

  async rotateKey(): Promise<void> {
    const newKey = await this.generateKey();
    this.keys.set(++this.currentVersion, newKey);

    // Clean up old keys
    const minVersion = this.currentVersion - this.config.keyVersions;
    for (const [version] of this.keys) {
      if (version < minVersion) {
        this.keys.delete(version);
      }
    }
  }

  private async generateKey(): Promise<string> {
    // Implement secure key generation
    return "new-key";
  }
}
```

### Secure Data Handling

```typescript
interface SecureDataOptions {
  encrypt?: boolean;
  sign?: boolean;
  compress?: boolean;
  accessLevel?: AccessLevel;
}

async function handleSecureData<T>(
  data: T,
  options: SecureDataOptions
): Promise<string> {
  let processed: any = data;

  if (options.compress) {
    processed = await compress(processed);
  }

  if (options.encrypt) {
    processed = await encrypt(processed);
  }

  if (options.sign) {
    processed = await sign(processed);
  }

  return processed;
}
```

## Updated Types

### Enhanced Security Metadata

```typescript
interface EnhancedSecurityMetadata extends SecurityMetadata {
  keyVersion: number;
  lastRotated?: number;
  signatureAlgorithm?: string;
  compressionAlgorithm?: string;
  processingHistory: Array<{
    operation: string;
    timestamp: number;
    operator: string;
  }>;
}
```

### Enhanced Privacy Options

```typescript
interface EnhancedPrivacyOptions extends PrivacyOptions {
  dataMinimization?: {
    fields: string[];
    strategy: "exclude" | "include";
  };
  retention: {
    policy: RetentionPolicy;
    override?: boolean;
  };
  crossBorder?: {
    allowed: string[];
    requiresApproval: boolean;
  };
}
```

## Service Integration

Example of integrating multiple services:

```typescript
class SecureStorageManager {
  constructor(
    private encryption: EncryptionService,
    private access: AccessControlService,
    private privacy: PrivacyService,
    private cleanup: DataCleanupService
  ) {}

  async store(key: string, data: any, options: SecurityConfig): Promise<void> {
    // Check privacy requirements
    const privacyCheck = await this.privacy.canStoreData(
      options.userId,
      options.metadata,
      options.privacy
    );

    if (!privacyCheck.allowed) {
      throw new PrivacyError(privacyCheck.reason!, "STORAGE_DENIED");
    }

    // Check access control
    const accessCheck = await this.access.canAccess(
      key,
      options.metadata,
      options.accessControl
    );

    if (!accessCheck) {
      throw new SecurityError("Access denied", "STORAGE_ACCESS_DENIED");
    }

    // Encrypt if needed
    const processed = options.encrypt
      ? await this.encryption.encrypt(data)
      : data;

    // Schedule cleanup if needed
    if (options.retention) {
      this.cleanup.scheduleCleanup(key, options.metadata, options.retention);
    }

    // Store the data
    await this.storage.set(key, processed);
  }
}
```

Remember to update your implementation based on these enhanced specifications.

# API Documentation

## Component Interface

### Props

```typescript
interface ScriptUploadProps {
  /**
   * Callback function called when a file is successfully validated and ready for upload
   * @param file The File object to be uploaded
   * @returns A Promise that resolves when the upload is complete
   */
  onUpload: (file: File) => Promise<void>;

  /**
   * Array of supported file extensions
   * @default [".txt"]
   */
  supportedFormats?: string[];

  /**
   * Maximum allowed file size in megabytes
   * @default 10
   */
  maxSize?: number;
}
```

## Component Structure

### Main Container

```typescript
<motion.div
  className={`upload-container ${isDragging ? "dragging" : ""}`}
  data-testid="upload-dropzone-container"
  role="region"
  aria-label="Script upload dropzone"
  tabIndex={0}
>
  {/* Component content */}
</motion.div>
```

### File Input

```typescript
<input
  type="file"
  ref={fileInputRef}
  accept={supportedFormats.join(",")}
  className="file-input"
  data-testid="upload-input"
  aria-label="Upload script file"
/>
```

### Progress Bar

```typescript
<motion.div className="progress-container" data-testid="upload-progress">
  <div className="progress-bar" data-testid="progress-bar">
    {/* Progress bar content */}
  </div>
</motion.div>
```

### Error Display

```typescript
<motion.div className="error-message" data-testid="upload-error" role="alert">
  ⚠️ {error}
</motion.div>
```

## State Management

### Component State

```typescript
const [isDragging, setIsDragging] = useState(false);
const [file, setFile] = useState<File | null>(null);
const [uploadProgress, setUploadProgress] = useState(0);
const [error, setError] = useState<string | null>(null);
```

### File Validation

```typescript
const validateFile = (file: File): string | null => {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!supportedFormats.map((f) => f.toLowerCase()).includes(extension)) {
    return `Unsupported file format. Please use: ${supportedFormats.join(
      ", "
    )}`;
  }
  if (file.size > maxSize * 1024 * 1024) {
    return `File too large. Maximum size is ${maxSize}MB`;
  }
  return null;
};
```

## Event Handlers

### Drag Events

```typescript
const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
  // Handle file drop
};
```

### File Selection

```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0];
  if (!selectedFile) return;
  // Handle file selection
};
```

## Upload Simulation

### Progress Tracking

```typescript
const simulateUpload = async (file: File) => {
  setUploadProgress(0);
  try {
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setUploadProgress(i);
    }
    await onUpload(file);
  } catch (err) {
    setError("Upload failed. Please try again.");
    setUploadProgress(0);
  }
};
```

## CSS Classes

### Container Classes

- `script-upload`: Main component container
- `upload-container`: Upload area container
- `dragging`: Applied during drag operation

### Content Classes

- `upload-content`: Content wrapper
- `upload-icon`: File icon display
- `upload-text`: Text content area
- `file-info`: File information display

### Progress Classes

- `progress-container`: Progress bar wrapper
- `progress-bar`: Progress bar container
- `progress-fill`: Progress bar fill

### Error Classes

- `error-message`: Error message container

## Accessibility

### ARIA Attributes

- `role="region"`: Main container role
- `aria-label`: Descriptive labels
- `role="alert"`: Error messages
- `tabIndex={0}`: Keyboard navigation

### Keyboard Support

- Enter/Space: Trigger file browser
- Tab: Navigate through elements
- Escape: Cancel drag operation

## Usage Examples

### Basic Usage

```typescript
<ScriptUpload onUpload={handleUpload} />
```

### Custom File Types

```typescript
<ScriptUpload
  onUpload={handleUpload}
  supportedFormats={[".txt", ".pdf", ".docx"]}
/>
```

### Custom Size Limit

```typescript
<ScriptUpload
  onUpload={handleUpload}
  maxSize={20} // 20MB limit
/>
```

### Full Configuration

```typescript
<ScriptUpload
  onUpload={handleUpload}
  supportedFormats={[".txt", ".pdf"]}
  maxSize={15}
/>
```

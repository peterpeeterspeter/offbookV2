# Quick Start Guide

## Installation

The ScriptUpload component is part of the OFFbook project. No additional installation is required.

## Basic Usage

```typescript
import ScriptUpload from "../components/ScriptUpload";

function YourComponent() {
  const handleUpload = async (file: File) => {
    try {
      // Handle the uploaded file
      console.log("File uploaded:", file.name);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <ScriptUpload
      onUpload={handleUpload}
      supportedFormats={[".txt"]}
      maxSize={10}
    />
  );
}
```

## Initial Setup

```bash
# Navigate to project directory
cd /Users/Peter/OFFbookv2

# Run tests to verify setup
npm test
```

## Component Props

```typescript
interface ScriptUploadProps {
  // Required: Function to handle the upload
  onUpload: (file: File) => Promise<void>;

  // Optional: Array of supported file extensions
  // Default: ['.txt']
  supportedFormats?: string[];

  // Optional: Maximum file size in MB
  // Default: 10
  maxSize?: number;
}
```

## Features Available

1. **Drag and Drop**

   - Drag files directly onto the upload area
   - Visual feedback during drag

2. **File Selection**

   - Click "browse" button to select files
   - File type filtering based on supportedFormats

3. **Validation**

   - File type checking
   - File size limits
   - Error messages for invalid files

4. **Progress Tracking**
   - Upload progress bar
   - Percentage display
   - Animated progress updates

## Next Steps

- Check out the [Testing Guide](./testing.md) for testing information
- See the [Component API](./api.md) for detailed API documentation
- Visit the [Troubleshooting](./troubleshooting.md) guide for common issues

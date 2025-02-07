# Testing Guide

## Test Setup

### Required Imports

```typescript
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScriptUpload from "../ScriptUpload";
```

### Default Props

```typescript
const defaultProps = {
  onUpload: jest.fn().mockImplementation(() => Promise.resolve()),
  supportedFormats: [".txt"],
  maxSize: 10,
};
```

### Test Utilities

```typescript
// Create test file
const createFile = (name: string, type = "text/plain") => {
  return new File(["test content"], name, { type });
};

// Simulate drop
const simulateDrop = (element: HTMLElement, files: File[]) => {
  const dt = new MockDataTransfer();
  files.forEach((file) => dt.add(file));
  act(() => {
    fireEvent.drop(element, { dataTransfer: dt });
  });
};
```

## Test IDs

```typescript
data-testid="upload-dropzone-container"  // Main container
data-testid="upload-input"               // File input
data-testid="upload-error"               // Error messages
data-testid="upload-progress"            // Progress container
data-testid="progress-bar"               // Progress bar
```

## Common Test Patterns

### 1. Testing File Upload

```typescript
it("accepts valid .txt files", async () => {
  render(<ScriptUpload {...defaultProps} />);
  const dropZone = screen.getByTestId("upload-dropzone-container");
  const file = createFile("test.txt");

  await act(async () => {
    simulateDrop(dropZone, [file]);
    for (let i = 0; i <= 100; i += 10) {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    }
  });

  await waitFor(() => {
    expect(mockOnUpload).toHaveBeenCalledWith(file);
  });
});
```

### 2. Testing Error States

```typescript
it("shows error for invalid file type", async () => {
  render(<ScriptUpload {...defaultProps} />);
  const dropZone = screen.getByTestId("upload-dropzone-container");
  const invalidFile = createFile("test.invalid");

  await act(async () => {
    simulateDrop(dropZone, [invalidFile]);
  });

  await waitFor(() => {
    expect(screen.getByTestId("upload-error")).toHaveTextContent(
      "Unsupported file format. Please use: .txt"
    );
  });
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run only ScriptUpload tests
npm test ScriptUpload

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --verbose
```

### Timer Management

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
```

## Current Test Status

- Total Tests: 37
- Passing: 29
- Failing: 8

## Debugging Tests

### Common Issues

1. **Multiple Elements Found**

   ```typescript
   // Use specific test ID
   screen.getByTestId("upload-dropzone-container");
   ```

2. **Timer Issues**

   ```typescript
   // Wrap in act
   await act(async () => {
     jest.advanceTimersByTime(200);
     await Promise.resolve();
   });
   ```

3. **Async Test Failures**
   ```typescript
   await waitFor(() => {
     expect(screen.getByTestId("upload-error")).toBeInTheDocument();
   });
   ```

## Test Coverage Areas

1. Component Rendering
2. File Type Validation
3. File Size Validation
4. Upload Progress
5. Error Handling
6. Drag and Drop Events
7. Accessibility Features

## Best Practices

1. Use unique test IDs
2. Handle async operations properly
3. Clean up after each test
4. Mock timers consistently
5. Test error scenarios thoroughly

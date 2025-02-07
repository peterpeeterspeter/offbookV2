# Troubleshooting Guide

## Common Issues and Solutions

### 1. Test ID Conflicts

#### Problem

Multiple elements found with the same test ID.

#### Solution

```typescript
// Instead of
screen.getByTestId("upload-container");

// Use specific test ID
screen.getByTestId("upload-dropzone-container");
```

### 2. Timer-Related Test Failures

#### Problem

Tests failing due to asynchronous operations and timers.

#### Solution

```typescript
// Wrap timer operations in act
await act(async () => {
  jest.advanceTimersByTime(200);
  await Promise.resolve();
});

// Ensure proper timer setup
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
```

### 3. Async Test Issues

#### Problem

Tests failing due to async operations not completing.

#### Solution

```typescript
// Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByTestId("upload-error")).toBeInTheDocument();
});

// Properly wrap async operations
await act(async () => {
  simulateDrop(dropZone, [file]);
});
```

### 4. File Upload Validation

#### Problem

File validation not working as expected.

#### Solution

```typescript
// Check file type validation
const validationError = validateFile(file);
if (validationError) {
  setError(validationError);
  return;
}

// Ensure proper file creation in tests
const file = createFile("test.txt", "text/plain");
```

### 5. Progress Bar Issues

#### Problem

Progress bar not updating or tests timing out.

#### Solution

```typescript
// Simulate progress updates
await act(async () => {
  for (let i = 0; i <= 100; i += 10) {
    jest.advanceTimersByTime(200);
    await Promise.resolve();
  }
});

// Check progress bar state
expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
```

## Debug Commands

### Test Output

```bash
# Verbose output
npm test -- --verbose

# Watch mode
npm test -- --watch

# Single file
npm test -- ScriptUpload.test.tsx
```

### Component Testing

```bash
# Test specific functionality
npm test -- -t "shows error for invalid file type"

# Update snapshots
npm test -- -u
```

## Error Messages

### 1. Multiple Elements Found

```
TestingLibraryElementError: Found multiple elements with the role "region"
```

**Solution**: Use more specific queries or test IDs.

### 2. Element Not Found

```
TestingLibraryElementError: Unable to find an element by: [data-testid="upload-error"]
```

**Solution**: Ensure the element exists and the test ID is correct.

### 3. Timer Warning

```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution**: Wrap timer operations in act().

## Best Practices

### 1. Test ID Usage

- Use unique, specific test IDs
- Follow naming conventions
- Document test IDs

### 2. Async Operations

- Always wrap in act()
- Use waitFor for assertions
- Handle promises properly

### 3. Timer Management

- Use fake timers consistently
- Clean up after tests
- Handle all async operations

### 4. Error Handling

- Test error scenarios
- Verify error messages
- Check error state cleanup

## Quick Reference

### Test IDs

```typescript
data-testid="upload-dropzone-container"  // Main container
data-testid="upload-input"               // File input
data-testid="upload-error"               // Error messages
data-testid="upload-progress"            // Progress container
data-testid="progress-bar"               // Progress bar
```

### Common Patterns

```typescript
// File upload test
await act(async () => {
  simulateDrop(dropZone, [file]);
});

// Error check
await waitFor(() => {
  expect(screen.getByTestId("upload-error")).toBeInTheDocument();
});

// Progress simulation
await act(async () => {
  jest.advanceTimersByTime(200);
  await Promise.resolve();
});
```

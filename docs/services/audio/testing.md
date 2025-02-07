# Audio Service Testing Guide

## Overview

This guide covers testing strategies for the Audio Service implementation, focusing on state transitions, error handling, and integration testing.

## Test Categories

### 1. State Transition Tests

Test all valid state transitions:

```typescript
describe("AudioStateManager - State Transitions", () => {
  it("should transition from UNINITIALIZED to INITIALIZING", () => {
    const manager = AudioStateManager.getInstance();
    manager.transition(AudioServiceEvent.INITIALIZE);
    expect(manager.getState().state).toBe(AudioServiceState.INITIALIZING);
  });
});
```

### 2. Error Handling Tests

Test error creation and handling:

```typescript
describe("AudioStateManager - Error Handling", () => {
  it("should create error with correct category and message", () => {
    const manager = AudioStateManager.getInstance();
    const error = manager.createError(AudioServiceError.INITIALIZATION_FAILED);

    expect(error.category).toBe(AudioErrorCategory.SYSTEM);
    expect(error.message).toBe("Failed to initialize audio service");
    expect(error.retryable).toBe(false);
  });
});
```

### 3. Invalid State Transition Tests

Test handling of invalid transitions:

```typescript
describe("AudioStateManager - Invalid Transitions", () => {
  it("should handle invalid state transitions", () => {
    const manager = AudioStateManager.getInstance();
    const consoleSpy = jest.spyOn(console, "warn");

    manager.transition(AudioServiceEvent.RECORDING_START); // Invalid from UNINITIALIZED

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid state transition")
    );
    expect(manager.getState().state).toBe(AudioServiceState.UNINITIALIZED);
  });
});
```

## Test Setup

1. Reset state before each test:

```typescript
beforeEach(() => {
  AudioStateManager.getInstance().restore();
});
```

2. Mock console methods to prevent noise:

```typescript
beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
```

## Integration Testing

Test integration with audio hardware:

```typescript
describe("AudioService - Hardware Integration", () => {
  it("should initialize audio context", async () => {
    const service = new AudioService();
    await service.initialize();

    expect(service.getState().context.isContextRunning).toBe(true);
    expect(service.getState().context.sampleRate).toBe(44100);
  });
});
```

## Mobile Testing

Additional considerations for mobile testing:

1. Test audio interruptions (phone calls, notifications)
2. Test background/foreground transitions
3. Test different audio input sources
4. Verify VAD performance on mobile devices

## Performance Testing

Measure and test:

1. Initialization time
2. State transition latency
3. Memory usage during recording
4. CPU usage during VAD processing

## Coverage Requirements

Maintain minimum coverage requirements:

- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

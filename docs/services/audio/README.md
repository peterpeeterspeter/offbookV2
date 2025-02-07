# Audio Service Documentation

## Overview

The Audio Service is a TypeScript implementation for handling audio recording, playback, and voice activity detection (VAD) in a type-safe manner. It uses a state machine pattern to manage audio states and transitions.

## Architecture

### State Management

The service uses a strict state machine pattern with the following components:

- **States**: Defined in `AudioServiceState` (UNINITIALIZED, INITIALIZING, READY, RECORDING, ERROR)
- **Events**: Defined in `AudioServiceEvent` (INITIALIZE, INITIALIZED, RECORDING_START, etc.)
- **Transitions**: Managed by `stateTransitions` map in `audio-state.ts`

### Error Handling

Error handling is implemented with:

- Type-safe error codes (`AudioServiceError`)
- Error categories (`AudioErrorCategory`)
- Recovery hints for each error type
- User-friendly error messages

## Recent Changes

### 2024-01-30

- Consolidated state transition logic to single source of truth
- Removed duplicate state definitions
- Improved type safety in error message handling
- Fixed ERROR_MESSAGES export/import conflicts

## Type System

The service uses TypeScript's type system extensively:

```typescript
type StateTransitionMap = {
  [K in AudioServiceStateType]?: {
    [E in AudioServiceEventType]?: AudioServiceStateType;
  };
};

type AudioErrorDetails = {
  code: AudioServiceErrorType;
  category: AudioErrorCategoryType;
  message: string;
  retryable: boolean;
  originalError?: Error;
};
```

## Usage Example

```typescript
import { AudioStateManager } from "@/services/audio-state";

const audioManager = AudioStateManager.getInstance();

// Initialize audio
audioManager.transition(AudioServiceEvent.INITIALIZE);

// Start recording
if (audioManager.getState().state === AudioServiceState.READY) {
  audioManager.transition(AudioServiceEvent.RECORDING_START);
}
```

## Error Recovery

Each error type has an associated recovery hint:

```typescript
const ERROR_RECOVERY_HINTS = {
  INITIALIZATION_FAILED: "Try again later or check your internet connection.",
  RECORDING_FAILED: "Try again later or check your audio settings.",
  // ...
};
```

## Testing

For testing guidelines and examples, see [Testing Guide](./testing.md).

## Contributing

When making changes:

1. Maintain type safety
2. Update state transitions in the central `stateTransitions` map
3. Add appropriate error recovery hints
4. Update this documentation

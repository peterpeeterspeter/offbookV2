# Codebase Architecture

## Service Architecture

```mermaid
classDiagram
    class BaseService~T~ {
        <<interface>>
        +getState() ServiceState~T~
        +addStateListener(listener) Function
        +removeStateListener(listener) void
    }

    class ServiceState~T~ {
        <<interface>>
        +state: string
        +error?: ServiceError
        +context: T
    }

    class ServiceError {
        <<interface>>
        +code: string
        +message: string
        +details?: unknown
    }

    class AudioService {
        <<interface>>
        +setup() Promise~void~
        +cleanup() Promise~void~
        +initializeTTS(sessionId, userRole) Promise~void~
        +startRecording(sessionId) Promise~void~
        +stopRecording(sessionId) Promise~RecordingResult~
        +processAudioChunk(sessionId, chunk) Promise~boolean~
        +generateSpeech(params) Promise~Float32Array~
        +transcribe(audioData) Promise~TranscriptionResult~
        +detectEmotion(audioData) Promise~EmotionResult~
    }

    class AudioServiceImpl {
        -instance: AudioServiceImpl
        -audioContext: AudioContext
        -mediaRecorder: MediaRecorder
        -mediaStream: MediaStream
        -audioChunks: Blob[]
        -stateManager: AudioStateManager
        -vadService: VADService
        -isCleaningUp: boolean
        -currentSession: RecordingSession
        -ttsInitialized: boolean
        -state: AudioServiceStateData
        -listeners: Function[]
        +getInstance() AudioServiceImpl
        +getState() AudioServiceStateData
        -initializeState() void
        -handleError(error, code, category) never
    }

    class AudioStateManager {
        -instance: AudioStateManager
        -state: AudioServiceStateData
        +getInstance() AudioStateManager
        +getState() AudioServiceStateData
        +restore() void
        +transition(event, data?) void
        -createError(code, details) AudioErrorDetails
    }

    class VADService {
        -config: VADConfig
        +initialize(stream) Promise~void~
        +start() Promise~void~
        +stop() Promise~void~
        +addStateListener(listener) Function
        +removeStateListener(listener) void
    }

    BaseService <|-- AudioService
    AudioService <|.. AudioServiceImpl
    AudioServiceImpl --> AudioStateManager
    AudioServiceImpl --> VADService
    AudioServiceImpl ..> ServiceState
    AudioServiceImpl ..> ServiceError
    AudioStateManager ..> ServiceState
```

## State and Event Flow

```mermaid
stateDiagram-v2
    [*] --> UNINITIALIZED
    UNINITIALIZED --> INITIALIZING: INITIALIZE
    INITIALIZING --> READY: INITIALIZED
    INITIALIZING --> ERROR: ERROR
    READY --> RECORDING: RECORDING_START
    RECORDING --> READY: RECORDING_STOP
    RECORDING --> ERROR: ERROR
    ERROR --> UNINITIALIZED: CLEANUP
    READY --> UNINITIALIZED: CLEANUP
```

## Type Hierarchy

```mermaid
classDiagram
    class ServiceError {
        +code: string
        +message: string
        +details?: unknown
    }

    class AudioErrorDetails {
        +code: AudioServiceError
        +category: AudioErrorCategory
        +details?: Record~string,unknown~
        +name?: string
        +retryable?: boolean
    }

    class AudioServiceContext {
        +vadBufferSize: number
        +noiseThreshold: number
        +silenceThreshold: number
        +audioContext?: AudioContext
        +sampleRate: number
        +channelCount: number
        +latencyHint?: string
        +vadEnabled?: boolean
        +vadThreshold?: number
        +vadSampleRate?: number
        +isContextRunning?: boolean
    }

    class AudioServiceStateData {
        +state: AudioServiceState
        +error?: ServiceError
        +context: AudioServiceContext
        +isContextRunning: boolean
        +sampleRate: number
        +batteryLevel?: number
        +networkQuality?: number
        +vad?: VADState
    }

    ServiceError <|-- AudioErrorDetails
    ServiceState~AudioServiceContext~ <|-- AudioServiceStateData
```

## Configuration Types

```mermaid
classDiagram
    class AudioConfig {
        +sampleRate: number
        +channelCount: number
        +latencyHint?: string
    }

    class VADConfig {
        +sampleRate: number
        +bufferSize: number
        +noiseThreshold: number
        +silenceThreshold: number
    }

    class TTSConfig {
        +provider: string
        +config: ElevenLabsConfig
    }

    class ElevenLabsConfig {
        +apiKey: string
        +modelId: string
    }

    class VADState {
        +enabled: boolean
        +threshold: number
        +sampleRate: number
        +bufferSize: number
        +active: boolean
        +speaking?: boolean
        +noiseLevel?: number
        +lastActivity?: number
        +confidence?: number
        +lastVoiceDetectedAt?: number
    }

    TTSConfig --> ElevenLabsConfig
```

## Session and Result Types

```mermaid
classDiagram
    class RecordingSession {
        +id: string
        +startTime: number
        +duration: number
        +audioData: Float32Array
    }

    class RecordingResult {
        +audioData: Float32Array
        +duration: number
        +hasVoice: boolean
        +metrics?: RecordingMetrics
    }

    class RecordingMetrics {
        +averageAmplitude: number
        +peakAmplitude: number
        +silenceRatio: number
        +processingTime: number
    }

    class TTSParams {
        +text: string
        +voice: string
        +settings?: TTSSettings
    }

    class TTSSettings {
        +speed: number
        +pitch: number
        +volume: number
    }

    RecordingResult --> RecordingMetrics
    TTSParams --> TTSSettings
```

This architecture documentation shows:

1. The core service architecture and inheritance relationships
2. The state machine and event flow of the audio service
3. The type hierarchy and relationships between different interfaces
4. Configuration types used throughout the system
5. Session and result types for recording and TTS operations

The diagrams illustrate how the different components interact and how state flows through the system, making it easier to understand the overall architecture and relationships between different parts of the codebase.

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Client["Client Browser"]
        UI["React UI Components"]
        AudioImpl["AudioServiceImpl"]
        VAD["VAD Service"]
        WebAudio["Web Audio API"]
        MediaRecorder["Media Recorder API"]
    end

    subgraph External["External Services"]
        WhisperAPI["Whisper API\nTranscription Service"]
        ElevenLabsAPI["ElevenLabs API\nText-to-Speech"]
        EmotionAPI["Emotion Detection API"]
    end

    UI --> AudioImpl
    AudioImpl --> WebAudio
    AudioImpl --> MediaRecorder
    AudioImpl --> VAD
    AudioImpl --> WhisperAPI
    AudioImpl --> ElevenLabsAPI
    AudioImpl --> EmotionAPI
    WebAudio --> MediaRecorder

    classDef browser fill:#f9f,stroke:#333,stroke-width:2px
    classDef service fill:#bbf,stroke:#333,stroke-width:2px
    class Client browser
    class External service
```

## System Requirements

### Client-Side Requirements

- Modern web browser with support for:
  - Web Audio API
  - MediaRecorder API
  - WebRTC getUserMedia
  - WebSocket (for real-time communication)
- Minimum browser versions:
  - Chrome 74+
  - Firefox 71+
  - Safari 14.1+
  - Edge 79+

### API Dependencies

1. **Whisper API**

   - Purpose: Speech-to-text transcription
   - Authentication: API key required
   - Rate limits: Based on subscription tier

2. **ElevenLabs API**

   - Purpose: Text-to-speech synthesis
   - Authentication: API key required
   - Rate limits: Based on subscription tier
   - Voice model requirements: Pre-trained models available

3. **Emotion Detection API**
   - Purpose: Audio emotion analysis
   - Authentication: API key required
   - Rate limits: Based on subscription tier

### Performance Requirements

- Audio processing:
  - Sample rate: 44.1kHz or 48kHz
  - Bit depth: 16-bit
  - Channels: Mono/Stereo supported
- Voice Activity Detection (VAD):
  - Buffer size: 2048 samples
  - Processing latency: < 100ms
- Network:
  - Minimum bandwidth: 1 Mbps upload/download
  - Maximum latency: 200ms

## Deployment Steps

1. **Environment Setup**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys:
# WHISPER_API_KEY=your_key
# ELEVENLABS_API_KEY=your_key
# EMOTION_API_KEY=your_key
```

2. **Development Build**

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

3. **Production Deployment**

```bash
# Deploy to production
npm run deploy

# Monitor logs
npm run logs
```

4. **Health Checks**

- Audio system initialization status
- API connectivity tests
- Media device permissions
- WebRTC functionality
- Memory usage monitoring

## Error Recovery

The system implements multiple layers of error recovery:

1. **Connection Issues**

   - Automatic retry with exponential backoff
   - Fallback to cached responses where applicable
   - Graceful degradation of features

2. **Device Errors**

   - Automatic device re-initialization
   - Alternative device selection
   - Clear user feedback and recovery instructions

3. **API Failures**

   - Circuit breaker pattern implementation
   - Queueing of failed requests
   - Alternate API endpoint fallback

4. **Resource Constraints**
   - Automatic cleanup of unused resources
   - Memory usage optimization
   - Background task throttling

## Monitoring and Logging

The system implements comprehensive monitoring:

1. **Performance Metrics**

   - Audio processing latency
   - API response times
   - Memory usage
   - CPU utilization

2. **Error Tracking**

   - API failure rates
   - Device initialization errors
   - Processing pipeline errors

3. **Usage Analytics**

   - Session duration
   - Feature utilization
   - User interaction patterns

4. **Quality Metrics**
   - Audio quality scores
   - Transcription accuracy
   - Emotion detection confidence

The deployment architecture ensures scalability, reliability, and maintainable code structure while providing comprehensive error handling and monitoring capabilities.

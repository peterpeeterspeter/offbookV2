# Configuration System Documentation

## Overview

The configuration system provides a type-safe, validated way to manage environment variables and feature flags for the AI Actor Practice Platform. It supports different environments (development, production) and includes comprehensive validation.

## Configuration Files

- `.env.local`: Local development overrides
- `.env.development`: Development environment defaults
- `.env.production`: Production environment settings

## Configuration Categories

### Daily.co Configuration
```env
NEXT_PUBLIC_DAILY_API_KEY=your_daily_api_key_here
NEXT_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
NEXT_PUBLIC_DAILY_ROOM_URL=https://your-domain.daily.co/practice-room
```

### AI Services
```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### AI Emotion Settings
```env
NEXT_PUBLIC_AI_DEFAULT_TONE=neutral
NEXT_PUBLIC_AI_ENABLE_EMOTION_MODULATION=true
NEXT_PUBLIC_AI_EMOTION_INTENSITY=5
```

### AI Speech Settings
```env
NEXT_PUBLIC_AI_OFFLINE_MODE=true
NEXT_PUBLIC_AI_WHISPER_MODEL=tiny
NEXT_PUBLIC_AI_ENABLE_CACHE=true
NEXT_PUBLIC_AI_MAX_CACHED_LINES=10
```

### Audio Processing
```env
NEXT_PUBLIC_AUDIO_SAMPLE_RATE=48000
NEXT_PUBLIC_VAD_THRESHOLD=0.5
NEXT_PUBLIC_VAD_WINDOW_SIZE=30
NEXT_PUBLIC_ENABLE_NOISE_SUPPRESSION=true
NEXT_PUBLIC_ENABLE_ECHO_CANCELLATION=true
NEXT_PUBLIC_ENABLE_AUTO_GAIN=true
```

## Usage in Components

### Basic Usage
```typescript
import { useConfig } from '@/hooks/use-config';

function MyComponent() {
  const { config, isValid, errors } = useConfig();
  
  if (!isValid) {
    return <div>Configuration Error: {errors[0]?.message}</div>;
  }
  
  return <div>Using config: {config.audio.sampleRate}</div>;
}
```

### Feature Flags
```typescript
function FeatureComponent() {
  const { isFeatureEnabled } = useConfig();
  
  if (!isFeatureEnabled('enableEmotionDetection')) {
    return null;
  }
  
  return <div>Emotion Detection Enabled</div>;
}
```

### Debug Mode
```typescript
function DebugComponent() {
  const { isDebugEnabled } = useConfig();
  
  if (isDebugEnabled('debugAudio')) {
    console.log('Audio debugging enabled');
  }
}
```

## Validation Rules

### Daily.co Configuration
- API key is required
- Domain is required
- Room URL must be valid

### AI Configuration
- ElevenLabs API key required when emotion detection is enabled
- DeepSeek API key required when script analysis is enabled
- Emotion intensity must be between 1 and 10
- Maximum cached lines must be at least 1

### Audio Configuration
- Sample rate must be 44100 or 48000
- VAD threshold must be between 0 and 1

### WebRTC Configuration
- At least one ICE server required
- Metrics interval must be at least 100ms
- Max reconnect attempts must be at least 1

### Cache Configuration
- Duration must be non-negative
- Max size must be at least 1

### Feature Dependencies
- Offline mode requires speech offline mode
- Emotion detection requires emotion modulation
- Real-time feedback requires real-time collaboration

## CLI Tools

### Configuration Validator
```bash
npm run validate-config
```

This tool:
- Checks for required configuration files
- Validates all configuration values
- Reports any validation errors
- Verifies environment-specific settings

## Security Considerations

1. API Keys
   - Never commit API keys to version control
   - Use environment-specific files for sensitive data
   - Rotate keys regularly

2. Environment Variables
   - Only expose necessary variables to the client
   - Use NEXT_PUBLIC_ prefix for client-side variables
   - Keep sensitive configuration server-side

3. Validation
   - Always validate configuration at runtime
   - Log validation errors in development
   - Fail fast in production for critical configuration errors

## Best Practices

1. Environment Files
   - Keep `.env.example` up to date
   - Document all variables
   - Use specific values for development

2. Feature Flags
   - Use for gradual rollouts
   - Enable/disable experimental features
   - Control performance optimizations

3. Debug Settings
   - Use for development and testing
   - Disable in production
   - Log appropriately

4. Type Safety
   - Use TypeScript interfaces
   - Validate at runtime
   - Keep types in sync with validation 
# AI Actor Practice Platform

A real-time platform for actors to practice their craft with AI-powered feedback and emotion analysis.

## Features

- 🎭 Real-time emotion analysis using DeepSeek
- 🎙️ High-quality audio streaming with WebRTC (Daily.co)
- 📊 Live audio level visualization
- 💬 Instant performance feedback
- 🌙 Dark/Light mode support
- 🎯 Frame-based audio processing pipeline
- 🔄 Real-time state management
- 🚀 Low-latency audio processing

## Tech Stack

- **Frontend**:
  - Next.js 14 with TypeScript
  - Tailwind CSS with shadcn/ui components
  - WebRTC integration via Daily.co
  - React Query for API state management

- **Backend**:
  - Pipecat for audio processing pipeline
  - FastAPI for REST endpoints
  - WebSocket support for real-time communication

- **AI Services**:
  - ElevenLabs for Text-to-Speech
  - DeepSeek for emotion analysis
  - Whisper for speech recognition
  - Custom CNN for emotion classification

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── practice/          # Practice session pages
│   │   ├── practice-room.tsx
│   │   └── layout.tsx         # Root layout with providers
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── practice-session/  # Practice session components
│   │   ├── practice-room.tsx
│   │   └── audio-level-indicator.tsx
│   └── ui/               # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       └── toast.tsx
├── lib/
│   ├── hooks/            # Custom React hooks
│   │   └── use-daily-call.ts
│   └── utils.ts          # Utility functions
└── styles/
    └── globals.css       # Global styles and Tailwind

backend/
├── pipelines/           # Pipecat pipeline definitions
├── services/           # AI service integrations
├── models/            # Data models and schemas
└── utils/             # Helper functions
```

## Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-actor-practice
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file:
```env
NEXT_PUBLIC_DAILY_ROOM_URL=your_daily_room_url
ELEVENLABS_API_KEY=your_elevenlabs_key
DEEPSEEK_API_KEY=your_deepseek_key
```

4. **Run the development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
npm start
```

## Key Components

### PracticeRoom
The main component for practice sessions, handling:
- WebRTC audio streaming
- Real-time audio level monitoring
- Connection state management
- Error handling

### Audio Pipeline
Frame-based processing pipeline featuring:
- Voice activity detection
- Audio quality analysis
- Emotion analysis
- Performance feedback

### AI Integration
Multiple AI services working together:
- Real-time emotion analysis
- Speech-to-text conversion
- Performance scoring
- Feedback generation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Daily.co for WebRTC infrastructure
- ElevenLabs for TTS capabilities
- DeepSeek for emotion analysis
- OpenAI for Whisper ASR 
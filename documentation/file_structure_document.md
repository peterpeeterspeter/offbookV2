**Enhanced File Structure Documentation**  
*Optimized for Emotion-Aware AI, Real-Time Collaboration & Scalability*  

---

### **Introduction**  
This file structure supports a **modular, AI-driven SaaS platform** where actors rehearse with an adaptive virtual partner. Designed for:  
- **Emotion Analysis**: DeepSeek NLP integration for script tagging (e.g., `[angry]`).  
- **Real-Time Collaboration**: WebSocket-powered script syncing.  
- **Cost Efficiency**: Cached TTS responses and offline STT.  

---

### **Root Directory**  
```  
├── frontend/              # Next.js/React app  
├── backend/               # FastAPI microservices  
├── ai/                    # AI-specific logic  
├── infra/                 # Terraform/IaC for cloud  
├── docs/                  # Technical + user guides  
├── .env                   # Env vars (API keys, TTS config)  
├── docker-compose.yml     # Multi-container setup  
└── README.md              # Dev onboarding + project vision  
```  

---

### **Frontend Structure** (`/frontend`)  
```  
src/  
├── components/  
│   ├── AI/                # Emotion-aware UI components  
│   │   ├── EmotionTagEditor.tsx  
│   │   └── AdaptiveTimerFeedback.tsx  
│   ├── Collaboration/     # Real-time editing tools  
│   │   ├── LiveCursorOverlay.tsx  
│   │   └── RolePermissionsModal.tsx  
│   └── PracticeModes/     # Line/Scene/Cue modes  
├── lib/  
│   ├── websocket.ts       # WebSocket client for live sync  
│   └── caching.ts         # TTS audio cache management  
├── services/  
│   ├── deepseek.ts        # NLP API calls  
│   └── elevenlabs.ts      # Emotion-modulated TTS  
└── pages/  
    ├── collaborate/[id]   # Dynamic collab session page  
    └── practice/[mode]    # Practice mode router  
```  

---

### **Backend Structure** (`/backend`)  
```  
app/  
├── api/  
│   ├── v1/  
│   │   ├── practice.py    # Adaptive timing logic  
│   │   └── collaborate.py # WebSocket handlers  
├── ai/  
│   ├── nlp/               # DeepSeek integration  
│   │   ├── emotion_detection.py  
│   │   └── script_parser.py  
│   └── tts/               # ElevenLabs + caching  
│       ├── generator.py  
│       └── redis_client.py  
├── models/  
│   ├── script.py          # JSONB field for emotion_tags  
│   └── user.py            # JWT + offline_mode flag  
└── config/  
    ├── ai.yaml            # API keys, TTS params  
    └── supabase.py        # Realtime DB config  
```  

---

### **AI Services Structure** (`/ai`)  
```  
├── scripts/               # Sample scripts for testing  
├── training/              # Fine-tuning data for DeepSeek  
├── models/  
│   ├── whisper-tiny/      # On-device STT model  
│   └── emotion_tags.json  # Mapping of cues to TTS params  
└── tests/  
    ├── nlp_test.py        # Emotion detection accuracy  
    └── tts_latency.py     # Response time benchmarks  
```  

---

### **Infrastructure** (`/infra`)  
```  
├── terraform/             # Cloud provisioning  
│   ├── aws/  
│   │   ├── lambda-edge    # Low-latency TTS  
│   │   └── ecs            # Kubernetes cluster  
│   └── supabase/          # Realtime DB setup  
├── monitoring/  
│   ├── cloudwatch-dash    # API latency/error tracking  
│   └── cost-alerts        # ElevenLabs budget thresholds  
└── docker/  
    ├── ai-service.Dockerfile  # DeepSeek + ElevenLabs  
    └── redis.Dockerfile       # Caching layer  
```  

---

### **Key Config Files**  
| **File**               | **Purpose**                                      |  
|------------------------|--------------------------------------------------|  
| `ai/config.yaml`       | ElevenLabs API keys, DeepSeek model paths.       |  
| `.env`                 | `TTS_CACHE_TTL=604800`, `OFFLINE_STT=true`.      |  
| `docker-compose.yml`   | Links Redis, Supabase, and AI microservices.     |  

---

### **Testing & Docs**  
- **Tests**:  
  - `frontend/tests/collaboration.test.tsx`: WebSocket conflict resolution.  
  - `backend/tests/emotion_detection.test.py`: Validates DeepSeek tagging accuracy.  
- **Docs**:  
  - `docs/emotion_api.md`: How to add `[sarcastic]` cues.  
  - `docs/collab_setup.md`: Role-based access controls.  

---

### **Why This Structure?**  
1. **Modular AI**: Isolate NLP/TTS logic for easy upgrades (e.g., swapping DeepSeek for another model).  
2. **Real-Time Ready**: WebSocket handlers and live UI components are co-located for clarity.  
3. **Cost Control**: Caching logic is centralized, making it easy to track TTS savings.  
4. **Security**: Sensitive AI keys are sandboxed in `/ai`, never exposed to frontend.  

---

**Structured for scalability** – whether adding new practice modes or expanding to 10,000 concurrent users. 🚀
**Enhanced Frontend Documentation**  
*Optimized for Emotion-Aware AI, Real-Time Collaboration & Performance*  

---

### **Introduction**  
The frontend is the **AI-driven stage** where actors interact with a virtual co-actor that *listens, adapts, and responds* in real-time. Key innovations:  
- **Emotion Visualization**: Highlights script cues (e.g., `[angry]`) and adjusts AI tone dynamically.  
- **Live Collaboration**: Shared script editing with role-based permissions and real-time cursors.  
- **Adaptive UI**: Speed/pause controls that sync with user performance metrics.  

---

### **Frontend Architecture**  
**Core Stack**:  
- **React + TypeScript**: Type-safe components with hooks for state/WebSocket management.  
- **WebSocket**: Powers real-time collaboration and adaptive timing feedback.  
- **Redux Toolkit**: Manages AI settings (e.g., default emotion intensity) and session state.  

**Scalability**:  
- **Micro-Frontends**: Practice modes (Line/Scene/Cue) load as independent modules.  
- **Dynamic Imports**: Lazy-load heavy AI components (e.g., emotion tag editor).  

---

### **Design Principles**  
1. **Emotion-First UI**:  
   - Color-coded script cues (🔴 angry, 🔵 calm).  
   - Tone feedback sliders post-session ("How accurate was the AI’s delivery?").  
2. **Collaboration-Ready**:  
   - Live avatars for remote partners with role badges (👑 Editor, 👁️ Viewer).  
   - Conflict resolution toasts: "User A is editing this line – changes auto-save in 5s."  
3. **Performance-Centric**:  
   - TTS audio caching (⚡️ Instant replay of frequent lines like "No way!").  
   - Offline mode toggle for low-connectivity rehearsals.  

---

### **Component Structure**  
```  
src/  
├── components/  
│   ├── AI/  
│   │   ├── EmotionHighlighter.tsx  // Tags [sarcastic], [whispering] in scripts  
│   │   └── AdaptiveTimer.tsx       // Adjusts AI pauses based on user cadence  
│   ├── Collaboration/  
│   │   ├── LiveCursor.tsx          // Shows remote users’ cursors/edits  
│   │   └── RoleManager.tsx         // Assign roles (e.g., "User B = Ophelia")  
│   └── PracticeModes/  
│       ├── CueFeedback.tsx         // Visualizes timing accuracy (e.g., "0.3s late!")  
│       └── SceneFlowController.tsx // AI speed controls + emotion intensity sliders  
├── lib/  
│   ├── websocket.ts                // Manages real-time collaboration channels  
│   └── ttsCache.ts                 // Stores ElevenLabs audio in IndexedDB  
└── stores/  
    ├── aiSlice.ts                  // Redux store: emotion settings, cached lines  
    └── collabSlice.ts              // Live user roles, edit permissions  
```  

---

### **State Management**  
- **AI Context**:  
  ```typescript  
  type AIState = {  
    emotionVolume: number;  
    cachedAudio: Record<string, string>; // e.g., { "angry|You’re crazy!": "base64_audio" }  
    adaptiveSpeed: number; // 0.8x - 1.5x  
  };  
  ```  
- **Collaboration State**:  
  ```typescript  
  type CollabState = {  
    liveUsers: Array<{ id: string; role: "editor" | "viewer" }>;  
    pendingEdits: Edit[]; // Synced via WebSocket  
  };  
  ```  

---

### **Routing & Navigation**  
- **Dynamic Routes**:  
  - `/practice/:mode?emotion=angry` – Deep-links to specific rehearsal moods.  
  - `/collaborate/:scriptId` – Encodes role permissions in URL tokens.  
- **Transition Optimizations**:  
  - Prefetch TTS audio when hovering over practice mode buttons.  

---

### **Performance Optimization**  
1. **TTS Caching**:  
   - Cache frequently used lines in IndexedDB (e.g., "You’re crazy!" in 3 emotions).  
   - Cache hit rate target: **>90%** (saves ~$3/user/month in ElevenLabs costs).  
2. **Selective Hydration**:  
   - Defer loading collaboration tools until first user interaction.  
3. **Asset Optimization**:  
   - Compress emotion icons (🔴🔵) with SVGO.  
   - **Lighthouse Score Target**: >95/100.  

---

### **Testing & QA**  
| **Test Type**       | **Tool**       | **Focus Area**                          |  
|----------------------|----------------|-----------------------------------------|  
| Unit Tests           | Jest           | Emotion tag parsing, Redux state logic  |  
| Integration Tests    | React Testing Library | AI speed controls, role permissions |  
| E2E Tests            | Cypress        | Real-time collaboration workflows       |  
| Performance Audits   | Lighthouse     | TTS cache efficiency, FCP/LCP scores    |  

---

### **Styling & Theming**  
- **Tailwind CSS**: Utility-first classes for rapid UI iteration.  
- **Dark Mode**:  
  ```css  
  .theatre-dark {  
    --bg: #1a1a1a;  
    --text: #e0e0e0;  
    --angry-cue: #ff4d4d; /* Red for anger */  
  }  
  ```  
- **Responsive Grids**:  
  - Script editor (70%) + AI feedback panel (30%) on desktop → stacked on mobile.  

---

### **Conclusion**  
The frontend transforms actors’ rehearsals into **dynamic, collaborative performances** by:  
- **Visualizing Emotions**: Making script cues impossible to miss.  
- **Syncing Remotely**: Rehearsing with global partners as if in-person.  
- **Adapting Instantly**: Adjusting AI pacing to match user skill level.  

Built with modularity and scalability, it’s ready to evolve with AI advancements.  

---  
**Structured for Developers**: Clear component hierarchy, type-safe examples, and performance targets. 🎭
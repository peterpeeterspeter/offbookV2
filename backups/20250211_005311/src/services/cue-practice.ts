import { AudioService } from './audio-service';
import { ScriptAnalysisService } from './script-analysis';

export interface Cue {
  id: string;
  type: 'line' | 'direction' | 'emotion';
  text: string;
  emotion?: string;
  timing?: {
    expectedDelay: number;
    actualDelay?: number;
  };
  associatedLineId: string;
}

export interface CueSession {
  id: string;
  scriptId: string;
  userRole: string;
  cues: Cue[];
  currentCueIndex: number;
  settings: CueSettings;
  stats: CueStats;
}

export interface CueSettings {
  useAudioSignal: boolean;
  showEmotionIndicators: boolean;
  autoAdvance: boolean;
  minDelay: number;  // Minimum delay between cues in ms
  maxDelay: number;  // Maximum delay before marking as late
}

export interface CueStats {
  totalCues: number;
  completedCues: number;
  timingScores: number[];
  emotionMatches: number;
  averageDelay: number;
}

export interface CueResponse {
  cueId: string;
  timing: {
    cueStart: number;
    responseStart: number;
    responseEnd: number;
  };
  transcription: string;
  emotion?: string;
  confidence: number;
}

export class CuePracticeService {
  private sessions: Map<string, CueSession>;
  private responses: Map<string, CueResponse[]>;
  private audioService: AudioService;
  private scriptService: ScriptAnalysisService;
  private audioContext: AudioContext;
  private cueSignal?: AudioBuffer;

  constructor(audioService: AudioService, scriptService: ScriptAnalysisService) {
    this.audioService = audioService;
    this.scriptService = scriptService;
    this.sessions = new Map();
    this.responses = new Map();
    this.audioContext = new AudioContext();
    this.loadCueSignal();
  }

  private async loadCueSignal(): Promise<void> {
    // Load a subtle "ding" sound for cues
    const response = await fetch('/assets/audio/cue-signal.mp3');
    const arrayBuffer = await response.arrayBuffer();
    this.cueSignal = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  async initializeSession(
    sessionId: string,
    scriptId: string,
    userRole: string,
    settings?: Partial<CueSettings>
  ): Promise<CueSession> {
    // Get script details
    const script = await this.scriptService.getScriptDetails(scriptId);

    // Extract cues
    const cues = await this.extractCues(script, userRole);

    // Create session
    const session: CueSession = {
      id: sessionId,
      scriptId,
      userRole,
      cues,
      currentCueIndex: 0,
      settings: {
        useAudioSignal: true,
        showEmotionIndicators: true,
        autoAdvance: true,
        minDelay: 500,  // 500ms minimum between cues
        maxDelay: 2000, // 2s before marking as late
        ...settings
      },
      stats: {
        totalCues: cues.length,
        completedCues: 0,
        timingScores: [],
        emotionMatches: 0,
        averageDelay: 0
      }
    };

    this.sessions.set(sessionId, session);
    this.responses.set(sessionId, []);

    // Initialize audio recording
    await this.audioService.startRecording(sessionId);

    return session;
  }

  private async extractCues(script: any, userRole: string): Promise<Cue[]> {
    const cues: Cue[] = [];
    let cueIndex = 0;

    for (const scene of script.scenes) {
      for (const dialogue of scene.dialogue) {
        if (dialogue.role !== userRole) {
          // Add opponent line as cue
          cues.push({
            id: `cue_${cueIndex++}`,
            type: 'line',
            text: dialogue.text,
            emotion: dialogue.emotion,
            associatedLineId: dialogue.id,
            timing: {
              expectedDelay: this.calculateExpectedDelay(dialogue.text)
            }
          });
        }
        // Add emotional/directional cues
        if (dialogue.directions) {
          for (const direction of dialogue.directions) {
            cues.push({
              id: `cue_${cueIndex++}`,
              type: 'direction',
              text: direction,
              associatedLineId: dialogue.id,
              timing: {
                expectedDelay: 1000 // Default 1s delay for directions
              }
            });
          }
        }
      }
    }

    return cues;
  }

  private calculateExpectedDelay(text: string): number {
    // Base delay on text length and complexity
    const words = text.split(' ').length;
    const baseDelay = 500; // Base 500ms
    const perWordDelay = 100; // Add 100ms per word
    return baseDelay + (words * perWordDelay);
  }

  async triggerNextCue(sessionId: string): Promise<Cue | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.currentCueIndex >= session.cues.length) {
      return undefined; // No more cues
    }

    const cue = session.cues[session.currentCueIndex];

    // Play audio signal if enabled
    if (session.settings.useAudioSignal && this.cueSignal) {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.cueSignal;
      source.connect(this.audioContext.destination);
      source.start();
    }

    // Start timing for this cue
    cue.timing = {
      ...cue.timing!,
      actualDelay: Date.now()
    };

    session.currentCueIndex++;
    return cue;
  }

  async processCueResponse(
    sessionId: string,
    cueId: string,
    audioData: ArrayBuffer
  ): Promise<CueResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const cue = session.cues.find(c => c.id === cueId);
    if (!cue) throw new Error('Cue not found');

    // Analyze response
    const transcription = await this.audioService.transcribe(audioData);
    const emotion = await this.audioService.detectEmotion(audioData);

    const response: CueResponse = {
      cueId,
      timing: {
        cueStart: cue.timing!.actualDelay!,
        responseStart: Date.now() - 2000, // Approximate based on audio length
        responseEnd: Date.now()
      },
      transcription: transcription.text,
      emotion: emotion?.type,
      confidence: transcription.confidence
    };

    // Store response
    const responses = this.responses.get(sessionId);
    if (responses) {
      responses.push(response);
    }

    // Update stats
    await this.updateStats(sessionId, cue, response);

    return response;
  }

  private async updateStats(
    sessionId: string,
    cue: Cue,
    response: CueResponse
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Calculate timing score (0-1)
    const actualDelay = response.timing.responseStart - response.timing.cueStart;
    const timingScore = Math.max(0, 1 - Math.abs(actualDelay - cue.timing!.expectedDelay) / 1000);

    // Update session stats
    session.stats.completedCues++;
    session.stats.timingScores.push(timingScore);

    // Check emotion match if applicable
    if (cue.emotion && response.emotion) {
      if (response.emotion.toLowerCase() === cue.emotion.toLowerCase()) {
        session.stats.emotionMatches++;
      }
    }

    // Update average delay
    const totalDelay = session.stats.timingScores.reduce((a, b) => a + b, 0);
    session.stats.averageDelay = totalDelay / session.stats.timingScores.length;
  }

  getSessionStats(sessionId: string): CueStats | undefined {
    return this.sessions.get(sessionId)?.stats;
  }

  async endSession(sessionId: string): Promise<CueStats | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Stop recording
    await this.audioService.stopRecording(sessionId);

    // Clean up
    this.sessions.delete(sessionId);
    this.responses.delete(sessionId);

    return session.stats;
  }
}

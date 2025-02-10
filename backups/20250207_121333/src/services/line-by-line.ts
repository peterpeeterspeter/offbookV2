import { AudioService } from './audio-service';
import { ScriptAnalysisService } from './script-analysis';

export interface TeleprompterLine {
  id: string;
  text: string;
  role: string;
  emotion?: string;
  isUserLine: boolean;
  status: 'previous' | 'current' | 'next' | 'hidden';
  timing?: {
    start: number;
    duration: number;
    delay: number;
  };
  style?: LineStyle;
  scrollOffset?: number;
}

export interface TeleprompterState {
  currentLineIndex: number;
  visibleLines: TeleprompterLine[];
  contextWindow: {
    previous: number;
    next: number;
  };
  autoScroll: boolean;
  scrollSpeed: number;
}

export interface LineByLineControls {
  isPaused: boolean;
  repeatMode: boolean;
  autoAdvance: boolean;
  showEmotions: boolean;
  contextSize: number;
}

export interface PracticeStats {
  totalLines: number;
  completedLines: number;
  repeatedLines: Array<{
    lineId: string;
    repeatCount: number;
    averageDelay: number;
  }>;
  timing: {
    startTime: number;
    totalPauseDuration: number;
    averageLineDelay: number;
  };
}

export interface SpeechAnalysis {
  text: string;
  confidence: number;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  emotion?: {
    type: string;
    intensity: number;
  };
  pronunciation: {
    score: number;
    feedback: string[];
    phonemes: Array<{
      expected: string;
      actual: string;
      score: number;
    }>;
  };
  performance: {
    pace: number;  // Words per minute
    fluency: number;  // 0-1 score
    expressiveness: number;  // 0-1 score
    matchesEmotion: boolean;
  };
}

export interface LineStyle {
  fontSize: string;
  opacity: number;
  highlight: boolean;
  transition: string;
}

export interface UIConfig {
  currentLine: LineStyle;
  previousLine: LineStyle;
  nextLine: LineStyle;
  hiddenLine: LineStyle;
  scrollBehavior: {
    duration: number;
    easing: string;
  };
}

export interface WhisperTranscription {
  text: string;
  confidence: number;
  emotion?: string;
}

export interface RecordingSession {
  audioData: ArrayBuffer;
  transcription: WhisperTranscription;
  timing: {
    start: number;
    end?: number;
  };
}

export interface DetailedStats extends PracticeStats {
  pronunciationScores: number[];
  emotionMatches: number;
  totalAttempts: number;
}

export interface AudioService {
  transcribe(audioData: ArrayBuffer): Promise<WhisperTranscription>;
  comparePhonemes(actual: string, expected: string): Promise<Array<{
    expected: string;
    actual: string;
    score: number;
  }>>;
  detectEmotion(audioData: ArrayBuffer): Promise<{
    type: string;
    intensity: number;
  }>;
}

export class LineByLineService {
  private teleprompterStates: Map<string, TeleprompterState>;
  private controls: Map<string, LineByLineControls>;
  private stats: Map<string, PracticeStats>;
  private audioService: AudioService;
  private scriptService: ScriptAnalysisService;
  private cachedAudio: Map<string, ArrayBuffer>;
  private speechAnalyses: Map<string, Map<string, SpeechAnalysis>>;
  private uiConfig: Map<string, UIConfig>;
  private detailedStats: Map<string, DetailedStats>;

  constructor(audioService: AudioService, scriptService: ScriptAnalysisService) {
    this.audioService = audioService;
    this.scriptService = scriptService;
    this.teleprompterStates = new Map();
    this.controls = new Map();
    this.stats = new Map();
    this.cachedAudio = new Map();
    this.speechAnalyses = new Map();
    this.uiConfig = new Map();
    this.detailedStats = new Map();
  }

  async initializeSession(
    sessionId: string,
    scriptId: string,
    userRole: string,
    initialControls: Partial<LineByLineControls> = {},
    uiConfig?: Partial<UIConfig>
  ): Promise<void> {
    // Get script details
    const script = await this.scriptService.getScriptDetails(scriptId);

    // Initialize teleprompter state
    const lines = await this.parseScriptLines(script, userRole);
    this.teleprompterStates.set(sessionId, {
      currentLineIndex: 0,
      visibleLines: lines.slice(0, 5).map((line, index) => ({
        ...line,
        status: index === 0 ? 'current' : index < 0 ? 'previous' : 'next'
      })),
      contextWindow: {
        previous: 2,
        next: 2
      },
      autoScroll: true,
      scrollSpeed: 1.0
    });

    // Initialize controls
    this.controls.set(sessionId, {
      isPaused: false,
      repeatMode: false,
      autoAdvance: true,
      showEmotions: true,
      contextSize: 2,
      ...initialControls
    });

    // Initialize stats
    this.stats.set(sessionId, {
      totalLines: lines.length,
      completedLines: 0,
      repeatedLines: [],
      timing: {
        startTime: Date.now(),
        totalPauseDuration: 0,
        averageLineDelay: 0
      }
    });

    // Initialize audio service
    await this.audioService.initializeTTS(sessionId, userRole);

    // Pre-cache first few opponent lines
    await this.precacheOpponentLines(sessionId, lines.slice(0, 5));

    // Initialize speech analysis
    this.speechAnalyses.set(sessionId, new Map());

    // Initialize recording
    await this.audioService.startRecording(sessionId);

    // Initialize UI configuration
    this.uiConfig.set(sessionId, {
      currentLine: {
        fontSize: '1.2em',
        opacity: 1,
        highlight: true,
        transition: 'all 0.3s ease-in-out'
      },
      previousLine: {
        fontSize: '1em',
        opacity: 0.7,
        highlight: false,
        transition: 'all 0.3s ease-in-out'
      },
      nextLine: {
        fontSize: '1em',
        opacity: 0.5,
        highlight: false,
        transition: 'all 0.3s ease-in-out'
      },
      hiddenLine: {
        fontSize: '1em',
        opacity: 0,
        highlight: false,
        transition: 'all 0.3s ease-in-out'
      },
      scrollBehavior: {
        duration: 300,
        easing: 'ease-in-out'
      },
      ...uiConfig
    });

    // Apply initial styles
    this.updateLineStyles(sessionId);
  }

  private async parseScriptLines(
    script: any,
    userRole: string
  ): Promise<TeleprompterLine[]> {
    const lines: TeleprompterLine[] = [];
    let lineIndex = 0;

    for (const scene of script.scenes) {
      for (const dialogue of scene.dialogue) {
        lines.push({
          id: `${scene.id}_${lineIndex++}`,
          text: dialogue.text,
          role: dialogue.role,
          emotion: dialogue.emotion,
          isUserLine: dialogue.role === userRole,
          status: 'hidden',
          timing: {
            start: 0,
            duration: this.estimateLineDuration(dialogue.text),
            delay: 0
          }
        });
      }
    }

    return lines;
  }

  private estimateLineDuration(text: string): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(' ').length;
    return (words / 150) * 60 * 1000; // Duration in milliseconds
  }

  private async precacheOpponentLines(
    sessionId: string,
    lines: TeleprompterLine[]
  ): Promise<void> {
    const opponentLines = lines.filter(line => !line.isUserLine);

    for (const line of opponentLines) {
      if (!this.cachedAudio.has(line.id)) {
        const audio = await this.audioService.generateSpeech(
          sessionId,
          this.formatLineWithEmotion(line)
        );
        this.cachedAudio.set(line.id, audio);
      }
    }
  }

  private formatLineWithEmotion(line: TeleprompterLine): string {
    return line.emotion ? `[${line.emotion}] ${line.text}` : line.text;
  }

  async advanceToNextLine(sessionId: string): Promise<void> {
    const state = this.teleprompterStates.get(sessionId);
    const controls = this.controls.get(sessionId);
    if (!state || !controls) throw new Error('Session not found');

    // Update current line status
    state.visibleLines = state.visibleLines.map(line => ({
      ...line,
      status: line.status === 'current' ? 'previous' : line.status
    }));

    // Move to next line
    state.currentLineIndex++;

    // Update visible lines window
    const allLines = await this.getAllLines(sessionId);
    const start = Math.max(0, state.currentLineIndex - state.contextWindow.previous);
    const end = Math.min(
      allLines.length,
      state.currentLineIndex + state.contextWindow.next + 1
    );

    state.visibleLines = allLines.slice(start, end).map((line, index) => ({
      ...line,
      status: index === state.contextWindow.previous ? 'current' :
              index < state.contextWindow.previous ? 'previous' : 'next'
    }));

    // Pre-cache upcoming opponent lines
    await this.precacheOpponentLines(
      sessionId,
      allLines.slice(state.currentLineIndex, state.currentLineIndex + 5)
    );

    // Update stats
    const stats = this.stats.get(sessionId);
    if (stats) {
      stats.completedLines++;
    }

    // Update styles after line advancement
    this.updateLineStyles(sessionId);
  }

  async playCurrentLine(sessionId: string): Promise<void> {
    const state = this.teleprompterStates.get(sessionId);
    if (!state) throw new Error('Session not found');

    const currentLine = state.visibleLines.find(line => line.status === 'current');
    if (!currentLine || currentLine.isUserLine) return;

    const audio = this.cachedAudio.get(currentLine.id);
    if (audio) {
      // Play cached audio
      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = await audioContext.decodeAudioData(audio.slice(0));
      source.connect(audioContext.destination);
      source.start();
    } else {
      // Generate and play new audio
      const audio = await this.audioService.generateSpeech(
        sessionId,
        this.formatLineWithEmotion(currentLine)
      );
      this.cachedAudio.set(currentLine.id, audio);

      const audioContext = new AudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = await audioContext.decodeAudioData(audio.slice(0));
      source.connect(audioContext.destination);
      source.start();
    }
  }

  async togglePause(sessionId: string): Promise<boolean> {
    const controls = this.controls.get(sessionId);
    if (!controls) throw new Error('Session not found');

    controls.isPaused = !controls.isPaused;
    return controls.isPaused;
  }

  async toggleRepeatMode(sessionId: string): Promise<boolean> {
    const controls = this.controls.get(sessionId);
    if (!controls) throw new Error('Session not found');

    controls.repeatMode = !controls.repeatMode;
    return controls.repeatMode;
  }

  async updateControls(
    sessionId: string,
    updates: Partial<LineByLineControls>
  ): Promise<LineByLineControls> {
    const controls = this.controls.get(sessionId);
    if (!controls) throw new Error('Session not found');

    const updatedControls = { ...controls, ...updates };
    this.controls.set(sessionId, updatedControls);
    return updatedControls;
  }

  getState(sessionId: string): {
    teleprompter: TeleprompterState;
    controls: LineByLineControls;
    stats: PracticeStats;
  } | undefined {
    const teleprompter = this.teleprompterStates.get(sessionId);
    const controls = this.controls.get(sessionId);
    const stats = this.stats.get(sessionId);

    if (!teleprompter || !controls || !stats) return undefined;

    return {
      teleprompter,
      controls,
      stats
    };
  }

  private async getAllLines(sessionId: string): Promise<TeleprompterLine[]> {
    // TODO: Implement proper line storage and retrieval
    const state = this.teleprompterStates.get(sessionId);
    return state?.visibleLines || [];
  }

  async processUserSpeech(
    sessionId: string,
    audioChunk: Float32Array
  ): Promise<void> {
    const state = this.teleprompterStates.get(sessionId);
    const controls = this.controls.get(sessionId);
    if (!state || !controls || controls.isPaused) return;

    // Process audio chunk with VAD
    const hasVoice = await this.audioService.processAudioChunk(sessionId, audioChunk);
    if (!hasVoice) return;

    // Get current line
    const currentLine = state.visibleLines.find(line => line.status === 'current');
    if (!currentLine || !currentLine.isUserLine) return;

    // Analyze timing
    const now = Date.now();
    const lineStart = currentLine.timing?.start || now;
    const expectedDuration = currentLine.timing?.duration || 0;
    const actualDuration = now - lineStart;

    // Update line timing
    currentLine.timing = {
      ...currentLine.timing!,
      delay: Math.max(0, actualDuration - expectedDuration)
    };

    // If line is complete (based on VAD silence), analyze it
    if (actualDuration > expectedDuration * 1.5) {
      await this.analyzeSpeech(sessionId, currentLine.id);
    }
  }

  private async analyzeSpeech(
    sessionId: string,
    lineId: string
  ): Promise<void> {
    // Get recording results
    const recording = await this.audioService.stopRecording(sessionId);
    const currentLine = this.getCurrentLine(sessionId);
    if (!currentLine) return;

    // Analyze speech with Whisper
    const transcription = await this.audioService.transcribe(recording.audioData);

    // Analyze pronunciation
    const pronunciation = await this.audioService.comparePhonemes(
      transcription.text,
      currentLine.text
    );

    // Analyze emotion
    const emotion = await this.audioService.detectEmotion(recording.audioData);

    // Calculate performance metrics
    const performance = this.calculatePerformance(
      transcription,
      recording.timing,
      currentLine
    );

    // Create complete analysis
    const analysis: SpeechAnalysis = {
      text: transcription.text,
      confidence: transcription.confidence,
      timing: {
        start: recording.timing.start,
        end: recording.timing.end!,
        duration: recording.timing.end! - recording.timing.start
      },
      emotion,
      pronunciation,
      performance
    };

    // Store analysis
    const sessionAnalyses = this.speechAnalyses.get(sessionId);
    if (sessionAnalyses) {
      sessionAnalyses.set(lineId, analysis);
    }

    // Update stats with detailed metrics
    await this.updateDetailedStats(sessionId, lineId, analysis);

    // Provide real-time feedback if needed
    if (analysis.pronunciation.score < 0.7 || !analysis.performance.matchesEmotion) {
      await this.provideFeedback(sessionId, analysis);
    }

    // Start new recording for next line
    await this.audioService.startRecording(sessionId);
  }

  private async updateDetailedStats(
    sessionId: string,
    lineId: string,
    analysis: SpeechAnalysis
  ): Promise<void> {
    const stats = this.detailedStats.get(sessionId);
    if (!stats) return;

    // Update pronunciation scores
    stats.pronunciationScores.push(analysis.pronunciation.score);

    // Update emotion matches
    if (analysis.performance.matchesEmotion) {
      stats.emotionMatches++;
    }

    // Update total attempts
    stats.totalAttempts++;

    // Update base stats
    const repeatedLine = stats.repeatedLines.find(line => line.lineId === lineId);
    if (repeatedLine) {
      repeatedLine.repeatCount++;
      repeatedLine.averageDelay =
        (repeatedLine.averageDelay * (repeatedLine.repeatCount - 1) + analysis.timing.duration) /
        repeatedLine.repeatCount;
    } else {
      stats.repeatedLines.push({
        lineId,
        repeatCount: 1,
        averageDelay: analysis.timing.duration
      });
    }

    // If confidence is high enough and not in repeat mode, advance to next line
    const controls = this.controls.get(sessionId);
    if (controls && !controls.repeatMode && analysis.confidence > 0.8) {
      await this.advanceToNextLine(sessionId);
    }
  }

  private generatePronunciationFeedback(
    phonemes: Array<{ expected: string; actual: string; score: number }>
  ): string[] {
    const feedback: string[] = [];

    // Group similar pronunciation issues
    const issues = phonemes
      .filter(p => p.score < 0.7)
      .reduce((groups: Record<string, number>, p: { expected: string; actual: string }) => {
        const key = `${p.expected}>${p.actual}`;
        groups[key] = (groups[key] || 0) + 1;
        return groups;
      }, {});

    // Generate feedback for each issue type
    Object.entries(issues).forEach(([key, count]) => {
      const [expected, actual] = key.split('>');
      feedback.push(
        `The sound "${expected}" was pronounced as "${actual}" ${count} time${count > 1 ? 's' : ''}`
      );
    });

    return feedback;
  }

  private async provideFeedback(
    sessionId: string,
    analysis: SpeechAnalysis
  ): Promise<void> {
    // Collect all feedback
    const feedback: string[] = [];

    // Pronunciation feedback
    if (analysis.pronunciation.score < 0.7) {
      feedback.push(...analysis.pronunciation.feedback);
    }

    // Emotion feedback
    if (!analysis.performance.matchesEmotion) {
      feedback.push(
        `Try to express more ${analysis.emotion?.type} in your delivery`
      );
    }

    // Pace feedback
    if (analysis.performance.pace < 120 || analysis.performance.pace > 160) {
      feedback.push(
        `Your pace of ${Math.round(analysis.performance.pace)} words per minute is ${
          analysis.performance.pace < 120 ? 'too slow' : 'too fast'
        }. Aim for 120-160 words per minute.`
      );
    }

    // TODO: Send feedback to UI
  }

  private getCurrentLine(sessionId: string): TeleprompterLine | undefined {
    const state = this.teleprompterStates.get(sessionId);
    return state?.visibleLines.find(line => line.status === 'current');
  }

  private updateLineStyles(sessionId: string): void {
    const state = this.teleprompterStates.get(sessionId);
    const config = this.uiConfig.get(sessionId);
    if (!state || !config) return;

    state.visibleLines = state.visibleLines.map(line => ({
      ...line,
      style: config[`${line.status}Line`],
      scrollOffset: this.calculateScrollOffset(line, state)
    }));
  }

  private calculateScrollOffset(
    line: TeleprompterLine,
    state: TeleprompterState
  ): number {
    const lineHeight = 50; // Base line height in pixels
    const currentIndex = state.visibleLines.findIndex(l => l.status === 'current');
    const lineIndex = state.visibleLines.indexOf(line);
    return (lineIndex - currentIndex) * lineHeight;
  }

  async updateUIConfig(
    sessionId: string,
    updates: Partial<UIConfig>
  ): Promise<UIConfig> {
    const config = this.uiConfig.get(sessionId);
    if (!config) throw new Error('Session not found');

    const updatedConfig = { ...config, ...updates };
    this.uiConfig.set(sessionId, updatedConfig);
    this.updateLineStyles(sessionId);
    return updatedConfig;
  }

  getUIConfig(sessionId: string): UIConfig | undefined {
    return this.uiConfig.get(sessionId);
  }

  private calculatePerformance(
    transcription: WhisperTranscription,
    timing: { start: number; end?: number },
    expectedLine: TeleprompterLine
  ): SpeechAnalysis['performance'] {
    const wordCount = transcription.text.split(' ').length;
    const durationMinutes = (timing.end! - timing.start) / 1000 / 60;

    return {
      pace: wordCount / durationMinutes,
      fluency: this.calculateFluencyScore(transcription),
      expressiveness: this.calculateExpressivenessScore(transcription),
      matchesEmotion: this.doesEmotionMatch(
        transcription.emotion,
        expectedLine.emotion
      )
    };
  }

  private calculateFluencyScore(transcription: WhisperTranscription): number {
    // Implement fluency scoring based on pauses, hesitations, etc.
    return 0.8; // Placeholder
  }

  private calculateExpressivenessScore(transcription: WhisperTranscription): number {
    // Implement expressiveness scoring based on pitch variation, emphasis, etc.
    return 0.8; // Placeholder
  }

  private doesEmotionMatch(
    detected?: string,
    expected?: string
  ): boolean {
    if (!detected || !expected) return true;
    return detected.toLowerCase() === expected.toLowerCase();
  }
}

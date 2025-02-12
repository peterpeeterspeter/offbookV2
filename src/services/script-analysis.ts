// Type imports
import type {
  AudioConfig,
  RecordingSession,
  RecordingResult,
  TTSConfig,
  TTSParams
} from '@/types/audio';
import type {
  AnalysisBatch,
  AnalysisResult,
  BatchResult,
  ScriptAnalysisErrorDetails,
  EmotionSceneAnalysis,
  EmotionSceneMetrics,
  AnalysisParams,
  DeepSeekR1Response,
  DeepSeekR1Analysis
} from '@/types/analysis';
import type { UploadProgress } from '@/types/progress';
import type { Role, Scene, Script, LineHighlight, LineProgress } from '@/types/script';
import type { PracticeMetrics } from '@/types/metrics';
import type { AudioServiceType } from '@/components/SceneFlow';

// Value imports
import { ScriptAnalysisEvent, ScriptAnalysisErrorCategory } from '@/types/analysis';
import { SimpleCache, cache } from './cache';
import { BatchProcessor } from './batch-processor-new';
import { ScriptAnalysisError, ValidationError, ProcessingError, ScriptAnalysisErrorCode } from '@/types/errors';
import { AudioService } from '@/services/audio-service';
import { LRUCache } from 'lru-cache';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { ServiceMetrics } from '@/types/metrics';

// Initialize PDF.js worker
const workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Type declarations for external libraries
interface PDFDocumentProxyExt {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxyExt>;
}

interface PDFPageProxyExt {
  getTextContent(): Promise<PDFTextContentExt>;
}

interface PDFTextContentExt {
  items: Array<{
    str: string;
    transform: number[];
  }>;
}

interface MammothDocument {
  value: string;
  messages: Array<{
    type: string;
    message: string;
  }>;
}

// Cache configuration
const CACHE_CONFIG = {
  analysisCache: new LRUCache<string, any>({
    max: 500,
    ttl: 1000 * 60 * 60,
    updateAgeOnGet: true,
    allowStale: true,
  }),
  batchSize: 10,
  retryAttempts: 3,
  retryDelay: 1000,
};

interface BatchJob<T> {
  id: string;
  data: T;
  priority: number;
  timestamp: number;
  retryCount: number;
}

interface BatchProcessorOptions {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
}

export interface ScriptMetadata {
  title: string;
  description?: string;
  roles: Role[];
  scenes: Scene[];
  cues: Array<{
    type: 'dialogue' | 'emotion' | 'direction';
    text: string;
    lineNumber: number;
    role?: string;
  }>;
}

export interface PracticeSession {
  id: string;
  scriptId: string;
  mode: 'cue' | 'scene-flow' | 'line-by-line';
  startTime: Date;
  endTime?: Date;
  metrics: PracticeMetrics;
}

interface PipelineMetrics {
  averageLatency: number;
  throughput: number;
  errorRate: number;
  queueUtilization: number;
  batchEfficiency: number;
}

type AnalysisOperation = {
  type: 'emotion' | 'scene' | 'character';
  text: string;
};

type RecordingOperation = {
  type: 'START_RECORDING' | 'STOP_RECORDING' | 'INITIALIZE_TTS';
  sessionId: string;
};

type OperationType = AnalysisOperation | RecordingOperation;

// Constants for error handling
const ERROR_TYPES = {
  ANALYSIS: 'ANALYSIS' as const,
  ERROR: 'ERROR' as const
} as const;

export class ScriptAnalysisService {
  private readonly ALLOWED_FILE_TYPES = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private readonly retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };
  private readonly cacheConfig = {
    ttl: 3600000 // 1 hour
  };
  private readonly lineHighlights = new Map<string, Required<LineHighlight>[]>();
  private readonly lineProgress = new Map<string, Map<string, Required<LineProgress>>>();
  private readonly cache: SimpleCache;
  private currentSession: RecordingSession | null = null;
  private isRecording = false;
  private currentSessionId: string | null = null;
  private onProgress?: (progress: UploadProgress) => void;
  private audioService: AudioServiceType;
  private batchProcessor: BatchProcessor;

  constructor(audioService: AudioServiceType, onProgress?: (progress: UploadProgress) => void) {
    this.audioService = audioService;
    this.onProgress = onProgress;
    this.cache = cache; // Use the singleton instance
    this.batchProcessor = new BatchProcessor({
      batchSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
      slowThreshold: 5000,
      slowOperations: ['emotion', 'scene']
    });
  }

  private updateProgress(progress: UploadProgress): void {
    this.onProgress?.(progress);
  }

  async setup(): Promise<void> {
    try {
      await this.audioService.setup();
    } catch (error) {
      throw new ProcessingError('Failed to setup audio service', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  async startRecording(sessionId: string): Promise<void> {
    try {
      this.currentSessionId = sessionId;
      await this.audioService.startRecording(sessionId);
    } catch (error) {
      throw new ProcessingError('Failed to start recording', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  async stopRecording(): Promise<void> {
    if (this.currentSessionId) {
      await this.audioService.stopRecording(this.currentSessionId);
    }
  }

  async initializeTTS(sessionId: string, userRole: string): Promise<void> {
    try {
      await this.audioService.initializeTTS(sessionId, userRole);
    } catch (error) {
      throw new ProcessingError('Failed to initialize TTS', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  async processAudioChunk(sessionId: string, chunk: Float32Array): Promise<boolean> {
    try {
      return await this.audioService.processAudioChunk(sessionId, chunk);
    } catch (error) {
      throw new ProcessingError('Failed to process audio chunk', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  async generateSpeech(params: TTSParams): Promise<Float32Array> {
    try {
      return await this.audioService.generateSpeech(params);
    } catch (error) {
      throw new ProcessingError('Failed to generate speech', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  private async processBatch(batch: AnalysisBatch): Promise<BatchResult> {
    const results = await Promise.all(
      batch.items.map(async (item) => {
        try {
          const analysisResult = await this.analyzeText(item.params.text, 'emotion');
          if (!analysisResult) {
            throw new Error('Analysis failed to produce a result');
          }
          return {
            id: item.id,
            result: analysisResult
          };
        } catch (error) {
          console.error('Failed to process item:', error);
          return {
            id: item.id,
            result: this.createError(error instanceof Error ? error : new Error(String(error)))
          };
        }
      })
    );

    return {
      batchId: batch.id,
      results,
      completedAt: Date.now(),
      duration: Date.now() - batch.createdAt
    };
  }

  private async processOperation(operation: OperationType): Promise<void> {
    if (this.isAnalysisOperation(operation)) {
      await this.analyzeText(operation.text, operation.type);
    } else {
      await this.handleRecordingOperation(operation);
    }
  }

  private isAnalysisOperation(operation: OperationType): operation is AnalysisOperation {
    return ['emotion', 'scene', 'character'].includes(operation.type);
  }

  private async handleRecordingOperation(operation: RecordingOperation): Promise<void> {
    switch (operation.type) {
      case 'START_RECORDING':
        await this.startRecording(operation.sessionId);
        break;
      case 'STOP_RECORDING':
        await this.stopRecording();
        break;
      case 'INITIALIZE_TTS':
        await this.initializeTTS(operation.sessionId, 'user');
        break;
    }
  }

  private async analyzeText(text: string, type: 'emotion' | 'scene' | 'character'): Promise<AnalysisResult> {
    // Implementation of text analysis
    const result: AnalysisResult = {
      id: crypto.randomUUID(),
      text,
      recording: {
        id: crypto.randomUUID(),
        startTime: Date.now(),
        audioData: new Float32Array(0),
        duration: 0
      },
      emotions: [],
      timing: {
        expectedDuration: 0,
        actualDuration: 0,
        accuracy: 0,
        segments: []
      },
      accuracy: {
        emotion: 0,
        intensity: 0,
        timing: 0,
        overall: 0
      }
    };

    const cacheKey = this.getCacheKey(text, type);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult as AnalysisResult;
    }

    this.cache.set(cacheKey, result);
    return result;
  }

  private async initializeLineByLine(sessionId: string, lineIds: string[]): Promise<void> {
    const highlights = await Promise.all(
      lineIds.map(async (id, index) => {
        const line = await this.getLineDetails(id);
        if (!line) {
          throw new ProcessingError('Line details not found', {
            code: ScriptAnalysisErrorCode.RESOURCE_NOT_FOUND
          });
        }

        const highlight: Required<LineHighlight> = {
          lineId: id,
          type: index === 0 ? 'current' as const : 'upcoming' as const,
          note: line.note ?? '',
          emotion: line.emotion ?? 'neutral',
          intensity: line.intensity ?? 0
        };
        return highlight;
      })
    );

    this.lineHighlights.set(sessionId, highlights);
    this.lineProgress.set(sessionId, new Map());
  }

  private async initializeAudioService(): Promise<void> {
    try {
      const defaultParams: TTSParams = {
        text: '',
        voice: 'default',
        settings: {
          speed: 1.0,
          pitch: 1.0,
          volume: 1.0
        }
      };
      await this.audioService.generateSpeech(defaultParams);
    } catch (error) {
      throw new ProcessingError('Failed to initialize audio service', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  private async analyzeEmotions(text: string): Promise<EmotionSceneAnalysis[]> {
    const analysis = await this.analyzeEmotion(text);
    return [analysis];
  }

  async analyzeEmotion(text: string): Promise<EmotionSceneAnalysis> {
    return this.withCache(
      this.getCacheKey(text, 'emotion'),
      async () => {
        const prompt = `Analyze the emotional content of this script...`;

        try {
          const response = await fetch('https://api.deepseek.com/v1/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({ prompt, text })
          });

          if (!response.ok) {
            throw new ProcessingError('Failed to analyze emotions', {
              status: response.status,
              statusText: response.statusText,
              code: ScriptAnalysisErrorCode.API_REQUEST_FAILED
            });
          }

          const result = await response.json() as DeepSeekR1Response;
          return this.parseEmotionAnalysis(result);
        } catch (error) {
          if (error instanceof ProcessingError) throw error;
          throw new ProcessingError('Failed to analyze emotions', {
            originalError: error instanceof Error ? error : new Error(String(error)),
            code: ScriptAnalysisErrorCode.ANALYSIS_FAILED
          });
        }
      }
    );
  }

  private convertToAnalysis(response: DeepSeekR1Response): DeepSeekR1Analysis {
    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'object') {
      throw new ProcessingError('Invalid emotion analysis response', {
        code: ScriptAnalysisErrorCode.ANALYSIS_FAILED
      });
    }

    return {
      primary_emotion: content.primary_emotion,
      intensity: content.intensity,
      confidence: content.confidence,
      secondary_emotions: content.secondary_emotions,
      explanation: content.explanation
    };
  }

  protected parseEmotionAnalysis(response: DeepSeekR1Response): EmotionSceneAnalysis {
    const analysis = response.choices[0].message.content;
    return {
      emotion: analysis.primary_emotion || '',
      intensity: analysis.intensity || 0,
      confidence: analysis.confidence || 0,
      start: 0,
      end: 0,
      text: ''
    };
  }

  private calculateSceneMetrics(analysis: DeepSeekR1Analysis): EmotionSceneMetrics {
    return {
      totalScenes: 1,
      averageIntensity: analysis.intensity,
      dominantEmotions: [
        analysis.primary_emotion,
        ...analysis.secondary_emotions.map(e => e.emotion)
      ],
      confidenceStats: {
        min: analysis.confidence,
        max: analysis.confidence,
        average: analysis.confidence
      },
      pacing: {
        averageLineLength: 0,
        dialogueCount: 0,
        actionCount: 0,
        emotionalShifts: analysis.secondary_emotions.length
      }
    };
  }

  private async readFile(file: File): Promise<string> {
    if (file.type === 'application/pdf') {
      return this.readPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this.readDOCX(file);
    } else {
      return this.readTextFile(file);
    }
  }

  private async readPDF(file: File): Promise<string> {
    try {
      // Load the PDF file
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';

      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ');

        fullText += pageText + '\n\n';
      }

      // Clean up the text
      return this.cleanScriptText(fullText);
    } catch (error) {
      console.error('Error reading PDF:', error);
      throw new Error('Failed to read PDF file');
    }
  }

  private async readDOCX(file: File): Promise<string> {
    try {
      // Read the DOCX file
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      // Clean up the text
      return this.cleanScriptText(result.value);
    } catch (error) {
      console.error('Error reading DOCX:', error);
      throw new Error('Failed to read DOCX file');
    }
  }

  private cleanScriptText(text: string): string {
    return text
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Fix line breaks
      .replace(/([.!?])\s+/g, '$1\n')
      // Remove empty lines
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
      // Clean up character names in parentheses
      .replace(/\(([^)]+)\):/g, '$1:')
      // Add line breaks after character names
      .replace(/([A-Z][A-Za-z\s]+):/g, '\n$1:\n')
      // Remove any remaining multiple line breaks
      .replace(/\n{3,}/g, '\n\n');
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private async extractRolesAndScenes(text: string): Promise<{ roles: Role[]; scenes: Scene[] }> {
    const prompt = `Analyze this script and extract:
1. All character roles (speaking parts)
2. Scene boundaries and titles
3. Basic character relationships

Format as JSON:
{
  "roles": [{ "name": string, "type": "main" | "supporting" | "extra" }],
  "scenes": [{
    "title": string,
    "startLine": number,
    "endLine": number,
    "characters": string[]
  }]
}`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-r1',
        messages: [{ role: 'user', content: prompt + '\n\n' + text }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error('Failed to extract roles and scenes');
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);

    return {
      roles: parsed.roles.map((r: any) => ({
        id: crypto.randomUUID(),
        name: r.name,
        type: r.type
      })),
      scenes: parsed.scenes.map((s: any) => ({
        id: crypto.randomUUID(),
        title: s.title,
        startLine: s.startLine,
        endLine: s.endLine,
        characters: s.characters
      }))
    };
  }

  private async extractCues(text: string): Promise<ScriptMetadata['cues']> {
    const prompt = `Extract all cues from this script including:
1. Dialogue cues (character lines)
2. Emotional cues (e.g., [angry], [sad])
3. Directional cues (e.g., [door slams], [exits])

Format as JSON array:
[{
  "type": "dialogue" | "emotion" | "direction",
  "text": string,
  "lineNumber": number,
  "role": string (for dialogue only)
}]`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-r1',
        messages: [{ role: 'user', content: prompt + '\n\n' + text }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error('Failed to extract cues');
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }

  async uploadScript(
    file: File,
    metadata: { title: string; description?: string }
  ): Promise<ScriptMetadata> {
    try {
      this.updateProgress({ status: 'uploading', progress: 0 });

      // Validate file
      if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new ValidationError('Unsupported file format', {
          allowedTypes: this.ALLOWED_FILE_TYPES,
          receivedType: file.type,
          code: ScriptAnalysisErrorCode.INVALID_FILE_FORMAT
        });
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new ValidationError('File size exceeds limit', {
          maxSize: this.MAX_FILE_SIZE,
          receivedSize: file.size,
          code: ScriptAnalysisErrorCode.FILE_SIZE_EXCEEDED
        });
      }

      const text = await this.readFile(file);
      this.updateProgress({ status: 'uploading', progress: 50 });

      // Process the script in batches
      this.updateProgress({
        status: 'processing',
        progress: 60,
        message: 'Analyzing script...',
      });

      const [rolesAndScenes, cues] = await Promise.all([
        this.withCache(
          this.getCacheKey(text, 'roles_scenes'),
          () => this.extractRolesAndScenes(text)
        ),
        this.withCache(
          this.getCacheKey(text, 'cues'),
          () => this.extractCues(text)
        )
      ]);

      this.updateProgress({ status: 'complete', progress: 100 });

      const scriptMetadata: ScriptMetadata = {
        title: metadata.title,
        description: metadata.description,
        roles: rolesAndScenes.roles,
        scenes: rolesAndScenes.scenes,
        cues
      };

      return scriptMetadata;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.updateProgress({
        status: 'error',
        progress: 0,
        message: errorMessage,
      });

      if (error instanceof ScriptAnalysisError) {
        throw error;
      }
      throw new ProcessingError('Failed to process script', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  private getCacheKey(text: string, type: string): string {
    const hash = Array.from(text)
      .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
      .toString(36);
    return `analysis:${type}:${hash}`;
  }

  private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined = undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.retryConfig.maxRetries) {
          throw new ProcessingError(`Failed ${context} after ${attempt} attempts`, {
            originalError: lastError,
            code: ScriptAnalysisErrorCode.RETRY_EXHAUSTED
          });
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private async withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached) {
      return cached as T;
    }
    const result = await fn();
    this.cache.set(key, result);
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(resolve, ms);
      // Ensure the timeout is cleared if the promise is cancelled
      return () => clearTimeout(timeoutId);
    });
  }

  private updatePracticeMetrics(metrics: PracticeMetrics): void {
    this.cache.set('metrics', metrics);
  }

  async uploadAndAnalyze(
    file: File,
    metadata: ScriptMetadata,
    userId: string
  ): Promise<Script> {
    // Validate file
    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Unsupported file format');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 20MB limit');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    formData.append('userId', userId);

    // Upload file and initiate analysis
    const response = await fetch('/api/scripts/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload script');
    }

    return response.json();
  }

  async getScriptDetails(scriptId: string): Promise<Script> {
    const response = await fetch(`/api/scripts/${scriptId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch script details');
    }
    return response.json();
  }

  async getAnalysisStatus(scriptId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
  }> {
    const response = await fetch(`/api/scripts/${scriptId}/analysis-status`);
    if (!response.ok) {
      throw new Error('Failed to fetch analysis status');
    }
    return response.json();
  }

  async updateRole(
    scriptId: string,
    roleId: string,
    updates: Partial<Role>
  ): Promise<Role> {
    const response = await fetch(`/api/scripts/roles/${roleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update role');
    }

    return response.json();
  }

  async addNote(
    scriptId: string,
    note: {
      lineNumber: number;
      text: string;
      type: 'cue' | 'emotion' | 'direction';
    }
  ): Promise<void> {
    const response = await fetch(`/api/scripts/${scriptId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });

    if (!response.ok) {
      throw new Error('Failed to add note');
    }
  }

  async assignVoice(
    scriptId: string,
    roleId: string,
    voiceId: string,
    voiceSettings?: TTSConfig['settings']
  ): Promise<void> {
    const response = await fetch(`/api/scripts/roles/${roleId}/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice: voiceId,
        settings: voiceSettings ?? {
          speed: 1.0,
          pitch: 1.0,
          volume: 1.0
        }
      }),
    });

    if (!response.ok) {
      throw new ProcessingError('Failed to assign voice', {
        code: ScriptAnalysisErrorCode.API_REQUEST_FAILED,
        status: response.status
      });
    }
  }

  private initializePracticeMetrics(): PracticeMetrics {
    return {
      emotionMatch: 0,
      intensityMatch: 0,
      timingAccuracy: 0,
      overallScore: 0,
      timing: {
        averageDelay: 0,
        maxDelay: 0,
        minDelay: 0,
        responseDelays: []
      },
      accuracy: {
        correctLines: 0,
        totalLines: 0,
        accuracy: 0
      },
      emotions: {
        matchedEmotions: 0,
        totalEmotionalCues: 0,
        emotionAccuracy: 0
      }
    };
  }

  async startCuePractice(scriptId: string): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      scriptId,
      mode: 'cue',
      startTime: new Date(),
      metrics: this.initializePracticeMetrics()
    };
    await this.initializeRecording();
    return session;
  }

  async startSceneFlow(
    scriptId: string,
    sceneId: string,
    userRole: string
  ): Promise<PracticeSession> {
    await this.audioService.initializeTTS(sceneId, userRole);
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      scriptId,
      mode: 'scene-flow',
      startTime: new Date(),
      metrics: {
        emotionMatch: 0,
        intensityMatch: 0,
        timingAccuracy: 0,
        overallScore: 0,
        timing: {
          averageDelay: 0,
          maxDelay: 0,
          minDelay: Infinity,
          responseDelays: []
        },
        accuracy: {
          correctLines: 0,
          totalLines: 0,
          accuracy: 0
        },
        emotions: {
          matchedEmotions: 0,
          totalEmotionalCues: 0,
          emotionAccuracy: 0
        }
      }
    };
    return session;
  }

  async startLineByLine(scriptId: string, lineIds: string[]): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      scriptId,
      mode: 'line-by-line',
      startTime: new Date(),
      metrics: this.initializePracticeMetrics()
    };
    await this.initializeLineByLine(session.id, lineIds);
    return session;
  }

  private async initializeRecording(): Promise<void> {
    try {
      if (!this.currentSessionId) {
        throw new Error('No active session ID');
      }
      await this.audioService.startRecording(this.currentSessionId);
    } catch (error) {
      throw new ProcessingError('Failed to initialize recording', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  private async getLineDetails(lineId: string): Promise<{
    text: string;
    note?: string;
    emotion?: string;
    intensity?: number;
  }> {
    const response = await fetch(`/api/lines/${lineId}`);
    if (!response.ok) throw new Error(`Failed to fetch line ${lineId}`);
    return response.json();
  }

  async cleanup(): Promise<void> {
    try {
      if (this.currentSessionId) {
        await this.stopRecording();
      }

      this.currentSession = null;
      this.isRecording = false;
      this.currentSessionId = null;
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  async queueAnalysis(text: string, type: 'emotion' | 'scene' | 'character'): Promise<void> {
    const params: AnalysisParams = {
      text,
      audioData: new Float32Array(0),
      settings: {
        emotionThreshold: 0.5,
        intensityThreshold: 0.5,
        timingThreshold: 0.5
      }
    };

    const batch: Omit<AnalysisBatch, 'id' | 'createdAt'> = {
      items: [{
        id: crypto.randomUUID(),
        params
      }],
      priority: 1
    };

    this.batchProcessor.add(batch);
    await this.batchProcessor.startProcessing();
  }

  private createError(error: Error): ScriptAnalysisErrorDetails {
    return {
      code: ScriptAnalysisEvent.ERROR,
      category: ScriptAnalysisErrorCategory.ANALYSIS,
      message: error.message,
      name: error.name,
      retryable: true
    };
  }
}

const SCRIPT_ANALYSIS_CONFIG = {
  model: 'deepseek-r1',
  prompt: (text: string) => `Analyze the following script scene, focusing on emotional content, character interactions, and scene dynamics:

${text}

Provide a detailed analysis including:
1. Primary emotion and its intensity (1-10)
2. Secondary emotions present
3. Key emotional shifts or turning points
4. Overall scene mood and atmosphere
5. Character dynamics and relationships
6. Pacing and tension levels

Format your response as a JSON object with the following structure:
{
  "primary_emotion": string,
  "intensity": number,
  "confidence": number,
  "secondary_emotions": [
    {
      "emotion": string,
      "intensity": number
    }
  ],
  "explanation": string
}`,
  temperature: 0.7,
  max_tokens: 1000
};

function calculateSceneMetrics(text: string, analysis: DeepSeekR1Analysis): EmotionSceneMetrics {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const dialogueLines = lines.filter(line => line.trim().startsWith('"')).length;
  const actionLines = lines.length - dialogueLines;
  const averageLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;

    return {
    totalScenes: 1,
    averageIntensity: analysis.intensity,
    dominantEmotions: [
      analysis.primary_emotion,
      ...analysis.secondary_emotions.map(e => e.emotion)
    ],
    confidenceStats: {
      min: analysis.confidence,
      max: analysis.confidence,
      average: analysis.confidence
    },
    pacing: {
      averageLineLength,
      dialogueCount: dialogueLines,
      actionCount: actionLines,
      emotionalShifts: analysis.secondary_emotions.length
    }
  };
}

function countEmotionalShifts(analysis: DeepSeekR1Analysis): number {
  return analysis.secondary_emotions.length;
}

function calculateAverageLineLength(text: string): number {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
}

function countDialogueLines(text: string): number {
  return text.split('\n').filter(line => line.trim().startsWith('"')).length;
}

function countActionLines(text: string): number {
  return text.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('"');
  }).length;
}

function calculatePaceScore(text: string, analysis: DeepSeekR1Analysis): number {
  const baseScore = analysis.intensity;
  const dialogueDensity = countDialogueLines(text) / text.split('\n').length;
  const emotionalComplexity = analysis.secondary_emotions.length / 5;

  return Math.min(10, (baseScore + dialogueDensity * 5 + emotionalComplexity * 3) / 3);
}

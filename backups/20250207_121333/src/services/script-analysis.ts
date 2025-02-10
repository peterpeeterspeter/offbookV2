import type {
  AudioService,
  AudioConfig,
  RecordingSession,
  RecordingResult,
  TTSConfig
} from '@/types/audio';
import type {
  DeepSeekR1Response,
  DeepSeekR1Analysis,
  EmotionSceneAnalysis,
  EmotionSceneMetrics
} from '@/types/analysis';
import type {
  UploadProgress,
  BatchProgress
} from '@/types/progress';
import type {
  Role,
  Scene,
  Script,
  LineHighlight,
  LineProgress,
  LineHighlightType
} from '@/types/script';
import type { Dict } from '@/types/common';
import type { PracticeMetrics } from '@/types/metrics';

import {
  ScriptAnalysisError,
  ValidationError,
  ProcessingError,
  APIError,
  ScriptAnalysisErrorCode
} from '@/types/errors';

import { BatchProcessor as BatchProcessorImpl } from './batch-processor';
import { CACHE_CONFIG as CONFIG } from '@/config/cache';

import { metrics, responseCache } from './metrics';
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

// Batch processor
interface BatchJob<T> {
  id: string;
  data: T;
  priority: number;
  timestamp: number;
  retryCount: number;
}

class BatchProcessor<T> {
  private queue: BatchJob<T>[] = [];
  private processing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private processFn: (items: T[]) => Promise<void>,
    private options = {
      batchSize: CACHE_CONFIG.batchSize,
      maxRetries: CACHE_CONFIG.retryAttempts,
      retryDelay: CACHE_CONFIG.retryDelay,
    }
  ) {}

  async add(data: T, priority = 0): Promise<void> {
    const job: BatchJob<T> = {
      id: Math.random().toString(36).substring(7),
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.processing) {
      this.startProcessing();
    }
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) return;

    this.processing = true;
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.options.batchSize);
      try {
        await this.processFn(batch.map(job => job.data));
      } catch (error) {
        // Handle failed jobs
        for (const job of batch) {
          if (job.retryCount < this.options.maxRetries) {
            job.retryCount++;
            this.queue.push(job);
            await new Promise(resolve =>
              setTimeout(resolve, this.options.retryDelay * job.retryCount)
            );
          }
        }
      }
    }
    this.processing = false;
  }

  clear(): void {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
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

export class ScriptAnalysisService {
  private readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private readonly lineHighlights = new Map<string, Required<LineHighlight>[]>();
  private readonly lineProgress = new Map<string, Map<string, Required<LineProgress>>>();
  private readonly cache = new Map<string, DeepSeekR1Analysis>();
  private currentSession: RecordingSession | null = null;
  private isRecording = false;
  private batchProcessor: BatchProcessorImpl<{
    text: string;
    type: 'scene' | 'character' | 'emotion';
  }>;

  private readonly retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000
  };

  private readonly cacheConfig = {
    maxSize: 100,
    ttl: 1000 * 60 * 60, // 1 hour
    updateAgeOnGet: true
  };

  constructor(
    private readonly audioService: AudioService,
    private readonly onProgress?: (progress: UploadProgress) => void
  ) {
    this.batchProcessor = new BatchProcessorImpl(
      async (items) => {
        await Promise.all(
          items.map(async (item) => {
            try {
              switch (item.type) {
                case 'scene':
                  return await this.extractRolesAndScenes(item.text);
                case 'character':
                  return await this.extractCues(item.text);
                case 'emotion':
                  return await this.analyzeEmotions(item.text);
                default:
                  throw new ProcessingError('Unknown analysis type', {
                    type: item.type
                  });
              }
            } catch (error) {
              console.error(`Analysis error for type ${item.type}:`, error);
              throw error;
            }
          })
        );
      },
      {
        batchSize: CONFIG.batchSize,
        maxRetries: CONFIG.retryAttempts,
        retryDelay: CONFIG.retryDelay,
      }
    );
  }

  private updateProgress(progress: UploadProgress): void {
    this.onProgress?.(progress);
  }

  async initializeTTS(config: TTSConfig): Promise<void> {
    try {
      if (!config.voiceId) {
        throw new ProcessingError('Voice ID is required', {
          code: ScriptAnalysisErrorCode.MISSING_REQUIRED_FIELD,
          field: 'voiceId'
        });
      }

      await this.audioService.initializeTTS({
        voiceId: config.voiceId,
        settings: config.settings ?? {
          stability: 0.5,
          similarity_boost: 0.5
        }
      });
    } catch (error) {
      throw new ProcessingError('Failed to initialize TTS', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
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
      const defaultConfig: TTSConfig = {
        voiceId: 'default',
        settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: false
        }
      };
      await this.audioService.initializeTTS(defaultConfig);
    } catch (error) {
      throw new ProcessingError('Failed to initialize audio service', {
        originalError: error instanceof Error ? error : new Error(String(error)),
        code: ScriptAnalysisErrorCode.INITIALIZATION_FAILED
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
      },
      { ttl: this.cacheConfig.ttl }
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
    const analysis = this.convertToAnalysis(response);

    return {
      primaryEmotion: analysis.primary_emotion,
      intensity: analysis.intensity,
      confidence: analysis.confidence,
      secondaryEmotions: analysis.secondary_emotions,
      description: analysis.explanation,
      metrics: this.calculateSceneMetrics(analysis)
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
        ),
      ]);

      // Queue emotion analysis for batch processing
      await this.batchProcessor.add(
        { text, type: 'emotion' },
        1 // High priority
      );

      this.updateProgress({ status: 'complete', progress: 100 });

      return {
        ...metadata,
        roles: rolesAndScenes.roles,
        scenes: rolesAndScenes.scenes,
        cues,
      };
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
        originalError: error,
      });
    }
  }

  private getCacheKey(text: string, type: string): string {
    return `${type}_${this.hashText(text)}`;
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.retryConfig.maxRetries) {
          throw new ProcessingError(`Failed ${context} after ${attempt} attempts`, {
            originalError: lastError,
            code: ScriptAnalysisErrorCode.RETRY_EXHAUSTED,
            context
          });
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // TypeScript requires this but it's unreachable
    throw lastError;
  }

  private async withCache<T>(
    key: string,
    operation: () => Promise<T>,
    options?: {
      bypassCache?: boolean;
      ttl?: number;
    }
  ): Promise<T> {
    const { bypassCache = false, ttl = this.cacheConfig.ttl } = options ?? {};

    // Check cache unless explicitly bypassed
    if (!bypassCache) {
      const cached = CACHE_CONFIG.analysisCache.get<T>(key);
      if (cached) {
        metrics.cache.hits++;
        return cached;
      }
    }

    metrics.cache.misses++;
    const startTime = Date.now();

    try {
      // Execute operation with retry logic
      const result = await this.withRetry(operation, `cache operation for ${key}`);
      const duration = Date.now() - startTime;

      // Update performance metrics
      this.updateMetrics(duration);

      // Cache the result with TTL
      CACHE_CONFIG.analysisCache.set(key, result, { ttl });

      return result;
    } catch (error) {
      metrics.pipeline.errors++;
      throw error;
    }
  }

  private updateMetrics(duration: number): void {
    const { pipeline } = metrics;
    pipeline.avgResponseTime =
      (pipeline.avgResponseTime * pipeline.totalRequests + duration) /
      (pipeline.totalRequests + 1);
    pipeline.totalRequests++;

    // Track performance thresholds
    if (duration > pipeline.slowThreshold) {
      pipeline.slowOperations++;
    }
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
        voiceId,
        settings: voiceSettings ?? {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: false
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

  async startCuePractice(scriptId: string): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      scriptId,
      mode: 'cue',
      startTime: new Date(),
      metrics: {
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

    // Initialize Whisper and VAD for recording
    await this.initializeRecording();
    return session;
  }

  async startSceneFlow(
    scriptId: string,
    sceneId: string,
    userRole: string
  ): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      scriptId,
      mode: 'scene-flow',
      startTime: new Date(),
      metrics: {
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

    // Initialize TTS with standardized config
    const ttsConfig: TTSConfig = {
      voiceId: sceneId,
      settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0,
        use_speaker_boost: false
      }
    };
    await this.initializeTTS(ttsConfig);

    return session;
  }

  async startLineByLine(
    scriptId: string,
    lineIds: string[]
  ): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      scriptId,
      mode: 'line-by-line',
      startTime: new Date(),
      metrics: {
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

    // Initialize TTS and line tracking
    await this.initializeLineByLine(session.id, lineIds);
    return session;
  }

  private async initializeRecording(): Promise<void> {
    try {
      await this.audioService.startRecording();
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
      await Promise.all([
        this.batchProcessor.clear(),
        this.audioService.cleanup()
      ]);

      // Clear caches
      CACHE_CONFIG.analysisCache.clear();
      this.cache.clear();

      // Reset metrics
      Object.assign(metrics.pipeline, {
        totalRequests: 0,
        errors: 0,
        avgResponseTime: 0,
        slowOperations: 0
      });
    } catch (error) {
      throw new ProcessingError('Failed to cleanup resources', {
        originalError: error instanceof Error ? error : new Error(String(error)),
        code: ScriptAnalysisErrorCode.CLEANUP_FAILED
      });
    }
  }

  private async processOperation(operation: Dict<string, any>): Promise<void> {
    if (!operation.type) {
      throw new ValidationError('Operation type not specified', {
        code: ScriptAnalysisErrorCode.MISSING_REQUIRED_FIELD,
        field: 'type'
      });
    }

    const operationType = operation.type as string;
    switch (operationType) {
      case 'START_RECORDING':
        await this.initializeRecording();
        break;
      case 'STOP_RECORDING':
        await this.stopRecording();
        break;
      case 'INITIALIZE_TTS':
        if (!operation.voiceId) {
          throw new ValidationError('Voice ID not specified', {
            code: ScriptAnalysisErrorCode.MISSING_REQUIRED_FIELD,
            field: 'voiceId'
          });
        }
        await this.initializeTTS({
          voiceId: operation.voiceId,
          settings: operation.settings
        });
        break;
      default:
        throw new ValidationError(`Unknown operation type: ${operationType}`);
    }
  }

  async stopRecording(): Promise<RecordingSession> {
    try {
      const result = await this.audioService.stopRecording();
      if (!this.currentSession) {
        throw new ProcessingError('No active recording session');
      }

      const updatedSession: RecordingSession = {
        ...this.currentSession,
        duration: result.duration,
        accuracy: result.accuracy,
        timing: result.timing,
        transcription: result.transcription,
        isActive: false
      };

      this.currentSession = updatedSession;
      return updatedSession;
    } catch (error) {
      throw new ProcessingError('Failed to stop recording', {
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  private getHighlights(currentLineId: string): Required<LineHighlight>[] {
    const highlights: Required<LineHighlight>[] = [];
    const defaultHighlight: Required<LineHighlight> = {
      lineId: currentLineId,
      type: 'current',
      note: '',
      emotion: '',
      intensity: 0
    };

    highlights.push(defaultHighlight);
    return highlights;
  }

  static async analyzeScript(text: string): Promise<EmotionSceneAnalysis> {
    const mockAudioService: AudioService = {
      startRecording: async () => {},
      stopRecording: async () => ({
        duration: 0,
        accuracy: 0,
        timing: {
          start: 0,
          end: 0,
          segments: []
        },
        transcription: ''
      }),
      getCurrentSession: async () => null,
      initializeTTS: async (config: TTSConfig) => {
        if (!config.voiceId) {
          throw new ProcessingError('Voice ID is required', {
            code: ScriptAnalysisErrorCode.MISSING_REQUIRED_FIELD
          });
        }
      },
      cleanup: async () => {}
    };

    const service = new ScriptAnalysisService(mockAudioService);
    return service.analyzeEmotion(text);
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

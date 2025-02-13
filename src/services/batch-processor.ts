import type { Service, ServiceState, ServiceError, BatchProcessor as IBatchProcessor } from '@/types/core';
import type { AnalysisBatch, BatchResult, ScriptAnalysisErrorDetails, AnalysisResult } from '@/types/analysis';
import { ScriptAnalysisErrorCategory, ScriptAnalysisEvent } from '@/types/analysis';

export interface BatchProcessorOptions {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  slowThreshold: number;
  slowOperations: string[];
}

export interface BatchProcessorContext {
  options: BatchProcessorOptions;
  timestamp: number;
  isProcessing: boolean;
  currentBatch?: AnalysisBatch;
  queue: AnalysisBatch[];
  completedBatches: BatchResult[];
}

export interface BatchProcessorState extends ServiceState<BatchProcessorContext> {
  state: 'uninitialized' | 'initializing' | 'ready' | 'error';
  error?: ServiceError;
  context: BatchProcessorContext;
}

export class BatchProcessor implements Service, IBatchProcessor<AnalysisBatch['items'][0], AnalysisResult> {
  private state: BatchProcessorState;
  private timer: number | null = null;

  constructor(options?: Partial<BatchProcessorOptions>) {
    const defaultOptions: BatchProcessorOptions = {
      batchSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
      slowThreshold: 5000,
      slowOperations: ['emotion_analysis', 'timing_analysis']
    };

    this.state = {
      state: 'uninitialized',
      context: {
        options: { ...defaultOptions, ...options },
        timestamp: Date.now(),
        isProcessing: false,
        queue: [],
        completedBatches: []
      }
    };
  }

  public async setup(): Promise<void> {
    this.state.state = 'initializing';
    this.state.context.timestamp = Date.now();
    return Promise.resolve();
  }

  public getState(): BatchProcessorState {
    return { ...this.state };
  }

  public async initialize(): Promise<void> {
    this.state.state = 'ready';
    this.state.context.timestamp = Date.now();
    return Promise.resolve();
  }

  public async cleanup(): Promise<void> {
    await this.clear();
  }

  public async clear(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.context.queue = [];
    this.state.context.currentBatch = undefined;
    this.state.context.isProcessing = false;
    this.state.state = 'uninitialized';
    this.state.context.timestamp = Date.now();
  }

  public async add(item: AnalysisBatch['items'][0], priority: number = 0): Promise<void> {
    const batch: AnalysisBatch = {
      id: crypto.randomUUID(),
      items: [item],
      priority,
      createdAt: Date.now()
    };

    this.state.context.queue.push(batch);
    this.state.context.queue.sort((a, b) => b.priority - a.priority);

    if (!this.state.context.isProcessing && this.state.state === 'ready') {
      void this.process([item]);
    }
  }

  public async process(items: AnalysisBatch['items'][0][]): Promise<AnalysisResult[]> {
    if (this.state.context.isProcessing || this.state.state !== 'ready') {
      throw new Error('Processor is busy or not ready');
    }

    this.state.context.isProcessing = true;
    this.state.context.timestamp = Date.now();

    try {
      const results: AnalysisResult[] = [];
      for (const item of items) {
        try {
          const result = await this.processItem(item);
          results.push(result);
        } catch (error) {
          this.handleError(error as Error);
          throw error;
        }
      }
      return results;
    } finally {
      this.state.context.isProcessing = false;
      this.updateStateAfterProcessing();
    }
  }

  private updateStateAfterProcessing(): void {
    if (this.state.state === 'error') {
      this.state.context.timestamp = Date.now();
    } else {
      this.state.state = 'ready';
      this.state.context.timestamp = Date.now();
    }
  }

  private async processBatch(batch: AnalysisBatch): Promise<BatchResult> {
    const startTime = Date.now();
    const results: BatchResult['results'] = [];

    for (const item of batch.items) {
      let retries = 0;
      let success = false;

      while (!success && retries < this.state.context.options.maxRetries) {
        try {
          const result = await this.processItem(item);
          results.push({
            id: item.id,
            result
          });
          success = true;
        } catch (error) {
          retries++;
          if (retries === this.state.context.options.maxRetries) {
            results.push({
              id: item.id,
              result: this.createError(error as Error)
            });
          } else {
            await this.delay(this.state.context.options.retryDelay * retries);
          }
        }
      }
    }

    return {
      batchId: batch.id,
      results,
      completedAt: Date.now(),
      duration: Date.now() - startTime
    };
  }

  protected async processItem(item: AnalysisBatch['items'][0]): Promise<AnalysisResult> {
    return {
      id: item.id,
      text: item.params.text,
      recording: {
        audioData: item.params.audioData,
        duration: 0,
        hasVoice: false,
        metrics: {
          averageAmplitude: 0,
          peakAmplitude: 0,
          silenceRatio: 1,
          processingTime: 0
        }
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
  }

  private createError(error: Error): ScriptAnalysisErrorDetails {
    return {
      code: ScriptAnalysisEvent.ERROR,
      message: error.message,
      category: ScriptAnalysisErrorCategory.ANALYSIS,
      details: {
        message: error.message,
        stack: error.stack
      }
    };
  }

  private handleError(error: Error): void {
    this.state.error = {
      code: ScriptAnalysisEvent.ERROR,
      message: error.message,
      details: {
        message: error.message,
        stack: error.stack
      }
    };
    this.state.state = 'error';
    this.state.context.timestamp = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      if (this.timer !== null) {
        window.clearTimeout(this.timer);
      }
      this.timer = window.setTimeout(() => {
        resolve();
        this.timer = null;
      }, ms) as unknown as number;
    });
  }
}

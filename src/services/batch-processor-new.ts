import type { Service, ServiceState } from '@/types/core';
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
  timestamp: number;
  isProcessing: boolean;
  currentBatch?: AnalysisBatch;
  queue: AnalysisBatch[];
  completedBatches: BatchResult[];
  error?: ScriptAnalysisErrorDetails;
  options: BatchProcessorOptions;
}

export interface BatchProcessorState extends ServiceState<BatchProcessorContext> {
  state: 'uninitialized' | 'initializing' | 'ready' | 'error';
  context: BatchProcessorContext;
}

export class BatchProcessor implements Service {
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
        timestamp: Date.now(),
        isProcessing: false,
        queue: [],
        completedBatches: [],
        options: { ...defaultOptions, ...options }
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
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.context.queue = [];
    this.state.context.currentBatch = undefined;
    this.state.context.isProcessing = false;
    this.state.state = 'uninitialized';
    this.state.context.timestamp = Date.now();
  }

  public add(batch: Omit<AnalysisBatch, 'id' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const newBatch: AnalysisBatch = {
      ...batch,
      id,
      createdAt: Date.now()
    };

    this.state.context.queue.push(newBatch);
    this.state.context.queue.sort((a, b) => b.priority - a.priority);

    if (!this.state.context.isProcessing && this.state.state === 'ready') {
      void this.startProcessing();
    }

    return id;
  }

  public async startProcessing(): Promise<void> {
    if (this.state.context.isProcessing || this.state.context.queue.length === 0 || this.state.state !== 'ready') {
      return;
    }

    this.state.context.isProcessing = true;
    this.state.context.timestamp = Date.now();

    try {
      while (this.state.context.queue.length > 0) {
        const batch = this.state.context.queue[0];
        if (batch) {
          this.state.context.currentBatch = batch;
          const result = await this.processBatch(batch);
          this.state.context.completedBatches.push(result);
          this.state.context.queue.shift();
        }
      }
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.state.context.isProcessing = false;
      this.state.context.currentBatch = undefined;
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
    const results: Array<{
      id: string;
      result: AnalysisResult | ScriptAnalysisErrorDetails;
    }> = [];

    for (const item of batch.items) {
      let retries = 0;
      let success = false;

      while (!success && retries < this.state.context.options.maxRetries) {
        try {
          const result = await this.processItem();
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

  protected async processItem(): Promise<AnalysisResult> {
    // This is a placeholder - actual implementation would process the item
    // based on the analysis parameters
    throw new Error('processItem must be implemented by the service using BatchProcessor');
  }

  private createError(error: Error): ScriptAnalysisErrorDetails {
    return {
      code: ScriptAnalysisEvent.ERROR,
      message: error.message,
      category: ScriptAnalysisErrorCategory.ANALYSIS,
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
  }

  private handleError(error: Error): void {
    this.state.context.error = this.createError(error);
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

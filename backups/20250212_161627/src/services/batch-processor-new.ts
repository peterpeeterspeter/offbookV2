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

export interface BatchProcessorState extends ServiceState<BatchProcessorOptions> {
  status: 'uninitialized' | 'initializing' | 'ready' | 'error';
  timestamp: number;
  isProcessing: boolean;
  currentBatch?: AnalysisBatch;
  queue: AnalysisBatch[];
  completedBatches: BatchResult[];
  error?: ScriptAnalysisErrorDetails;
  options: BatchProcessorOptions;
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
      status: 'uninitialized',
      timestamp: Date.now(),
      isProcessing: false,
      queue: [],
      completedBatches: [],
      options: { ...defaultOptions, ...options },
      error: undefined
    };
  }

  public async setup(): Promise<void> {
    this.state.status = 'initializing';
    this.state.timestamp = Date.now();
    return Promise.resolve();
  }

  public getState(): BatchProcessorState {
    return { ...this.state };
  }

  public async initialize(): Promise<void> {
    this.state.status = 'ready';
    this.state.timestamp = Date.now();
    return Promise.resolve();
  }

  public async cleanup(): Promise<void> {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.queue = [];
    this.state.currentBatch = undefined;
    this.state.isProcessing = false;
    this.state.status = 'uninitialized';
    this.state.timestamp = Date.now();
  }

  public add(batch: Omit<AnalysisBatch, 'id' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const newBatch: AnalysisBatch = {
      ...batch,
      id,
      createdAt: Date.now()
    };

    this.state.queue.push(newBatch);
    this.state.queue.sort((a, b) => b.priority - a.priority);

    if (!this.state.isProcessing && this.state.status === 'ready') {
      void this.startProcessing();
    }

    return id;
  }

  public async startProcessing(): Promise<void> {
    if (this.state.isProcessing || this.state.queue.length === 0 || this.state.status !== 'ready') {
      return;
    }

    this.state.isProcessing = true;
    this.state.timestamp = Date.now();

    try {
      while (this.state.queue.length > 0) {
        const batch = this.state.queue[0];
        this.state.currentBatch = batch;

        const result = await this.processBatch(batch);
        this.state.completedBatches.push(result);
        this.state.queue.shift();
      }
    } catch (error) {
      this.handleError(error as Error);
    } finally {
      this.state.isProcessing = false;
      this.state.currentBatch = undefined;
      this.updateStateAfterProcessing();
    }
  }

  private updateStateAfterProcessing(): void {
    if (this.state.status === 'error') {
      this.state.timestamp = Date.now();
    } else {
      this.state.status = 'ready';
      this.state.timestamp = Date.now();
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

      while (!success && retries < this.state.options.maxRetries) {
        try {
          const result = await this.processItem(item);
          results.push({
            id: item.id,
            result
          });
          success = true;
        } catch (error) {
          retries++;
          if (retries === this.state.options.maxRetries) {
            results.push({
              id: item.id,
              result: this.createError(error as Error)
            });
          } else {
            await this.delay(this.state.options.retryDelay * retries);
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
    // This is a placeholder - actual implementation would process the item
    // based on the analysis parameters
    throw new Error('processItem must be implemented by the service using BatchProcessor');
  }

  private createError(error: Error): ScriptAnalysisErrorDetails {
    return {
      code: ScriptAnalysisEvent.ERROR,
      message: error.message,
      category: ScriptAnalysisErrorCategory.ANALYSIS,
      name: error.name,
      retryable: false,
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
  }

  private handleError(error: Error): void {
    this.state.error = this.createError(error);
    this.state.status = 'error';
    this.state.timestamp = Date.now();
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

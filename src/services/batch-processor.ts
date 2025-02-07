import { ProcessingError } from '@/types/errors';

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

export class BatchProcessor<T> {
  private queue: BatchJob<T>[] = [];
  private processing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private processFn: (items: T[]) => Promise<void>,
    private options: BatchProcessorOptions
  ) {}

  async add(data: T, priority = 0): Promise<void> {
    const job: BatchJob<T> = {
      id: Math.random().toString(36).substring(7),
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);

    if (!this.processing) {
      await this.startProcessing();
    }
  }

  private async startProcessing(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.options.batchSize);
        try {
          await this.processFn(batch.map(job => job.data));
        } catch (error) {
          const failedJobs = batch.map(job => ({
            ...job,
            retryCount: job.retryCount + 1
          }));

          const retriableJobs = failedJobs.filter(
            job => job.retryCount < this.options.maxRetries
          );

          if (retriableJobs.length > 0) {
            const firstRetryCount = retriableJobs[0]?.retryCount ?? 1;
            await new Promise(resolve =>
              setTimeout(resolve, this.options.retryDelay * Math.pow(2, firstRetryCount))
            );
            this.queue.unshift(...retriableJobs);
          } else {
            throw new ProcessingError('Max retries exceeded for batch', {
              failedJobs: batch.map(job => job.id)
            });
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  clear(): void {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

import { SecurityMetadata, RetentionPolicy } from './types';

interface CleanupTask {
  id: string;
  resourceId: string;
  scheduledTime: number;
  policy: RetentionPolicy;
  metadata: SecurityMetadata;
}

/**
 * Service for managing secure data deletion and cleanup
 */
export class DataCleanupService {
  private tasks = new Map<string, CleanupTask>();
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly deleteData: (resourceId: string) => Promise<void>,
    private readonly archiveData: (resourceId: string) => Promise<void>
  ) {}

  /**
   * Starts the cleanup service
   */
  start(intervalMs = 60000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.cleanupInterval = setInterval(() => this.runCleanup(), intervalMs);
  }

  /**
   * Stops the cleanup service
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Schedules data for cleanup
   */
  scheduleCleanup(
    resourceId: string,
    metadata: SecurityMetadata,
    policy: RetentionPolicy
  ): void {
    const taskId = `cleanup_${resourceId}_${Date.now()}`;
    const scheduledTime = metadata.createdAt + policy.duration;

    const task: CleanupTask = {
      id: taskId,
      resourceId,
      scheduledTime,
      policy,
      metadata
    };

    this.tasks.set(taskId, task);
  }

  /**
   * Cancels a scheduled cleanup task
   */
  cancelCleanup(resourceId: string): void {
    for (const [taskId, task] of this.tasks) {
      if (task.resourceId === resourceId) {
        this.tasks.delete(taskId);
      }
    }
  }

  /**
   * Runs the cleanup process
   */
  private async runCleanup(): Promise<void> {
    const now = Date.now();
    const tasksToRun: CleanupTask[] = [];

    // Find tasks that need to be run
    for (const [taskId, task] of this.tasks) {
      if (task.scheduledTime <= now) {
        tasksToRun.push(task);
        this.tasks.delete(taskId);
      }
    }

    // Process tasks
    for (const task of tasksToRun) {
      try {
        if (task.policy.archive) {
          await this.archiveData(task.resourceId);
        } else {
          await this.secureDelete(task.resourceId);
        }
      } catch (error) {
        console.error(`Failed to cleanup ${task.resourceId}:`, error);
        // Reschedule failed task with exponential backoff
        this.rescheduleFailedTask(task);
      }
    }
  }

  /**
   * Performs secure deletion of data
   */
  private async secureDelete(resourceId: string): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        // First overwrite with random data
        await this.overwriteWithRandom(resourceId);

        // Verify overwrite was successful
        if (!await this.verifyOverwrite(resourceId)) {
          throw new Error('Failed to verify data overwrite');
        }

        // Then delete
        await this.deleteData(resourceId);

        // Verify deletion
        if (await this.resourceExists(resourceId)) {
          throw new Error('Failed to verify deletion');
        }

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        if (retryCount < maxRetries) {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
        }
      }
    }

    throw new Error(
      `Secure deletion failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Verifies that data was properly overwritten
   */
  private async verifyOverwrite(resourceId: string): Promise<boolean> {
    try {
      // In a real implementation, this would:
      // 1. Read the data
      // 2. Verify it's been overwritten with random data
      // 3. Return true if verification succeeds

      // For now, we'll simulate the verification
      await new Promise(resolve => setTimeout(resolve, 50));
      return true;
    } catch (error) {
      console.error('Overwrite verification failed:', error);
      return false;
    }
  }

  /**
   * Checks if a resource still exists
   */
  private async resourceExists(resourceId: string): Promise<boolean> {
    try {
      // In a real implementation, this would check if the resource
      // can still be accessed after deletion

      // For now, we'll simulate the check
      await new Promise(resolve => setTimeout(resolve, 50));
      return false;
    } catch (error) {
      console.error('Resource existence check failed:', error);
      return true; // Assume it exists if we can't verify
    }
  }

  /**
   * Overwrites data with random content before deletion
   */
  private async overwriteWithRandom(resourceId: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Get the size of the data
    // 2. Generate random data of the same size
    // 3. Overwrite the original data multiple times
    // 4. Ensure the writes are synced to disk

    // For now, we'll just simulate the process
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Reschedules a failed cleanup task
   */
  private rescheduleFailedTask(task: CleanupTask): void {
    const retryCount = this.getRetryCount(task);
    if (retryCount >= 3) return; // Give up after 3 retries

    const backoffMs = Math.pow(2, retryCount) * 60000; // Exponential backoff
    const newTask: CleanupTask = {
      ...task,
      id: `${task.id}_retry${retryCount + 1}`,
      scheduledTime: Date.now() + backoffMs
    };

    this.tasks.set(newTask.id, newTask);
  }

  /**
   * Gets the retry count for a task
   */
  private getRetryCount(task: CleanupTask): number {
    const matches = task.id.match(/_retry(\d+)$/);
    return matches ? parseInt(matches[1], 10) : 0;
  }

  /**
   * Gets all pending cleanup tasks
   */
  getPendingTasks(): CleanupTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Immediately runs cleanup for a specific resource
   */
  async forceCleanup(resourceId: string): Promise<void> {
    for (const task of this.tasks.values()) {
      if (task.resourceId === resourceId) {
        await this.secureDelete(resourceId);
        this.tasks.delete(task.id);
        break;
      }
    }
  }
}

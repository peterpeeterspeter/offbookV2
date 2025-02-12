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
          await this.deleteData(task.resourceId);
        }
      } catch (error) {
        // Reschedule failed tasks with exponential backoff
        this.rescheduleFailedTask(task);
      }
    }
  }

  /**
   * Reschedules a failed task with exponential backoff
   */
  private rescheduleFailedTask(task: CleanupTask): void {
    const retryCount = this.getRetryCount(task);
    if (retryCount >= 3) {
      // Log error and stop retrying after 3 attempts
      console.error(`Failed to cleanup resource ${task.resourceId} after ${retryCount} attempts`);
      return;
    }

    const backoffMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
    const newTaskId = `${task.id}_retry${retryCount + 1}`;
    const newTask: CleanupTask = {
      ...task,
      id: newTaskId,
      scheduledTime: Date.now() + backoffMs
    };

    this.tasks.set(newTaskId, newTask);
  }

  /**
   * Gets the retry count from a task ID
   */
  private getRetryCount(task: CleanupTask): number {
    const match = task.id.match(/_retry(\d+)$/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
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
        await this.deleteData(resourceId);
        this.tasks.delete(task.id);
        break;
      }
    }
  }
}
